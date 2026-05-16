import { create, UseBoundStore, StoreApi } from 'zustand';
import { SfuStoreState, SfuSessionState } from '../types/call-sfu.state';

// Circular import is safe: access is only inside action closures.
import useCallStore from './useCallStore';
import {
  ensureWebRtcGlobals,
  MEDIASOUP_HANDLER_NAME,
} from '../libs/webrtc-globals';

// Module-level guard prevents duplicate consumption race conditions.
const _consumingProducerIds = new Set<string>();

const EMPTY_SFU: SfuSessionState = {
  device: null,
  sendTransport: null,
  recvTransport: null,
  producers: new Map(),
  consumers: new Map(),
  pendingProduceCallbacks: new Map(),
  screenProducer: null,
  screenProducerIds: new Set<string>(),
};

const useSfuCallStore: UseBoundStore<StoreApi<SfuStoreState>> = create<SfuStoreState>()(
  (set, get) => ({
    sfu: { ...EMPTY_SFU },

    initSFU: async () => {
      try {
        if (get().sfu.device) return;

        ensureWebRtcGlobals();

        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { Device } = require('mediasoup-client');
        const device = new Device({ handlerName: MEDIASOUP_HANDLER_NAME });
        set((prev) => ({ sfu: { ...prev.sfu, device } }));
      } catch (error) {
        console.error('[SFU] Failed to initialize device:', error);
      }
    },

    produceLocalStream: async (localStream) => {
      const { sfu } = get();
      if (!sfu.sendTransport || sfu.sendTransport.closed) return;
      if (sfu.producers.size > 0 || sfu.pendingProduceCallbacks.size > 0) return;

      const newProducerEntries: [string, any][] = [];
      const audioTrack = localStream.getAudioTracks()[0];
      const videoTrack = localStream.getVideoTracks()[0];

      if (audioTrack) {
        const ap = await sfu.sendTransport.produce({ track: audioTrack });
        newProducerEntries.push([ap.id, ap]);
      }
      if (videoTrack) {
        const vp = await sfu.sendTransport.produce({ track: videoTrack });
        newProducerEntries.push([vp.id, vp]);
      }

      if (newProducerEntries.length > 0) {
        set((prev) => ({
          sfu: {
            ...prev.sfu,
            producers: new Map([...prev.sfu.producers, ...newProducerEntries]),
          },
        }));
      }
    },

    replaceTracksInProducers: async (newStream) => {
      const { sfu } = get();
      const audioTrack = newStream.getAudioTracks()[0];
      const videoTrack = newStream.getVideoTracks()[0];

      for (const producer of sfu.producers.values()) {
        if (producer.closed) continue;
        if (producer.kind === 'audio' && audioTrack) {
          await producer.replaceTrack({ track: audioTrack });
        }
        if (producer.kind === 'video' && videoTrack) {
          await producer.replaceTrack({ track: videoTrack });
        }
      }
    },

    teardownSfu: () => {
      const { sfu } = get();
      const { socket, roomId } = useCallStore.getState();

      if (roomId && socket) {
        socket.emit('signal', { type: 'leave', roomId, target: 'sfu' });
      }

      sfu.sendTransport?.close();
      sfu.recvTransport?.close();
      _consumingProducerIds.clear();
      set({ sfu: { ...EMPTY_SFU } });
    },

    handleSFUSignal: async (payload) => {
      const {
        type,
        ok,
        rtpCapabilities,
        target,
        transportId,
        iceParameters,
        iceCandidates,
        dtlsParameters,
        producerId,
        kind,
        rtpParameters,
        consumerId,
        message,
      } = payload;

      if (ok === false) {
        if (type === 'createTransport') {
          const { socket, roomId } = useCallStore.getState();
          console.warn(`[SFU] createTransport failed (${message}), re-joining SFU room...`);
          socket?.emit('signal', { type: 'join', roomId, target: 'sfu' });
        } else {
          console.error(`[SFU] Signal error (${type}):`, message);
        }
        return;
      }

      try {
        switch (type) {
          case 'join': {
            const { socket: currentSocket, roomId: currentRoomId } = useCallStore.getState();
            const { sfu } = get();
            if (!sfu.device) return;

            if (!sfu.device.loaded) {
              await sfu.device.load({ routerRtpCapabilities: rtpCapabilities });
            }

            currentSocket?.emit('signal', {
              type: 'createTransport',
              roomId: currentRoomId,
              target: 'sfu',
              direction: 'send',
            });
            break;
          }

          case 'createTransport': {
            const { socket, roomId } = useCallStore.getState();
            const { sfu } = get();
            if (!sfu.device || !roomId) return;

            const isSend = !sfu.sendTransport;
            const transport = isSend
              ? sfu.device.createSendTransport({
                  id: transportId,
                  iceParameters,
                  iceCandidates,
                  dtlsParameters,
                })
              : sfu.device.createRecvTransport({
                  id: transportId,
                  iceParameters,
                  iceCandidates,
                  dtlsParameters,
                });

            transport.on('connect', ({ dtlsParameters: dtls }: any, callback: any) => {
              socket?.emit('signal', {
                type: 'connectTransport',
                roomId,
                target: 'sfu',
                transportId: transport.id,
                dtlsParameters: dtls,
              });
              callback();
            });

            if (isSend) {
              transport.on(
                'produce',
                ({ kind: k, rtpParameters: rtp, appData }: any, callback: any) => {
                  const requestId =
                    Math.random().toString(36).slice(2) + Date.now().toString(36);

                  set((prev) => {
                    const newCallbacks = new Map(prev.sfu.pendingProduceCallbacks);
                    newCallbacks.set(requestId, callback);
                    return { sfu: { ...prev.sfu, pendingProduceCallbacks: newCallbacks } };
                  });

                  socket?.emit('signal', {
                    type: 'produce',
                    roomId,
                    target: 'sfu',
                    transportId: transport.id,
                    kind: k,
                    rtpParameters: rtp,
                    appData: { ...(appData as object), requestId },
                  });
                },
              );

              set((prev) => ({ sfu: { ...prev.sfu, sendTransport: transport } }));

              const { stream: coordinatorStream } = useCallStore.getState();
              if (coordinatorStream.localStream) {
                await get().produceLocalStream(coordinatorStream.localStream);
              }

              socket?.emit('signal', {
                type: 'createTransport',
                roomId,
                target: 'sfu',
                direction: 'recv',
              });
            } else {
              set((prev) => ({ sfu: { ...prev.sfu, recvTransport: transport } }));
              socket?.emit('signal', { type: 'getProducers', roomId, target: 'sfu' });
            }
            break;
          }

          case 'produce': {
            if (target === 'me') {
              const reqId = payload.appData?.requestId;
              if (reqId) {
                set((prev) => {
                  const cb = prev.sfu.pendingProduceCallbacks.get(reqId);
                  if (cb) cb({ id: producerId });
                  const newCbs = new Map(prev.sfu.pendingProduceCallbacks);
                  newCbs.delete(reqId);
                  return { sfu: { ...prev.sfu, pendingProduceCallbacks: newCbs } };
                });
              }
            } else if (target === 'broadcast') {
              const { socket: s, roomId: r } = useCallStore.getState();
              const { sfu: sfuNow } = get();
              if (!sfuNow.recvTransport || !sfuNow.device) break;

              const broadcastAppData = payload.appData as { source?: string } | undefined;
              if (broadcastAppData?.source === 'screen') {
                set((prev) => ({
                  sfu: {
                    ...prev.sfu,
                    screenProducerIds: new Set([...prev.sfu.screenProducerIds, producerId]),
                  },
                }));
                if (payload.userId) {
                  useCallStore.setState((prev) => ({
                    peersSharingScreen: new Set([...prev.peersSharingScreen, payload.userId]),
                  }));
                }
              }

              s?.emit('signal', {
                type: 'consume',
                roomId: r,
                target: 'sfu',
                transportId: sfuNow.recvTransport.id,
                producerId,
                rtpCapabilities: sfuNow.device.rtpCapabilities,
                userId: payload.userId,
              });
            }
            break;
          }

          case 'getProducers': {
            const { socket: s, roomId: r } = useCallStore.getState();
            const { sfu: sfuNow } = get();
            if (!sfuNow.recvTransport || !sfuNow.device) return;

            const producers: Array<{
              producerId: string;
              userId: string;
              kind: string;
              appData?: { source?: string };
            }> = payload.producers || [];

            const screenIds: string[] = [];
            const sharerUserIds: string[] = [];
            for (const p of producers) {
              if (p.appData?.source === 'screen') {
                screenIds.push(p.producerId);
                sharerUserIds.push(p.userId);
              }
            }
            if (screenIds.length > 0) {
              set((prev) => ({
                sfu: {
                  ...prev.sfu,
                  screenProducerIds: new Set([...prev.sfu.screenProducerIds, ...screenIds]),
                },
              }));
              useCallStore.setState((prev) => ({
                peersSharingScreen: new Set([...prev.peersSharingScreen, ...sharerUserIds]),
              }));
            }

            for (const { producerId: pid, userId: pUserId } of producers) {
              s?.emit('signal', {
                type: 'consume',
                roomId: r,
                target: 'sfu',
                transportId: sfuNow.recvTransport.id,
                producerId: pid,
                rtpCapabilities: sfuNow.device.rtpCapabilities,
                userId: pUserId,
              });
            }
            break;
          }

          case 'consume': {
            const { sfu: sfuSnapshot } = get();
            if (!sfuSnapshot.recvTransport) return;

            const alreadyConsuming =
              _consumingProducerIds.has(producerId) ||
              [...sfuSnapshot.consumers.values()].some(
                (c) => c.producerId === producerId,
              );
            if (alreadyConsuming) break;

            _consumingProducerIds.add(producerId);

            try {
              const consumer = await sfuSnapshot.recvTransport.consume({
                id: consumerId,
                producerId,
                kind,
                rtpParameters,
              });

              const trackUserId = payload.userId || producerId;
              try {
                (consumer as any).appData = {
                  ...((consumer as any).appData ?? {}),
                  userId: trackUserId,
                };
              } catch {
                /* appData immutable in some mediasoup-client builds */
              }

              const isScreen = get().sfu.screenProducerIds.has(producerId);

              useCallStore.setState((prevCoordinator) => {
                const key = `${prevCoordinator.roomId}-${trackUserId}`;

                if (isScreen) {
                  const existing = prevCoordinator.stream.remoteScreenStreams.get(key);
                  let MediaStreamClass: any;
                  try {
                    MediaStreamClass = require('react-native-webrtc').MediaStream;
                  } catch {
                    MediaStreamClass = null;
                  }
                  const target = existing ?? (MediaStreamClass ? new MediaStreamClass() : { getTracks: () => [], addTrack: () => {}, removeTrack: () => {} });
                  target.getTracks().forEach((t: any) => {
                    if (t.kind === consumer.track.kind && t !== consumer.track) {
                      target.removeTrack(t);
                    }
                  });
                  if (!target.getTracks().includes(consumer.track)) {
                    target.addTrack(consumer.track);
                  }
                  const newRemoteScreenStreams = new Map(prevCoordinator.stream.remoteScreenStreams);
                  newRemoteScreenStreams.set(key, target);
                  return { stream: { ...prevCoordinator.stream, remoteScreenStreams: newRemoteScreenStreams } };
                }

                const existing = prevCoordinator.stream.remoteStreams.get(key);
                let MediaStreamClass: any;
                try {
                  MediaStreamClass = require('react-native-webrtc').MediaStream;
                } catch {
                  MediaStreamClass = null;
                }
                const target = existing ?? (MediaStreamClass ? new MediaStreamClass() : { getTracks: () => [], addTrack: () => {}, removeTrack: () => {} });
                target.getTracks().forEach((t: any) => {
                  if (t.kind === consumer.track.kind && t !== consumer.track) {
                    target.removeTrack(t);
                  }
                });
                if (!target.getTracks().includes(consumer.track)) {
                  target.addTrack(consumer.track);
                }
                const newRemoteStreams = new Map(prevCoordinator.stream.remoteStreams);
                newRemoteStreams.set(key, target);
                return { stream: { ...prevCoordinator.stream, remoteStreams: newRemoteStreams } };
              });

              set((prev) => {
                const newConsumers = new Map(prev.sfu.consumers);
                newConsumers.set(consumer.id, consumer);
                return { sfu: { ...prev.sfu, consumers: newConsumers } };
              });
            } finally {
              _consumingProducerIds.delete(producerId);
            }
            break;
          }
        }
      } catch (error) {
        console.error(`[SFU] handleSFUSignal error in case "${type}":`, error);
        if (type === 'join') {
          const { socket: s, roomId: r } = useCallStore.getState();
          if (s && r) {
            await get().initSFU();
            s.emit('signal', { type: 'join', roomId: r, target: 'sfu' });
          }
        }
      }
    },
  }),
);

export default useSfuCallStore;
