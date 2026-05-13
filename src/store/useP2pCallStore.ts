import { create, UseBoundStore, StoreApi } from 'zustand';
import { P2pState } from '../types/call-p2p.state';
import { CallMember } from '../types/call.state';
import Helpers from '../libs/helpers';
import useAuthStore from './useAuth';

// Circular import is safe: access is only inside action closures.
import useCallStore from './useCallStore';

function _getRTCClasses() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const webrtc = require('react-native-webrtc');
    return {
      RTCPeerConnection: webrtc.RTCPeerConnection,
      RTCSessionDescription: webrtc.RTCSessionDescription,
      RTCIceCandidate: webrtc.RTCIceCandidate,
    };
  } catch {
    return null;
  }
}

const useP2pCallStore: UseBoundStore<StoreApi<P2pState>> = create<P2pState>()(
  (set, get) => ({
    peerConnections: new Map(),
    pendingCandidates: new Map(),
    screenTransceivers: new Map(),
    remoteScreenTransceivers: new Map(),
    cameraSenders: new Map(),

    handleCreatePeerConnection: async (roomId, actionUserId) => {
      const key = `${roomId}-${actionUserId}`;

      if (get().peerConnections.has(key)) {
        return get().peerConnections.get(key)!;
      }

      const rtc = _getRTCClasses();
      if (!rtc) {
        console.error('[P2P] react-native-webrtc not available');
        throw new Error('react-native-webrtc not available');
      }

      const { socket, configPeerConnection, stream } = useCallStore.getState();
      const pc = new rtc.RTCPeerConnection(configPeerConnection);

      pc.onicecandidate = (event: any) => {
        if (event.candidate) {
          socket?.emit('call:candidate', {
            candidate: event.candidate,
            roomId,
            actionUserId,
          });
        }
      };

      // Connection-state watchdog: treat failed/closed as peer-gone → end call.
      pc.onconnectionstatechange = () => {
        if (pc.connectionState !== 'failed' && pc.connectionState !== 'closed') return;
        const callStore = useCallStore.getState();
        if (callStore.status !== 'accepted') return;
        callStore.handleEndCall({
          roomId,
          actionUserId,
          members: callStore.members ?? [],
          callId: callStore.callId,
        });
      };

      // Add local tracks
      const localStream = stream.localStream;
      if (localStream) {
        localStream.getAudioTracks().forEach((track: any) => {
          pc.addTrack(track, localStream);
        });
        localStream.getVideoTracks().forEach((track: any) => {
          const sender = pc.addTrack(track, localStream);
          const next = new Map(get().cameraSenders);
          next.set(key, sender);
          set({ cameraSenders: next });
        });
      }

      // Remote track routing: camera/audio → remoteStreams; screen → remoteScreenStreams
      pc.ontrack = (event: any) => {
        useCallStore.setState((prev) => {
          const isScreenTrack =
            event.track.kind === 'video' &&
            prev.peersSharingScreen.has(actionUserId) &&
            (prev.stream.remoteStreams.get(key)?.getVideoTracks().length ?? 0) > 0;

          if (isScreenTrack) {
            if (event.transceiver) {
              const next = new Map(get().remoteScreenTransceivers);
              next.set(key, event.transceiver);
              set({ remoteScreenTransceivers: next });
            }
            const existing = prev.stream.remoteScreenStreams.get(key);
            const target = existing ?? new (require('react-native-webrtc').MediaStream)();
            if (!target.getTracks().includes(event.track)) {
              target.addTrack(event.track);
            }
            const newRemoteScreenStreams = new Map(prev.stream.remoteScreenStreams);
            newRemoteScreenStreams.set(key, target);
            return { stream: { ...prev.stream, remoteScreenStreams: newRemoteScreenStreams } };
          }

          const existing = prev.stream.remoteStreams.get(key);
          const target = existing ?? new (require('react-native-webrtc').MediaStream)();
          target.getTracks().forEach((t: any) => {
            if (t.kind === event.track.kind && t !== event.track) {
              target.removeTrack(t);
            }
          });
          if (!target.getTracks().includes(event.track)) {
            target.addTrack(event.track);
          }
          const newRemoteStreams = new Map(prev.stream.remoteStreams);
          newRemoteStreams.set(key, target);
          return { stream: { ...prev.stream, remoteStreams: newRemoteStreams } };
        });
      };

      const newPeerConnections = new Map(get().peerConnections);
      newPeerConnections.set(key, pc);
      set({ peerConnections: newPeerConnections });

      return pc;
    },

    handleAcceptCall: async (payload) => {
      const { roomId, offer, members, actionUserId, callId } = payload;
      const socket = useCallStore.getState().socket;
      const currentUser = useAuthStore.getState().user;

      if (!currentUser) return;

      const userInCall = members.find((m: CallMember) => m.id === currentUser.id);
      if (!userInCall) return;

      const key = `${roomId}-${actionUserId}`;
      const existingPc = get().peerConnections.get(key);
      const isRenegotiation =
        !!existingPc &&
        (payload.renegotiate === true || existingPc.signalingState === 'stable');

      if (existingPc && !isRenegotiation) {
        console.warn(`[P2P] PC for ${actionUserId} already exists, skipping duplicate`);
        return;
      }

      const rtc = _getRTCClasses();
      if (!rtc) return;

      const offerDescription = Helpers.decryptUserInfo(offer);
      const pc = existingPc ?? (await get().handleCreatePeerConnection(roomId, actionUserId));

      // Perfect-negotiation pattern (glare handling)
      const isGlare = isRenegotiation && pc.signalingState === 'have-local-offer';
      if (isGlare) {
        const isPolite = (currentUser.id || '') < actionUserId;
        if (!isPolite) {
          console.warn('[P2P] Glare detected, ignoring incoming renegotiation offer (impolite)');
          return;
        }
        try {
          await pc.setLocalDescription({ type: 'rollback' });
        } catch (err) {
          console.warn('[P2P] Glare rollback failed:', err);
        }
      }

      await pc.setRemoteDescription(new rtc.RTCSessionDescription(offerDescription));
      const answerCreated = await pc.createAnswer();
      await pc.setLocalDescription(answerCreated);

      socket?.emit('call:answer', {
        roomId,
        answer: Helpers.enCryptUserInfo(answerCreated),
        members: Helpers.enCryptUserInfo(members),
        targetUserId: actionUserId,
      });

      if (!isRenegotiation) {
        const startedAtFromBE = (payload as any).history?.started_at;
        const startedAtStr = startedAtFromBE
          ? new Date(startedAtFromBE).toISOString()
          : new Date().toISOString();
        const elapsedSeconds = Math.max(
          0,
          Math.floor((Date.now() - new Date(startedAtStr).getTime()) / 1000),
        );

        useCallStore.getState().updateCallState({
          status: 'accepted',
          action: {
            ...useCallStore.getState().action,
            startedAt: startedAtStr,
            duration: elapsedSeconds,
          },
        } as any);
        useCallStore.setState({ answer: Helpers.enCryptUserInfo(answerCreated) });
      }
    },

    flushPendingCandidates: async (roomId, actionUserId) => {
      const key = `${roomId}-${actionUserId}`;
      const pendingCandidates = get().pendingCandidates.get(key) || [];
      const pc = get().peerConnections.get(key);
      if (!pc || pendingCandidates.length === 0) return;

      for (const candidate of pendingCandidates) {
        if (pc.signalingState === 'closed') break;
        try {
          await pc.addIceCandidate(candidate);
        } catch (err) {
          console.error('[P2P] Error adding queued ICE candidate:', err);
        }
      }
      get().pendingCandidates.delete(key);
    },

    replaceTracksInPeers: async (newStream, type = 'both') => {
      const audioTrack = newStream.getAudioTracks()[0];
      const videoTrack = newStream.getVideoTracks()[0];
      const screenTransceivers = get().screenTransceivers;

      for (const [key, pc] of get().peerConnections.entries()) {
        const senders = pc.getSenders();
        const screenSender = screenTransceivers.get(key)?.sender;

        if ((type === 'audio' || type === 'both') && audioTrack) {
          const audioSender = senders.find((s: any) => s.track?.kind === 'audio');
          if (audioSender) await audioSender.replaceTrack(audioTrack);
        }

        if ((type === 'video' || type === 'both') && videoTrack) {
          const videoSender = senders.find(
            (s: any) => s.track?.kind === 'video' && s !== screenSender,
          );
          if (videoSender) await videoSender.replaceTrack(videoTrack);
        }
      }
    },

    replaceScreenTrackInPeers: async (track) => {
      const callStore = useCallStore.getState();
      const { socket, callId, roomId, members } = callStore;
      const peers = get().peerConnections;
      const newScreenTransceivers = new Map(get().screenTransceivers);

      for (const [key, pc] of peers) {
        if (pc.signalingState === 'closed') continue;

        const existing = get().screenTransceivers.get(key);
        try {
          if (track) {
            if (existing) {
              await existing.sender.replaceTrack(track);
            } else {
              const transceiver = pc.addTransceiver(track);
              newScreenTransceivers.set(key, transceiver);
            }
          } else if (existing) {
            await existing.sender.replaceTrack(null);
          }

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          const targetUserId = key.split('-')[1] || key;
          socket?.emit('call:accepted', {
            roomId,
            targetUserId,
            offer: Helpers.enCryptUserInfo(offer),
            callId,
            members,
            renegotiate: true,
          });
        } catch (err) {
          console.warn(`[P2P] replaceScreenTrack failed for ${key}:`, err);
        }
      }

      set({ screenTransceivers: newScreenTransceivers });
    },

    teardownP2p: () => {
      get().peerConnections.forEach((pc) => {
        if (pc.signalingState !== 'closed') pc.close();
      });
      set({
        peerConnections: new Map(),
        pendingCandidates: new Map(),
        screenTransceivers: new Map(),
        remoteScreenTransceivers: new Map(),
        cameraSenders: new Map(),
      });
    },
  }),
);

export default useP2pCallStore;
