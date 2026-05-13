import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  FlatList,
  Platform,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import useCallStore from '../../store/useCallStore';
import { CallMember } from '../../types/call.state';
import { useSocket } from '../../providers/socket.provider';
import { DeviceSelectorModal } from './device-selector';
import { PipView } from './pip-view';

let RTCView: any = null;
try {
  RTCView = require('react-native-webrtc').RTCView;
} catch {}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface CallUIProps {
  onEndCall: () => void;
  isBackground?: boolean;
}

export default function CallUI({ onEndCall, isBackground = false }: CallUIProps) {
  const {
    status,
    mode,
    callMode,
    members,
    action,
    stream,
    peersSharingScreen,
    roomId,
    callId,
    actionToggleTrack,
    setUserIdGhimmed,
    setScreenSharerIdGhimmed,
    endCall,
    handleCreateLocalStream,
    updateCallState,
    socket,
  } = useCallStore();

  const { socket: providerSocket } = useSocket();
  const [deviceSelectorOpen, setDeviceSelectorOpen] = useState(false);
  const [cameraOffPeers, setCameraOffPeers] = useState<Set<string>>(new Set());
  const [micOffPeers, setMicOffPeers] = useState<Set<string>>(new Set());
  const startedRef = useRef(false);

  const myId = members.find((m) => m.is_caller)?.id ?? '';

  // Initialize local stream + update socket in store
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const currentSocket = socket ?? providerSocket;
    if (currentSocket && !socket) {
      useCallStore.setState({ socket: currentSocket });
    }

    void handleCreateLocalStream();
  }, [handleCreateLocalStream, socket, providerSocket]);

  // Register call socket events
  useEffect(() => {
    const s = socket ?? providerSocket;
    if (!s) return;

    const onCallEvent = (event: string) => (payload: any) => {
      void useCallStore.getState().eventCall(event, payload);
    };

    const events = [
      'call:accepted', 'call:answer', 'call:candidate',
      'call:end', 'call:member-joined', 'call:share-screen',
      'call:camera-state', 'call:mic-state',
    ];
    const handlers: Record<string, (d: any) => void> = {};
    for (const ev of events) {
      const name = ev.replace('call:', '');
      handlers[ev] = onCallEvent(name);
      s.on(ev, handlers[ev]);
    }

    // SFU signal
    s.on('signal', (payload: any) => {
      void useCallStore.getState().handleSFUSignal(payload);
    });

    // Camera / mic state events for UI
    s.on('call:camera-state', ({ actionUserId, isCameraOn }: any) => {
      setCameraOffPeers((prev) => {
        const next = new Set(prev);
        isCameraOn ? next.delete(actionUserId) : next.add(actionUserId);
        return next;
      });
    });
    s.on('call:mic-state', ({ actionUserId, isMicOn }: any) => {
      setMicOffPeers((prev) => {
        const next = new Set(prev);
        isMicOn ? next.delete(actionUserId) : next.add(actionUserId);
        return next;
      });
    });

    return () => {
      for (const [ev, handler] of Object.entries(handlers)) s.off(ev, handler);
      s.off('signal');
      s.off('call:camera-state');
      s.off('call:mic-state');
    };
  }, [socket, providerSocket]);

  const handleEndCall = useCallback(async () => {
    await endCall({
      roomId,
      actionUserId: myId,
      status: 'ended',
      callId,
    });
    onEndCall();
  }, [endCall, roomId, myId, callId, onEndCall]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Main video: pinned camera > pinned screen > local screen > first peer screen > first peer camera > local
  const mainStream = (() => {
    const { userIdGhimmed, screenSharerIdGhimmed } = action;

    if (userIdGhimmed) {
      if (userIdGhimmed === myId) return stream.localStream;
      return stream.remoteStreams.get(`${roomId}-${userIdGhimmed}`) ?? null;
    }

    if (screenSharerIdGhimmed) {
      if (screenSharerIdGhimmed === myId) return stream.localScreenStream;
      return stream.remoteScreenStreams.get(`${roomId}-${screenSharerIdGhimmed}`) ?? null;
    }

    if (action.isSharingScreen && stream.localScreenStream) return stream.localScreenStream;

    const firstScreenSharer = [...peersSharingScreen].find((id) => id !== myId);
    if (firstScreenSharer) {
      return stream.remoteScreenStreams.get(`${roomId}-${firstScreenSharer}`) ?? null;
    }

    // First remote camera
    for (const [, s] of stream.remoteStreams) {
      if (s) return s;
    }

    return stream.localStream;
  })();

  // Mini strip: all participants except the one in main view
  const stripMembers = members.filter((m) => {
    const inMain =
      action.userIdGhimmed === m.id ||
      (action.screenSharerIdGhimmed === m.id) ||
      (!action.userIdGhimmed && !action.screenSharerIdGhimmed);
    return true; // show all in strip; main view shows the selected one
  });

  if (status === 'idle' || status === 'ended') return null;

  if (isBackground) {
    return (
      <PipView
        localStream={stream.localStream}
        isMicEnabled={action.isMicEnabled}
        onTap={onEndCall}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Status bar */}
      <View style={styles.topBar}>
        <Text style={styles.statusText}>
          {status === 'calling' ? 'Đang gọi...' :
           status === 'accepted' ? formatDuration(action.duration) :
           status === 'incoming' ? 'Đang đến...' : status}
        </Text>
        <Text style={styles.modeText}>
          {callMode === 'sfu' ? 'Nhóm' : 'P2P'} · {mode === 'video' ? 'Video' : 'Thoại'}
        </Text>
      </View>

      {/* Main video area */}
      <View style={styles.mainView}>
        {mode === 'video' && mainStream && RTCView ? (
          <RTCView
            streamURL={mainStream.toURL?.() ?? mainStream.id}
            style={styles.mainVideo}
            objectFit="cover"
            mirror={mainStream === stream.localStream}
          />
        ) : (
          <View style={styles.audioCallScreen}>
            <View style={styles.audioAvatarRing}>
              {members.length > 0 && (
                <FastImage
                  style={styles.audioAvatar}
                  source={
                    members[0].avatar
                      ? { uri: members[0].avatar }
                      : require('../../assets/images/user-avatar.png')
                  }
                />
              )}
            </View>
            <Text style={styles.audioCallerName}>
              {members.map((m) => m.fullname).join(', ')}
            </Text>
          </View>
        )}

        {/* Local pip (small, when not main) */}
        {mode === 'video' && stream.localStream && mainStream !== stream.localStream && RTCView && (
          <TouchableOpacity
            style={styles.localPip}
            onPress={() => setUserIdGhimmed(myId)}
          >
            <RTCView
              streamURL={stream.localStream.toURL?.() ?? stream.localStream.id}
              style={StyleSheet.absoluteFill}
              objectFit="cover"
              mirror
            />
            {!action.isCameraEnabled && (
              <View style={styles.cameraOffOverlay}>
                <Text style={styles.cameraOffIcon}>📵</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Participant strip (SFU / group calls) */}
      {callMode === 'sfu' && members.length > 2 && (
        <FlatList
          horizontal
          data={stripMembers}
          keyExtractor={(m) => m.id}
          style={styles.strip}
          contentContainerStyle={{ paddingHorizontal: 8 }}
          renderItem={({ item: m }) => {
            const remoteStream = stream.remoteStreams.get(`${roomId}-${m.id}`);
            const isCamOff = cameraOffPeers.has(m.id) || !remoteStream;
            const isMicOff = micOffPeers.has(m.id);
            return (
              <TouchableOpacity
                style={styles.stripTile}
                onPress={() => setUserIdGhimmed(m.id)}
              >
                {!isCamOff && remoteStream && RTCView ? (
                  <RTCView
                    streamURL={remoteStream.toURL?.() ?? remoteStream.id}
                    style={StyleSheet.absoluteFill}
                    objectFit="cover"
                  />
                ) : (
                  <View style={styles.stripAvatarBg}>
                    <FastImage
                      style={styles.stripAvatar}
                      source={
                        m.avatar
                          ? { uri: m.avatar }
                          : require('../../assets/images/user-avatar.png')
                      }
                    />
                  </View>
                )}
                {isMicOff && (
                  <View style={styles.micOffBadge}>
                    <Text style={{ fontSize: 9 }}>🔇</Text>
                  </View>
                )}
                <Text style={styles.stripName} numberOfLines={1}>{m.fullname}</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Controls */}
      <View style={styles.controls}>
        {/* Mic */}
        <ControlButton
          icon={action.isMicEnabled ? '🎤' : '🔇'}
          label={action.isMicEnabled ? 'Tắt mic' : 'Bật mic'}
          active={!action.isMicEnabled}
          onPress={() => actionToggleTrack('mic', !action.isMicEnabled)}
        />

        {/* Camera */}
        <ControlButton
          icon={action.isCameraEnabled ? '📷' : '📵'}
          label={action.isCameraEnabled ? 'Tắt cam' : 'Bật cam'}
          active={!action.isCameraEnabled}
          onPress={() => actionToggleTrack('video', !action.isCameraEnabled)}
        />

        {/* Speaker */}
        <ControlButton
          icon={action.isSpeakerphoneEnabled ? '🔊' : '🔈'}
          label={action.isSpeakerphoneEnabled ? 'Loa' : 'Loa tai'}
          onPress={() => actionToggleTrack('speaker', !action.isSpeakerphoneEnabled)}
        />

        {/* Screen share */}
        <ControlButton
          icon="📲"
          label={action.isSharingScreen ? 'Dừng share' : 'Chia sẻ'}
          active={action.isSharingScreen}
          onPress={() => actionToggleTrack('shareScreen', !action.isSharingScreen)}
        />

        {/* Device selector */}
        <ControlButton
          icon="⚙️"
          label="Thiết bị"
          onPress={() => setDeviceSelectorOpen(true)}
        />

        {/* End call */}
        <TouchableOpacity style={styles.endBtn} onPress={handleEndCall}>
          <Text style={styles.endIcon}>📵</Text>
        </TouchableOpacity>
      </View>

      {deviceSelectorOpen && (
        <DeviceSelectorModal
          visible={deviceSelectorOpen}
          onClose={() => setDeviceSelectorOpen(false)}
        />
      )}
    </SafeAreaView>
  );
}

function ControlButton({
  icon,
  label,
  onPress,
  active = false,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.ctrlBtn} onPress={onPress}>
      <View style={[styles.ctrlIconWrap, active && styles.ctrlIconActive]}>
        <Text style={styles.ctrlIcon}>{icon}</Text>
      </View>
      <Text style={styles.ctrlLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D1A',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  modeText: {
    color: '#AAB0BD',
    fontSize: 13,
  },
  mainView: {
    flex: 1,
    position: 'relative',
  },
  mainVideo: {
    flex: 1,
    backgroundColor: '#1C1C2E',
  },
  audioCallScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  audioAvatarRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#42A59F',
    overflow: 'hidden',
  },
  audioAvatar: {
    width: '100%',
    height: '100%',
  },
  audioCallerName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  localPip: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 96,
    height: 128,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#42A59F',
    backgroundColor: '#1C1C2E',
  },
  cameraOffOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraOffIcon: { fontSize: 28 },
  strip: {
    maxHeight: 104,
    paddingVertical: 6,
  },
  stripTile: {
    width: 72,
    height: 92,
    borderRadius: 10,
    overflow: 'hidden',
    marginHorizontal: 4,
    backgroundColor: '#1C1C2E',
  },
  stripAvatarBg: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  micOffBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    padding: 2,
  },
  stripName: {
    color: '#fff',
    fontSize: 10,
    textAlign: 'center',
    paddingHorizontal: 2,
    paddingBottom: 4,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    backgroundColor: '#12121E',
  },
  ctrlBtn: {
    alignItems: 'center',
    gap: 4,
    minWidth: 48,
  },
  ctrlIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2A2A3E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctrlIconActive: {
    backgroundColor: '#42A59F',
  },
  ctrlIcon: {
    fontSize: 22,
  },
  ctrlLabel: {
    color: '#AAB0BD',
    fontSize: 10,
  },
  endBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endIcon: {
    fontSize: 26,
  },
});
