import { create, UseBoundStore, StoreApi } from 'zustand';
import { CallMember, CallState } from '../types/call.state';
import type { SfuStoreState } from '../types/call-sfu.state';
import type { P2pState } from '../types/call-p2p.state';
import Helpers from '../libs/helpers';
import useAuthStore from './useAuth';

// Sub-stores — imported here for delegation.
// Circular dep is safe: both sides access each other only inside action
// closures, never at module initialization time.
import useP2pCallStore from './useP2pCallStore';
import useSfuCallStore from './useSfuCallStore';

// RN: Use a navigation ref instead of window.open().
// The navigation ref is set by AppNavigator via setCallNavigationRef().
let _callNavigation: any = null;
export function setCallNavigationRef(ref: any) {
  _callNavigation = ref;
}

export function getCallNavigationRef() {
  return _callNavigation;
}

// Mutex for camera upgrade — prevents concurrent getUserMedia calls.
let _upgradeVideoInFlight: Promise<void> | null = null;

// Single duration ticker anchored to the server-canonical startedAt.
let _durationTicker: ReturnType<typeof setInterval> | null = null;
function _startDurationTicker(
  set: (s: any) => void,
  getStartedAt: () => string | null,
) {
  if (_durationTicker) clearInterval(_durationTicker);
  const tick = () => {
    const startedAt = getStartedAt();
    if (!startedAt) return;
    const seconds = Math.max(
      0,
      Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000),
    );
    set((prev: any) => ({ action: { ...prev.action, duration: seconds } }));
  };
  tick();
  _durationTicker = setInterval(tick, 1000);
}
function _stopDurationTicker() {
  if (_durationTicker) {
    clearInterval(_durationTicker);
    _durationTicker = null;
  }
}

import { ensureWebRtcGlobals } from '../libs/webrtc-globals';
import { navigateToCallScreen } from '../libs/safe-navigation';
import Permission from '../libs/permission';

// RN: mediaDevices from react-native-webrtc
function _getMediaDevices() {
  try {
    ensureWebRtcGlobals();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { mediaDevices } = require('react-native-webrtc');
    return mediaDevices;
  } catch {
    return null;
  }
}

const useCallStore: UseBoundStore<StoreApi<CallState>> = create<CallState>()(
  (set, get) => ({
    roomId: null,
    status: 'idle',
    mode: 'audio',
    callMode: 'p2p',
    members: [] as CallMember[],
    error: null,
    configPeerConnection: {
      iceServers: [
        { urls: ['stun:stun.l.google.com:19302'] },
        { urls: ['stun:stun1.l.google.com:19302'] },
        { urls: ['stun:stun2.l.google.com:19302'] },
        { urls: 'stun:stun.relay.metered.ca:80' },
        {
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject',
        },
        {
          urls: 'turn:jp.relay.metered.ca:80',
          username: 'dd552a2f5dca99f4e390e0cc',
          credential: '/K8NuOaoQsL91LMT',
        },
        {
          urls: 'turn:jp.relay.metered.ca:443',
          username: 'dd552a2f5dca99f4e390e0cc',
          credential: '/K8NuOaoQsL91LMT',
        },
      ],
      iceCandidatePoolSize: 10,
      iceTransportPolicy: 'all',
      bundlePolicy: 'balanced',
      rtcpMuxPolicy: 'require',
    },
    stream: {
      localStream: null,
      remoteStreams: new Map<string, any>(),
      localScreenStream: null,
      remoteScreenStreams: new Map<string, any>(),
    },
    peersSharingScreen: new Set<string>(),
    action: {
      isMicEnabled: true,
      isCameraEnabled: false,
      isSpeakerphoneEnabled: true,
      duration: 0,
      startedAt: null,
      isSharingScreen: false,
      userIdGhimmed: '',
      screenSharerIdGhimmed: '',
    },
    devices: {
      audioInputs: [],
      audioOutputs: [],
      videoInputs: [],
      selectedAudioInput: '',
      selectedAudioOutput: '',
      selectedVideoInput: '',
    },
    socket: null,
    actionUserId: null,
    callId: null,
    answer: null,
    incomingCall: null,

    // ─── Window / Screen management (RN: navigate instead of window.open) ─────

    openCall: (payload) => {
      const { roomId, mode, members, currentUser, socket, callMode = 'p2p' } =
        payload;
 
      if (!currentUser?.id) {
        console.warn('[openCall] missing currentUser, aborting');
        return;
      }

      const memberMap = members.map((m: any) => ({
        id: m.id,
        fullname: m.fullname,
        avatar: m.avatar,
        is_caller: m.id === currentUser.id,
        status: 'initiated',
      }));

      set({
        roomId,
        mode,
        callMode,
        members: memberMap,
        socket,
        status: 'calling',
        callId: null,
        incomingCall: null,
      });

      if (callMode !== 'sfu') {
        socket?.emit('call:request', {
          actionUserId: currentUser?.id || '',
          membersIds: memberMap.map((m: any) => m.id),
          roomId,
          callType: mode,
        });
      }

      navigateToCallScreen(_callNavigation, {
        roomId,
        members: memberMap,
        callType: mode,
        callMode,
        status: 'calling',
        isCaller: true,
      });
    },

    // ─── Incoming call (from socket) ─────────────────────────────────────────

    handleRequestCall: async (payload: any) => {
      const { roomId, members, callType, callId, callMode = 'p2p', actionUserId } =
        payload;

      const hasActiveModal = !!useCallStore.getState().incomingCall;
      const isInCall =
        useCallStore.getState().status === 'accepted' ||
        useCallStore.getState().status === 'calling';

      if (isInCall || hasActiveModal) {
        // Already in a call — show a notification (handled at component level)
        return;
      }

      useCallStore.getState().updateCallState({
        incomingCall: {
          callId,
          roomId,
          callType,
          callMode,
          members,
          actionUserId,
          receivedAt: Date.now(),
        },
      } as any);
    },

    // ─── Incoming call modal actions ─────────────────────────────────────────

    acceptIncomingCall: () => {
      const incoming = useCallStore.getState().incomingCall;
      if (!incoming) return;

      const memberMap = incoming.members.map((m: any) => ({
        ...m,
        is_caller: m.id === incoming.actionUserId,
      }));

      set({
        roomId: incoming.roomId,
        mode: incoming.callType,
        callMode: incoming.callMode,
        members: memberMap,
        status: 'joined',
        callId: incoming.callId,
        incomingCall: null,
      });

      navigateToCallScreen(_callNavigation, {
        roomId: incoming.roomId,
        members: memberMap,
        callType: incoming.callType,
        callMode: incoming.callMode,
        status: 'joined',
        callId: incoming.callId,
        isCaller: false,
      });
    },

    rejectIncomingCall: () => {
      const state = useCallStore.getState();
      const incoming = state.incomingCall;
      if (!incoming) return;
      const actionUserId = useAuthStore.getState().user?.id;
      state.socket?.emit('call:end', {
        roomId: incoming.roomId,
        actionUserId,
        status: 'rejected',
        callId: incoming.callId,
      });
      set({ incomingCall: null });
    },

    missIncomingCall: () => {
      const state = useCallStore.getState();
      const incoming = state.incomingCall;
      if (!incoming) return;
      const actionUserId = useAuthStore.getState().user?.id;
      state.socket?.emit('call:end', {
        roomId: incoming.roomId,
        actionUserId,
        status: 'missed',
        callId: incoming.callId,
      });
      set({ incomingCall: null });
    },

    clearIncomingCall: () => {
      set({ incomingCall: null });
    },

    // ─── Call lifecycle ───────────────────────────────────────────────────────

    acceptCall: async (payload) => {
      const { roomId, members, currentUser, socket, callId } = payload;
      const actionUserId = currentUser.id;

      if (get().callMode === 'sfu') {
        await get().updateCallState({
          status: 'joined',
          roomId,
          socket: socket ?? get().socket,
          callId,
          members,
          mode: get().mode,
          callMode: 'sfu',
          action: get().action,
        } as any);
        return;
      }

      const otherMembers = members
        .map((m: CallMember) => ({
          ...m,
          status: m.id === currentUser.id ? 'started' : m.status,
        }))
        .filter((m: CallMember) => m.id !== currentUser.id);

      const existingPeers = useP2pCallStore.getState().peerConnections;
      const allPeersAlreadyCreated =
        otherMembers.length > 0 &&
        otherMembers.every((m: CallMember) =>
          existingPeers.has(`${roomId}-${m.id}`),
        );
      if (allPeersAlreadyCreated) return;

      const membersNew = members.map((m: CallMember) => ({
        ...m,
        status: m.id === currentUser.id ? 'started' : m.status,
      }));
      set({ status: 'accepted', members: membersNew });

      for (const member of otherMembers) {
        const pc = await get().handleCreatePeerConnection(roomId, member.id);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket?.emit('call:accepted', {
          membersIds: members.map((m: any) => m.id),
          actionUserId,
          roomId,
          targetUserId: member.id,
          offer: Helpers.enCryptUserInfo(offer),
          callId,
        });
      }
    },

    endCall: async (payload: any) => {
      const { roomId, actionUserId, status, callId } = payload;
      const socket = get().socket;

      get().stream.localStream?.getTracks?.().forEach((track: any) => track.stop());
      get().stream.localScreenStream?.getTracks?.().forEach((track: any) => track.stop());
      get().stream.remoteStreams.forEach((stream: any) => {
        stream?.getTracks?.().forEach((track: any) => track.stop());
      });
      get().stream.remoteScreenStreams.forEach((stream: any) => {
        stream?.getTracks?.().forEach((track: any) => track.stop());
      });

      socket?.emit('call:end', { roomId, actionUserId, status, callId });

      if (get().callMode === 'sfu') {
        useSfuCallStore.getState().teardownSfu();
      } else {
        useP2pCallStore.getState().teardownP2p();
      }

      _stopDurationTicker();

      set({
        status: 'ended',
        roomId: null,
        stream: {
          localStream: null,
          remoteStreams: new Map<string, any>(),
          localScreenStream: null,
          remoteScreenStreams: new Map<string, any>(),
        },
        peersSharingScreen: new Set<string>(),
      });
    },

    releaseLocalCall: () => {
      get().stream.localStream?.getTracks?.().forEach((track: any) => track.stop());
      get().stream.localScreenStream?.getTracks?.().forEach((track: any) => track.stop());
      get().stream.remoteStreams.forEach((stream: any) => {
        stream?.getTracks?.().forEach((track: any) => track.stop());
      });
      get().stream.remoteScreenStreams.forEach((stream: any) => {
        stream?.getTracks?.().forEach((track: any) => track.stop());
      });

      if (get().callMode === 'sfu') {
        useSfuCallStore.getState().teardownSfu({ emitLeave: false });
      } else {
        useP2pCallStore.getState().teardownP2p();
      }

      _stopDurationTicker();

      set({
        status: 'ended',
        roomId: null,
        stream: {
          localStream: null,
          remoteStreams: new Map<string, any>(),
          localScreenStream: null,
          remoteScreenStreams: new Map<string, any>(),
        },
        peersSharingScreen: new Set<string>(),
        action: {
          ...get().action,
          isSharingScreen: false,
          userIdGhimmed: '',
          screenSharerIdGhimmed: '',
        },
      });
    },

    handleEndCall: (payload: any) => {
      const { roomId, actionUserId, callId } = payload;

      const incoming = get().incomingCall;
      if (incoming && (!callId || incoming.callId === callId)) {
        set({ incomingCall: null });
      }

      if (get().callMode === 'sfu') {
        const key = `${roomId}-${actionUserId}`;

        const hasStream = get().stream.remoteStreams.has(key);
        const hasScreenStream = get().stream.remoteScreenStreams.has(key);
        const hasPeer = useP2pCallStore.getState().peerConnections.has(key);
        const wasSharing = get().peersSharingScreen.has(actionUserId);
        const wasPinned = get().action.userIdGhimmed === actionUserId;
        if (!hasStream && !hasScreenStream && !hasPeer && !wasSharing && !wasPinned) {
          return;
        }

        const streamToRemove = get().stream.remoteStreams.get(key);
        streamToRemove?.getTracks?.().forEach((track: any) => track.stop());

        const screenStreamToRemove = get().stream.remoteScreenStreams.get(key);
        screenStreamToRemove?.getTracks?.().forEach((track: any) => track.stop());

        const pc = useP2pCallStore.getState().peerConnections.get(key);
        if (pc) pc.close();

        const newRemoteStreams = new Map(get().stream.remoteStreams);
        newRemoteStreams.delete(key);
        const newRemoteScreenStreams = new Map(get().stream.remoteScreenStreams);
        newRemoteScreenStreams.delete(key);

        const newPeerConnections = new Map(useP2pCallStore.getState().peerConnections);
        newPeerConnections.delete(key);
        const newScreenTransceivers = new Map(useP2pCallStore.getState().screenTransceivers);
        newScreenTransceivers.delete(key);
        const newRemoteScreenTransceivers = new Map(
          useP2pCallStore.getState().remoteScreenTransceivers,
        );
        newRemoteScreenTransceivers.delete(key);

        useP2pCallStore.setState({
          peerConnections: newPeerConnections,
          screenTransceivers: newScreenTransceivers,
          remoteScreenTransceivers: newRemoteScreenTransceivers,
        });

        const newPeersSharingScreen = new Set(get().peersSharingScreen);
        newPeersSharingScreen.delete(actionUserId);
        const wasPinnedLeaving = get().action.userIdGhimmed === actionUserId;

        set({
          stream: {
            ...get().stream,
            remoteStreams: newRemoteStreams,
            remoteScreenStreams: newRemoteScreenStreams,
          },
          peersSharingScreen: newPeersSharingScreen,
          ...(wasPinnedLeaving
            ? { action: { ...get().action, userIdGhimmed: '' } }
            : {}),
        });
        return;
      }

      // Full P2P teardown
      get().stream.localStream?.getTracks?.().forEach((track: any) => track.stop());
      get().stream.localScreenStream?.getTracks?.().forEach((track: any) => track.stop());
      get().stream.remoteStreams.forEach((stream: any) =>
        stream?.getTracks?.().forEach((track: any) => track.stop()),
      );
      get().stream.remoteScreenStreams.forEach((stream: any) =>
        stream?.getTracks?.().forEach((track: any) => track.stop()),
      );

      useP2pCallStore.getState().teardownP2p();
      _stopDurationTicker();

      set({
        status: 'ended',
        roomId: null,
        stream: {
          localStream: null,
          remoteStreams: new Map<string, any>(),
          localScreenStream: null,
          remoteScreenStreams: new Map<string, any>(),
        },
        peersSharingScreen: new Set<string>(),
      });
    },

    // ─── Event dispatch hub ───────────────────────────────────────────────────

    eventCall: async (event: string, payload: any) => {
      const currentUser = useAuthStore.getState().user;
      if (!currentUser) return;

      const { actionUserId, answer, candidate, roomId, targetUserId } = payload;
      const socket = get().socket;

      switch (event) {
        case 'request':
          await get().handleRequestCall(payload);
          break;

        case 'accepted':
          await useP2pCallStore.getState().handleAcceptCall(payload);
          break;

        case 'answer': {
          const key = `${roomId}-${actionUserId}`;
          const pc = useP2pCallStore.getState().peerConnections.get(key);
          if (!pc) break;

          if (pc.signalingState !== 'have-local-offer') {
            await useP2pCallStore.getState().flushPendingCandidates(roomId, actionUserId);
            break;
          }
          try {
            const { RTCSessionDescription } = require('react-native-webrtc');
            const answerDescription = Helpers.decryptUserInfo(answer);
            await pc.setRemoteDescription(new RTCSessionDescription(answerDescription));
            await useP2pCallStore.getState().flushPendingCandidates(roomId, actionUserId);
          } catch (error) {
            console.error('[P2P] Error setting remote description (answer):', error);
          }
          break;
        }

        case 'end':
          get().handleEndCall(payload);
          break;

        case 'cancelled':
          set({ incomingCall: null });
          if (get().status === 'calling') {
            set({ status: 'ended', roomId: null });
          }
          break;

        case 'rejected':
          set({ incomingCall: null });
          break;

        case 'candidate': {
          if (!candidate) break;
          const key = `${roomId}-${actionUserId}`;
          const { RTCIceCandidate } = require('react-native-webrtc');
          const iceCandidate = new RTCIceCandidate(candidate);
          const pc = useP2pCallStore.getState().peerConnections.get(key);
          const pcReady = pc && pc.signalingState !== 'closed' && pc.remoteDescription;

          if (pcReady) {
            try {
              await pc.addIceCandidate(iceCandidate);
            } catch {
              // Ignore: PC may have closed
            }
          } else if (pc && pc.signalingState !== 'closed') {
            const pending = useP2pCallStore.getState().pendingCandidates;
            if (!pending.has(key)) pending.set(key, []);
            pending.get(key)!.push(iceCandidate);
          }
          break;
        }

        case 'busy':
          if (get().status === 'ended' || get().status === 'idle') break;
          set({ error: `${payload.targetUserId || 'Người dùng'} đang bận` });
          await get().endCall({
            roomId: get().roomId,
            actionUserId: useAuthStore.getState().user?.id,
            status: 'cancelled',
            callId: get().callId || payload.callId,
          });
          break;

        case 'member-joined':
          set({ members: payload.members });
          if (get().callMode === 'sfu') {
            if (get().status === 'calling') {
              set({ status: 'accepted' });
            }
            const emitGetProducers = (attempt = 0) => {
              const { sfu: sfuNow } = useSfuCallStore.getState();
              const { roomId: r, socket: s } = get();
              if (sfuNow.recvTransport && sfuNow.device && r && s) {
                s.emit('signal', { type: 'getProducers', roomId: r, target: 'sfu' });
              } else if (attempt < 15) {
                setTimeout(() => emitGetProducers(attempt + 1), 300);
              }
            };
            setTimeout(() => emitGetProducers(), 500);
          }
          break;

        case 'share-screen': {
          const { actionUserId: sharerId, isSharing, screenProducerId } = payload;
          const stateRoomId = get().roomId;
          const key = stateRoomId && sharerId ? `${stateRoomId}-${sharerId}` : null;
          if (isSharing) {
            if (key) {
              const transceiver =
                useP2pCallStore.getState().remoteScreenTransceivers?.get(key);
              const track = transceiver?.receiver?.track;
              if (track) {
                set((prev) => {
                  let MediaStreamClass: any;
                  try {
                    MediaStreamClass = require('react-native-webrtc').MediaStream;
                  } catch {
                    MediaStreamClass = null;
                  }
                  const existing = prev.stream.remoteScreenStreams.get(key);
                  const target = existing ?? (MediaStreamClass ? new MediaStreamClass() : {
                    getTracks: () => [],
                    addTrack: () => {},
                    removeTrack: () => {},
                  });
                  target.getTracks().forEach((t: any) => {
                    if (t.kind === track.kind && t !== track) {
                      target.removeTrack(t);
                    }
                  });
                  if (!target.getTracks().includes(track)) {
                    target.addTrack(track);
                  }
                  const newRemoteScreenStreams = new Map(prev.stream.remoteScreenStreams);
                  newRemoteScreenStreams.set(key, target);
                  return {
                    stream: {
                      ...prev.stream,
                      remoteScreenStreams: newRemoteScreenStreams,
                    },
                  };
                });
              }
            }

            set((prev) => ({
              peersSharingScreen: new Set([...prev.peersSharingScreen, sharerId]),
            }));
            if (screenProducerId && get().callMode === 'sfu') {
              useSfuCallStore.setState((prev: SfuStoreState) => ({
                sfu: {
                  ...prev.sfu,
                  screenProducerIds: new Set([...prev.sfu.screenProducerIds, screenProducerId]),
                },
              }));

              const consumers = useSfuCallStore.getState().sfu.consumers;
              for (const consumer of consumers.values()) {
                if (consumer.producerId !== screenProducerId) continue;
                set((prev) => {
                  if (!key) return prev;

                  const cameraStream = prev.stream.remoteStreams.get(key);
                  if (cameraStream) {
                    try {
                      cameraStream.removeTrack(consumer.track);
                    } catch {}
                  }

                  let MediaStreamClass: any;
                  try {
                    MediaStreamClass = require('react-native-webrtc').MediaStream;
                  } catch {
                    MediaStreamClass = null;
                  }
                  const existing = prev.stream.remoteScreenStreams.get(key);
                  const target = existing ?? (MediaStreamClass ? new MediaStreamClass() : {
                    getTracks: () => [],
                    addTrack: () => {},
                    removeTrack: () => {},
                  });
                  target.getTracks().forEach((t: any) => {
                    if (t.kind === consumer.track.kind && t !== consumer.track) {
                      target.removeTrack(t);
                    }
                  });
                  if (!target.getTracks().includes(consumer.track)) {
                    target.addTrack(consumer.track);
                  }

                  const newRemoteStreams = new Map(prev.stream.remoteStreams);
                  if (cameraStream?.getTracks?.().length === 0) {
                    newRemoteStreams.delete(key);
                  } else if (cameraStream) {
                    newRemoteStreams.set(key, cameraStream);
                  }

                  const newRemoteScreenStreams = new Map(prev.stream.remoteScreenStreams);
                  newRemoteScreenStreams.set(key, target);
                  return {
                    stream: {
                      ...prev.stream,
                      remoteStreams: newRemoteStreams,
                      remoteScreenStreams: newRemoteScreenStreams,
                    },
                  };
                });
              }
            }
          } else {
            set((prev) => {
              const next = new Set(prev.peersSharingScreen);
              next.delete(sharerId);
              const newRemoteScreenStreams = new Map(prev.stream.remoteScreenStreams);
              if (key) newRemoteScreenStreams.delete(key);
              return {
                peersSharingScreen: next,
                stream: {
                  ...prev.stream,
                  remoteScreenStreams: newRemoteScreenStreams,
                },
              };
            });
          }
          break;
        }

        case 'camera-state': {
          // Component-level state (cameraOffPeers) handles this via socket events
          break;
        }

        case 'mic-state': {
          // Component-level state (micOffPeers) handles this via socket events
          break;
        }

        default:
          break;
      }
    },

    // ─── Delegation wrappers (P2P) ────────────────────────────────────────────

    handleCreatePeerConnection: async (roomId, actionUserId) => {
      return useP2pCallStore.getState().handleCreatePeerConnection(roomId, actionUserId);
    },

    handleAcceptCall: async (payload) => {
      return useP2pCallStore.getState().handleAcceptCall(payload);
    },

    flushPendingCandidates: async (roomId, actionUserId) => {
      return useP2pCallStore.getState().flushPendingCandidates(roomId, actionUserId);
    },

    // ─── Delegation wrappers (SFU) ────────────────────────────────────────────

    initSFU: async () => {
      return useSfuCallStore.getState().initSFU();
    },

    handleSFUSignal: async (payload) => {
      return useSfuCallStore.getState().handleSFUSignal(payload);
    },

    // ─── Local stream ─────────────────────────────────────────────────────────

    handleCreateLocalStream: async () => {
      if (get().stream.localStream) return;

      const mediaDevices = _getMediaDevices();
      if (!mediaDevices) {
        console.error('[Call] react-native-webrtc mediaDevices not available');
        return;
      }

      const currentState = get();
      const micGranted = await Permission.requestMicrophonePermission();
      if (!micGranted) {
        console.warn('[Call] Microphone permission denied');
        return;
      }

      const audioConstraint: any = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        ...(currentState.devices.selectedAudioInput
          ? { deviceId: { exact: currentState.devices.selectedAudioInput } }
          : {}),
      };
      const videoConstraint: any = currentState.devices.selectedVideoInput
        ? { deviceId: { exact: currentState.devices.selectedVideoInput } }
        : true;

      let stream: any = null;
      if (currentState.mode === 'audio') {
        try {
          stream = await mediaDevices.getUserMedia({ audio: audioConstraint });
        } catch (err) {
          console.error('[Call] Could not get microphone:', err);
          return;
        }
      } else {
        const cameraGranted = await Permission.requestCameraPermission();
        if (!cameraGranted) {
          console.warn('[Call] Camera permission denied, falling back to audio only');
          try {
            stream = await mediaDevices.getUserMedia({ audio: audioConstraint });
            set({
              mode: 'audio',
              stream: { ...get().stream, localStream: stream },
              action: { ...get().action, isCameraEnabled: false },
            });
          } catch (audioErr) {
            console.error('[Call] Could not get microphone:', audioErr);
          }
          return;
        }

        try {
          stream = await mediaDevices.getUserMedia({
            audio: audioConstraint,
            video: videoConstraint,
          });
        } catch (err) {
          console.warn('[Call] Could not get camera, falling back to audio:', err);
          try {
            stream = await mediaDevices.getUserMedia({ audio: audioConstraint });
            set({
              mode: 'audio',
              action: { ...get().action, isCameraEnabled: false },
            });
          } catch (audioErr) {
            console.error('[Call] Could not get microphone:', audioErr);
            return;
          }
        }
      }

      set({ stream: { ...get().stream, localStream: stream } });

      if (get().callMode === 'sfu') {
        await useSfuCallStore.getState().produceLocalStream(stream);
      }

      if (currentState.devices.audioInputs.length === 0) {
        await get().getDevices();
      }
    },

    // ─── Screen sharing (RN: mediaDevices.getDisplayMedia) ───────────────────

    handleShareScreen: async (value: boolean) => {
      const currentState = get();
      const roomId = currentState.roomId;
      const userId = useAuthStore.getState().user?.id;

      if (!roomId) return;

      const mediaDevices = _getMediaDevices();
      if (!mediaDevices) return;

      if (value) {
        let screenStream: any;
        try {
          screenStream = await mediaDevices.getDisplayMedia({ video: true, audio: false });
        } catch (err) {
          console.warn('[Call] Screen capture aborted:', err);
          set((prev) => ({ action: { ...prev.action, isSharingScreen: false } }));
          return;
        }

        const screenTrack = screenStream.getVideoTracks()[0];
        if (!screenTrack) return;

        screenTrack.onended = () => {
          void get().actionToggleTrack('shareScreen', false);
        };

        set((prev) => ({
          stream: { ...prev.stream, localScreenStream: screenStream },
          peersSharingScreen: userId
            ? new Set([...prev.peersSharingScreen, userId])
            : prev.peersSharingScreen,
          action: { ...prev.action, isSharingScreen: true },
        }));

        if (currentState.callMode === 'sfu') {
          const sendTransport = useSfuCallStore.getState().sfu.sendTransport;
          let screenProducerId: string | undefined;
          if (sendTransport && !sendTransport.closed) {
            try {
              const producer = await sendTransport.produce({
                track: screenTrack,
                appData: { source: 'screen' },
              });
              screenProducerId = producer.id;
              useSfuCallStore.setState((prev: SfuStoreState) => ({
                sfu: { ...prev.sfu, screenProducer: producer },
              }));
            } catch (err) {
              console.error('[Call] SFU produce screen failed:', err);
              screenTrack.stop();
              return;
            }
          }
          currentState.socket?.emit('call:share-screen', {
            roomId,
            actionUserId: userId,
            isSharing: true,
            screenProducerId,
          });
        } else {
          currentState.socket?.emit('call:share-screen', {
            roomId,
            actionUserId: userId,
            isSharing: true,
          });
          await useP2pCallStore.getState().replaceScreenTrackInPeers(screenTrack);
        }
      } else {
        if (currentState.callMode === 'sfu') {
          const screenProducer = useSfuCallStore.getState().sfu.screenProducer;
          if (screenProducer && !screenProducer.closed) screenProducer.close();
          useSfuCallStore.setState((prev: SfuStoreState) => ({
            sfu: { ...prev.sfu, screenProducer: null },
          }));
        } else {
          await useP2pCallStore.getState().replaceScreenTrackInPeers(null);
        }

        currentState.stream.localScreenStream?.getTracks?.().forEach((t: any) => t.stop());

        set((prev) => {
          const nextPeers = new Set(prev.peersSharingScreen);
          if (userId) nextPeers.delete(userId);
          return {
            stream: { ...prev.stream, localScreenStream: null },
            peersSharingScreen: nextPeers,
            action: { ...prev.action, isSharingScreen: false },
          };
        });

        currentState.socket?.emit('call:share-screen', {
          roomId,
          actionUserId: userId,
          isSharing: false,
        });
      }
    },

    // ─── Track toggles ────────────────────────────────────────────────────────

    actionToggleTrack: async (action, value) => {
      const localStream = get().stream.localStream;
      if (!localStream && action !== 'shareScreen') return;

      switch (action) {
        case 'mic': {
          localStream?.getAudioTracks().forEach((t: any) => { t.enabled = value; });
          set((prev) => ({ action: { ...prev.action, isMicEnabled: value } }));
          const { socket: sk, roomId: rId } = get();
          const uid = useAuthStore.getState().user?.id;
          if (sk && rId && uid) {
            sk.emit('call:mic-state', { roomId: rId, actionUserId: uid, isMicOn: value });
          }
          break;
        }
        case 'video': {
          const hasVideoTrack = (localStream?.getVideoTracks().length ?? 0) > 0;

          if (value && !hasVideoTrack) {
            await get().upgradeToVideo();
            const { socket: skU, roomId: rIdU } = get();
            const uidU = useAuthStore.getState().user?.id;
            if (skU && rIdU && uidU) {
              skU.emit('call:camera-state', { roomId: rIdU, actionUserId: uidU, isCameraOn: true });
            }
            break;
          }

          if (!value && localStream) {
            const videoTracks = localStream.getVideoTracks();
            if (videoTracks.length > 0) {
              const p2p = useP2pCallStore.getState();
              const localScreenTrack =
                get().stream.localScreenStream?.getVideoTracks()[0] ?? null;
              for (const [key, pc] of p2p.peerConnections) {
                if (pc.signalingState === 'closed') continue;
                const screenSender = p2p.screenTransceivers.get(key)?.sender;
                const isScreenSender = (s: any) =>
                  s === screenSender ||
                  (localScreenTrack !== null && s.track === localScreenTrack);
                const tracked = p2p.cameraSenders.get(key);
                const cameraSender =
                  tracked && pc.getSenders().includes(tracked) && !isScreenSender(tracked)
                    ? tracked
                    : pc.getSenders().find((s: any) => s.track?.kind === 'video' && !isScreenSender(s));
                if (cameraSender) {
                  try {
                    await cameraSender.replaceTrack(null);
                  } catch {}
                }
              }

              if (get().callMode === 'sfu') {
                const sfuStore = useSfuCallStore.getState();
                const ownScreen = sfuStore.sfu.screenProducer;
                for (const producer of sfuStore.sfu.producers.values()) {
                  if (producer.kind !== 'video' || producer.closed) continue;
                  if (ownScreen && producer.id === ownScreen.id) continue;
                  try { producer.pause(); } catch {}
                }
              }

              for (const t of videoTracks) {
                try { t.stop(); } catch {}
                localStream.removeTrack(t);
              }
            }
          } else if (value && hasVideoTrack) {
            localStream?.getVideoTracks().forEach((t: any) => { t.enabled = true; });
          }

          set((prev) => ({ action: { ...prev.action, isCameraEnabled: value } }));
          const { socket: sk, roomId: rId } = get();
          const uid = useAuthStore.getState().user?.id;
          if (sk && rId && uid) {
            sk.emit('call:camera-state', { roomId: rId, actionUserId: uid, isCameraOn: value });
          }
          break;
        }
        case 'speaker':
          set((prev) => ({
            action: { ...prev.action, isSpeakerphoneEnabled: value },
          }));
          break;
        case 'shareScreen':
          await get().handleShareScreen(value);
          break;
      }
    },

    setUserIdGhimmed: (userId) => {
      set((prev) => ({
        action: {
          ...prev.action,
          userIdGhimmed: userId,
          ...(userId ? { screenSharerIdGhimmed: '' } : {}),
        },
      }));
    },

    setScreenSharerIdGhimmed: (userId) => {
      set((prev) => ({
        action: {
          ...prev.action,
          screenSharerIdGhimmed: userId,
          ...(userId ? { userIdGhimmed: '' } : {}),
        },
      }));
    },

    // ─── Audio → Video upgrade ────────────────────────────────────────────────

    upgradeToVideo: async () => {
      if (_upgradeVideoInFlight) return _upgradeVideoInFlight;

      const run = async (): Promise<void> => {
        const state = get();
        const existingStream = state.stream.localStream;
        if (!existingStream) return;

        if (existingStream.getVideoTracks().length > 0) {
          existingStream.getVideoTracks().forEach((t: any) => (t.enabled = true));
          set((prev) => ({
            mode: 'video',
            action: { ...prev.action, isCameraEnabled: true },
          }));
          return;
        }

        const mediaDevices = _getMediaDevices();
        if (!mediaDevices) return;

        const baseConstraints = {
          video: state.devices.selectedVideoInput
            ? { deviceId: { exact: state.devices.selectedVideoInput } }
            : true,
          audio: false,
        };
        const attempts = [
          { delayMs: 0, constraints: baseConstraints },
          { delayMs: 400, constraints: { video: true, audio: false } },
          { delayMs: 1000, constraints: { video: true, audio: false } },
        ];

        let videoTrack: any = null;
        let lastErr: unknown = null;
        for (const attempt of attempts) {
          if (attempt.delayMs > 0) {
            await new Promise<void>((r) => setTimeout(() => r(), attempt.delayMs));
          }
          try {
            const cameraStream = await mediaDevices.getUserMedia(attempt.constraints);
            videoTrack = cameraStream.getVideoTracks()[0];
            if (videoTrack) break;
          } catch (err) {
            lastErr = err;
            const name = (err as any)?.name;
            if (name !== 'AbortError' && name !== 'NotReadableError') break;
          }
        }

        if (!videoTrack) {
          const name = (lastErr as any)?.name;
          const message =
            name === 'NotAllowedError' || name === 'SecurityError'
              ? 'Camera bị chặn. Hãy cấp quyền trong cài đặt.'
              : name === 'NotFoundError' || name === 'OverconstrainedError'
              ? 'Không tìm thấy camera trên thiết bị.'
              : name === 'NotReadableError' || name === 'AbortError'
              ? 'Camera đang được ứng dụng khác sử dụng. Hãy đóng app đó rồi thử lại.'
              : 'Không thể bật camera. Hãy thử lại sau.';
          set((prev) => ({
            error: message,
            action: { ...prev.action, isCameraEnabled: false },
          }));
          return;
        }

        existingStream.addTrack(videoTrack);

        try {
          if (state.callMode === 'sfu') {
            const sfuStore = useSfuCallStore.getState();
            const sendTransport = sfuStore.sfu.sendTransport;
            if (sendTransport && !sendTransport.closed) {
              const producer = await sendTransport.produce({ track: videoTrack });
              useSfuCallStore.setState((prev: SfuStoreState) => ({
                sfu: {
                  ...prev.sfu,
                  producers: new Map([...prev.sfu.producers, [producer.id, producer]]),
                },
              }));
            }
          } else {
            const p2p = useP2pCallStore.getState();
            const peers = p2p.peerConnections;
            const localScreenTrack =
              state.stream.localScreenStream?.getVideoTracks()[0] ?? null;
            for (const [key, pc] of peers) {
              if (pc.signalingState === 'closed') continue;
              const screenSender = p2p.screenTransceivers.get(key)?.sender;
              const isScreenSender = (s: any) =>
                s === screenSender ||
                (localScreenTrack !== null && s.track === localScreenTrack);
              const tracked = p2p.cameraSenders.get(key);
              const cameraSender =
                tracked && pc.getSenders().includes(tracked) && !isScreenSender(tracked)
                  ? tracked
                  : pc.getSenders().find((s: any) => s.track?.kind === 'video' && !isScreenSender(s));
              try {
                if (cameraSender) {
                  await cameraSender.replaceTrack(videoTrack);
                  if (tracked !== cameraSender) {
                    useP2pCallStore.setState((prev: P2pState) => {
                      const next = new Map(prev.cameraSenders);
                      next.set(key, cameraSender);
                      return { cameraSenders: next };
                    });
                  }
                } else {
                  const newSender = pc.addTrack(videoTrack, existingStream);
                  useP2pCallStore.setState((prev: P2pState) => {
                    const next = new Map(prev.cameraSenders);
                    next.set(key, newSender);
                    return { cameraSenders: next };
                  });
                  const offer = await pc.createOffer();
                  await pc.setLocalDescription(offer);
                  const targetUserId = key.split('-')[1] || key;
                  state.socket?.emit('call:accepted', {
                    roomId: state.roomId,
                    targetUserId,
                    offer: Helpers.enCryptUserInfo(offer),
                    callId: state.callId,
                    members: state.members,
                    renegotiate: true,
                  });
                }
              } catch (err) {
                console.warn(`[P2P] upgradeToVideo: track publish failed for ${key}:`, err);
              }
            }
          }
        } catch (err) {
          console.error('[Call] upgradeToVideo: publish failed', err);
        }

        set((prev) => ({
          mode: 'video',
          action: { ...prev.action, isCameraEnabled: true },
        }));
      };

      _upgradeVideoInFlight = run().finally(() => {
        _upgradeVideoInFlight = null;
      });
      return _upgradeVideoInFlight;
    },

    // ─── Device management ────────────────────────────────────────────────────

    getDevices: async () => {
      try {
        const mediaDevices = _getMediaDevices();
        if (!mediaDevices) return;

        const devices = await mediaDevices.enumerateDevices();
        const audioInputs = devices.filter((d: any) => d.kind === 'audioinput');
        const audioOutputs = devices.filter((d: any) => d.kind === 'audiooutput');
        const videoInputs = devices.filter((d: any) => d.kind === 'videoinput');

        set((prev) => ({
          devices: {
            ...prev.devices,
            audioInputs,
            audioOutputs,
            videoInputs,
            selectedAudioInput:
              prev.devices.selectedAudioInput || audioInputs[0]?.deviceId || '',
            selectedAudioOutput:
              prev.devices.selectedAudioOutput || audioOutputs[0]?.deviceId || '',
            selectedVideoInput:
              prev.devices.selectedVideoInput || videoInputs[0]?.deviceId || '',
          },
        }));
      } catch (error) {
        console.error('[Call] Error getting devices:', error);
      }
    },

    setDevice: async (type, deviceId) => {
      set((prev) => ({
        devices: {
          ...prev.devices,
          [type === 'audioInput'
            ? 'selectedAudioInput'
            : type === 'audioOutput'
            ? 'selectedAudioOutput'
            : 'selectedVideoInput']: deviceId,
        },
      }));

      if (type === 'audioInput' || type === 'videoInput') {
        const currentState = get();
        const currentStream = currentState.stream.localStream;
        if (!currentStream) return;

        currentStream.getTracks().forEach((t: any) => t.stop());

        const mediaDevices = _getMediaDevices();
        if (!mediaDevices) return;

        const constraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            deviceId: {
              exact:
                type === 'audioInput' ? deviceId : currentState.devices.selectedAudioInput,
            },
          },
          video:
            currentState.mode === 'video'
              ? {
                  deviceId: {
                    exact:
                      type === 'videoInput' ? deviceId : currentState.devices.selectedVideoInput,
                  },
                }
              : false,
        };

        try {
          const newStream = await mediaDevices.getUserMedia(constraints);
          set((prev) => ({ stream: { ...prev.stream, localStream: newStream } }));

          if (get().callMode === 'sfu') {
            await useSfuCallStore.getState().replaceTracksInProducers(newStream);
          } else {
            await useP2pCallStore.getState().replaceTracksInPeers(newStream, 'both');
          }
        } catch (error) {
          console.error('[Call] Error switching device:', error);
        }
      }
    },

    // ─── Call state initialization ────────────────────────────────────────────

    updateCallState: async (state: any) => {
      let currentUser = useAuthStore.getState().user;
      if (!currentUser) {
        void useAuthStore.getState().fetchMe();
        const start = Date.now();
        while (Date.now() - start < 5000) {
          currentUser = useAuthStore.getState().user;
          if (currentUser) break;
          await new Promise<void>((r) => setTimeout(() => r(), 50));
        }
        if (!currentUser) return;
      }

      const socket = state.socket ?? get().socket;

      if (state.status === 'accepted') {
        set((prev) => ({
          ...prev,
          ...state,
          action: { ...prev.action, ...(state.action ?? {}) },
        }));
        _startDurationTicker(set, () => get().action.startedAt);
        return;
      }

      const currentStatus = get().status;
      if (
        (currentStatus === 'accepted' || currentStatus === 'ended') &&
        (state.status === 'incoming' || state.status === 'calling' || state.status === 'idle')
      ) {
        return;
      }

      // Handle incomingCall-only updates (no status change)
      if (state.incomingCall !== undefined && !state.status) {
        set((prev) => ({ ...prev, ...state }));
        return;
      }

      const effectiveCallMode = state.callMode || get().callMode;
      let canonicalRoomId = state.roomId;
      let canonicalMembers: CallMember[] = state.members ?? [];
      let elapsedSeconds = 0;
      let canonicalStartedAt: string | null = get().action.startedAt;

      if (state.status === 'joined' && socket) {
        set((prev) => ({ ...prev, socket }));
        const joinCallId = state.callId || get().callId;
        let joinHistory: any = null;
        let joinCallState: any = null;

        if (joinCallId) {
          canonicalRoomId = await new Promise<string>((resolve) => {
            const fallback = setTimeout(() => resolve(state.roomId ?? ''), 3000);
            socket.emit(
              'call:join',
              { roomId: state.roomId, callId: joinCallId },
              (response: any) => {
                clearTimeout(fallback);
                if (response?.ok) {
                  joinHistory = response.history || null;
                  joinCallState = response.callState || null;
                }
                resolve(
                  response?.ok && response?.room?.room_id
                    ? response.room.room_id
                    : state.roomId,
                );
              },
            );
          });
        }

        if (joinHistory?.members?.length > 0) canonicalMembers = joinHistory.members;

        if (joinHistory?.started_at) {
          canonicalStartedAt = joinHistory.started_at;
          elapsedSeconds = Math.max(
            0,
            Math.floor((Date.now() - new Date(joinHistory.started_at).getTime()) / 1000),
          );
        }

        if (joinCallState) {
          const sharerIds = (joinCallState.sharing ?? []).map((s: any) => s.userId);
          const producerIds = (joinCallState.sharing ?? [])
            .map((s: any) => s.screenProducerId)
            .filter((id: any): id is string => !!id);
          if (sharerIds.length > 0) {
            set((prev) => ({
              peersSharingScreen: new Set([...prev.peersSharingScreen, ...sharerIds]),
            }));
          }
          if (producerIds.length > 0) {
            useSfuCallStore.setState((prev: SfuStoreState) => ({
              sfu: {
                ...prev.sfu,
                screenProducerIds: new Set([...prev.sfu.screenProducerIds, ...producerIds]),
              },
            }));
          }
        }

        if (effectiveCallMode === 'sfu') {
          await useSfuCallStore.getState().initSFU();
          socket?.emit('signal', { type: 'join', roomId: canonicalRoomId, target: 'sfu' });
        }

        if (effectiveCallMode === 'p2p') {
          void (async () => {
            const start = Date.now();
            while (Date.now() - start < 15000) {
              if (get().stream.localStream) break;
              await new Promise<void>((r) => setTimeout(() => r(), 100));
            }
            if (!get().stream.localStream) return;
            await get().acceptCall({
              roomId: canonicalRoomId,
              members: state.members,
              currentUser,
              socket,
              callId: joinCallId,
            });
          })();
        }
      } else if (state.status === 'calling' && socket) {
        if (effectiveCallMode === 'sfu') {
          canonicalRoomId = await new Promise<string>((resolve) => {
            const fallback = setTimeout(() => resolve(state.roomId ?? ''), 3000);
            socket.emit(
              'call:request',
              {
                actionUserId: currentUser?.id || '',
                membersIds: state.members?.map((m: CallMember) => m.id) || [],
                roomId: state.roomId,
                callType: state.mode,
              },
              (response: any) => {
                clearTimeout(fallback);
                if (response?.startedAt) canonicalStartedAt = response.startedAt;
                resolve(
                  response?.ok && response?.room?.room_id
                    ? response.room.room_id
                    : state.roomId ?? '',
                );
              },
            );
          });
          await useSfuCallStore.getState().initSFU();
          socket?.emit('signal', { type: 'join', roomId: canonicalRoomId, target: 'sfu' });
        } else {
          socket?.emit('call:request', {
            actionUserId: currentUser?.id || '',
            membersIds: state.members?.map((m: CallMember) => m.id) || [],
            roomId: state.roomId,
            callType: state.mode,
          });
        }
      }

      set((prev) => ({
        ...prev,
        ...state,
        roomId: canonicalRoomId,
        members: canonicalMembers,
        action: {
          ...prev.action,
          ...(state.action ?? {}),
          duration: elapsedSeconds,
          startedAt: canonicalStartedAt,
        },
        ...(state.status === 'joined' ? { status: 'accepted' } : {}),
      }));

      if (
        canonicalStartedAt &&
        (state.status === 'joined' || state.status === 'calling')
      ) {
        _startDurationTicker(set, () => get().action.startedAt);
      }
    },
  }),
);

export default useCallStore;
