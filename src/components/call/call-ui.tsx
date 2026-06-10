import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import useCallStore from '../../store/useCallStore';
import useAuthStore from '../../store/useAuth';
import { useSocket } from '../../providers/socket.provider';
import { DeviceSelectorModal } from './device-selector';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { MainStackParamList } from '../../navigations/MainStackNavigator';
import { PipView } from './pip-view';
import type { CallMember } from '../../types/call.state';
import {
  getCallHeaderTitle,
  getGridColumns,
  getInRoomMembers,
  getMemberFromStreamKey,
  getOtherParticipant,
} from '../../libs/call-ui-helpers';

let RTCView: any = null;
try {
  RTCView = require('react-native-webrtc').RTCView;
} catch {}

const { width: SCREEN_W } = Dimensions.get('window');
const CTRL_SIZE = 56;
const PRIMARY = '#42A59F';

interface CallUIProps {
  isBackground?: boolean;
}

export default function CallUI({ isBackground = false }: CallUIProps) {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList>>();
  const currentUserId = useAuthStore((s) => s.user?.id ?? '');

  const {
    status,
    mode,
    callMode,
    members,
    action,
    stream,
    roomId,
    callId,
    actionToggleTrack,
    setUserIdGhimmed,
    endCall,
    handleCreateLocalStream,
    socket,
  } = useCallStore();

  const { socket: providerSocket } = useSocket('/call');
  const [deviceSelectorOpen, setDeviceSelectorOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [cameraOffPeers, setCameraOffPeers] = useState<Set<string>>(new Set());
  const [micOffPeers, setMicOffPeers] = useState<Set<string>>(new Set());
  const startedRef = useRef(false);

  const remoteEntries = useMemo(
    () => Array.from(stream.remoteStreams.entries()),
    [stream.remoteStreams],
  );

  const headerTitle = useMemo(
    () => getCallHeaderTitle(members, currentUserId, status),
    [members, currentUserId, status],
  );

  const waitingPeer = useMemo(
    () => getOtherParticipant(members, currentUserId),
    [members, currentUserId],
  );

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const currentSocket = socket ?? providerSocket;
    if (currentSocket && !socket) {
      useCallStore.setState({ socket: currentSocket });
    }

    void handleCreateLocalStream();
  }, [handleCreateLocalStream, socket, providerSocket]);

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

    s.on('signal', (payload: any) => {
      void useCallStore.getState().handleSFUSignal(payload);
    });

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
    setMoreMenuOpen(false);
    await endCall({
      roomId,
      actionUserId: currentUserId,
      status: 'ended',
      callId,
    });
  }, [endCall, roomId, currentUserId, callId]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const getMemberFromKey = useCallback(
    (key: string) => (roomId ? getMemberFromStreamKey(roomId, members, key) : null),
    [roomId, members],
  );

  const pinnedKey = action.userIdGhimmed
    ? `${roomId}-${action.userIdGhimmed}`
    : remoteEntries.length === 1
      ? remoteEntries[0][0]
      : null;

  const showGrid = remoteEntries.length > 1 && !action.userIdGhimmed;
  const cols = getGridColumns(remoteEntries.length);
  const tileW = (SCREEN_W - 16) / cols - 4;

  if (status === 'idle' || status === 'ended') return null;

  if (isBackground) {
    return (
      <PipView
        localStream={stream.localStream}
        isMicEnabled={action.isMicEnabled}
        onTap={() =>
          navigation.navigate('Call', {
            roomId,
            members,
            callType: mode,
            callMode,
            callId: callId ?? undefined,
            isCaller: members.some((m) => m.id === currentUserId && m.is_caller),
          })
        }
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header overlay — matches web call page */}
      <View style={styles.headerOverlay} pointerEvents="none">
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        {status === 'accepted' && (
          <Text style={styles.headerDuration}>{formatDuration(action.duration)}</Text>
        )}
      </View>

      {/* Video / waiting area */}
      <View style={styles.mainView}>
        {remoteEntries.length > 0 ? (
          showGrid ? (
            <ScrollView contentContainerStyle={styles.gridWrap}>
              {remoteEntries.map(([key, remoteStream]) => (
                <ParticipantTile
                  key={key}
                  streamKey={key}
                  stream={remoteStream}
                  member={getMemberFromKey(key)}
                  width={tileW}
                  isPinned={false}
                  isCameraOff={isPeerCameraOff(key, getMemberFromKey(key), cameraOffPeers)}
                  isMicOff={!!getMemberFromKey(key)?.id && micOffPeers.has(getMemberFromKey(key)!.id)}
                  onPress={() => setUserIdGhimmed(getMemberFromKey(key)?.id ?? '')}
                />
              ))}
            </ScrollView>
          ) : (
            (() => {
              const key = pinnedKey ?? remoteEntries[0]?.[0];
              const remoteStream = key ? stream.remoteStreams.get(key) : null;
              const member = key ? getMemberFromKey(key) : null;
              if (!remoteStream || !key) {
                return (
                  <WaitingView
                    peer={waitingPeer}
                    members={members}
                    message="Đang kết nối…"
                  />
                );
              }
              return (
                <ParticipantTile
                  streamKey={key}
                  stream={remoteStream}
                  member={member}
                  fullScreen
                  isPinned
                  isCameraOff={isPeerCameraOff(key, member, cameraOffPeers)}
                  isMicOff={!!member?.id && micOffPeers.has(member.id)}
                  onPress={() =>
                    setUserIdGhimmed(action.userIdGhimmed ? '' : member?.id ?? '')
                  }
                />
              );
            })()
          )
        ) : status === 'accepted' ? (
          <WaitingView
            peer={waitingPeer}
            members={members}
            message="Đang chờ người khác tham gia…"
          />
        ) : (
          <WaitingView
            peer={waitingPeer}
            members={members}
          />
        )}

        {/* Local camera PiP */}
        {mode === 'video' &&
          stream.localStream &&
          action.userIdGhimmed !== currentUserId &&
          RTCView && (
            <TouchableOpacity
              style={styles.localPip}
              onPress={() => setUserIdGhimmed(currentUserId)}
              activeOpacity={0.9}
            >
              <RTCView
                streamURL={stream.localStream.toURL?.() ?? stream.localStream.id}
                style={StyleSheet.absoluteFill}
                objectFit="cover"
                mirror
              />
              <View style={styles.pipLabel}>
                <Text style={styles.pipLabelText}>Bạn</Text>
              </View>
              {!action.isCameraEnabled && (
                <View style={styles.cameraOffOverlay}>
                  <FontAwesome name="video-camera" size={20} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          )}
      </View>

      {/* Controls: 4 nút — mic, cam, cúp máy, thêm (dropdown lên) */}
      {moreMenuOpen && (
        <Pressable
          style={styles.menuBackdrop}
          onPress={() => setMoreMenuOpen(false)}
        />
      )}
      <View style={styles.controls}>
        <CallControlButton
          icon="microphone"
          active={action.isMicEnabled}
          highlightWhenActive
          onPress={() => actionToggleTrack('mic', !action.isMicEnabled)}
        />
        <CallControlButton
          icon="video-camera"
          iconSlash={!action.isCameraEnabled}
          active={action.isCameraEnabled}
          highlightWhenActive
          onPress={() => actionToggleTrack('video', !action.isCameraEnabled)}
        />
        <CallControlButton icon="phone" danger onPress={handleEndCall} />
        <View style={styles.moreWrap}>
          {moreMenuOpen && (
            <View style={styles.moreMenu}>
              <MoreMenuItem
                icon={action.isSpeakerphoneEnabled ? 'volume-up' : 'volume-off'}
                label={action.isSpeakerphoneEnabled ? 'Loa ngoài' : 'Loa trong'}
                active={action.isSpeakerphoneEnabled}
                onPress={() => {
                  void actionToggleTrack('speaker', !action.isSpeakerphoneEnabled);
                }}
              />
              {status === 'accepted' && (
                <MoreMenuItem
                  icon="desktop"
                  label={action.isSharingScreen ? 'Dừng chia sẻ' : 'Chia sẻ màn hình'}
                  active={action.isSharingScreen}
                  onPress={() => {
                    void actionToggleTrack('shareScreen', !action.isSharingScreen);
                  }}
                />
              )}
              <MoreMenuItem
                icon="cog"
                label="Thiết bị"
                onPress={() => {
                  setMoreMenuOpen(false);
                  setDeviceSelectorOpen(true);
                }}
              />
            </View>
          )}
          <CallControlButton
            icon="ellipsis-h"
            active={moreMenuOpen}
            highlightWhenActive
            onPress={() => setMoreMenuOpen((v) => !v)}
          />
        </View>
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

function isPeerCameraOff(
  key: string,
  member: CallMember | null,
  cameraOffPeers: Set<string>,
): boolean {
  return !!(member?.id && cameraOffPeers.has(member.id));
}

function WaitingView({
  peer,
  members,
  message,
}: {
  peer: CallMember | null;
  members: CallMember[];
  message?: string;
}) {
  const inRoom = getInRoomMembers(members);
  const count = inRoom.length > 0 ? inRoom.length : members.length;
  const isGroup = count > 2;

  return (
    <View style={styles.waiting}>
      <View style={styles.waitingAvatarRing}>
        <FastImage
          style={styles.waitingAvatar}
          source={
            !isGroup && peer?.avatar
              ? { uri: peer.avatar }
              : require('../../assets/images/user-avatar.png')
          }
        />
      </View>
      <Text style={styles.waitingName}>
        {isGroup
          ? `Bạn và ${count - 1} người khác`
          : peer?.fullname ?? 'Người dùng'}
      </Text>
      {message ? <Text style={styles.waitingHint}>{message}</Text> : null}
    </View>
  );
}

function ParticipantTile({
  streamKey,
  stream,
  member,
  fullScreen,
  width,
  isCameraOff,
  isMicOff,
  onPress,
}: {
  streamKey: string;
  stream: any;
  member: CallMember | null;
  fullScreen?: boolean;
  width?: number;
  isPinned?: boolean;
  isCameraOff: boolean;
  isMicOff: boolean;
  onPress: () => void;
}) {
  const videoTracks = stream?.getVideoTracks?.() ?? [];
  const videoTrack = videoTracks[0];
  const hasVideo = !isCameraOff && RTCView && !!videoTrack;
  const rtcViewKey = `${streamKey}-${videoTrack?.id ?? 'no-video'}`;

  return (
    <TouchableOpacity
      style={[
        styles.tile,
        fullScreen && styles.tileFull,
        width != null && { width, height: width * 0.75 },
      ]}
      onPress={onPress}
      activeOpacity={0.95}
    >
      {hasVideo ? (
        <RTCView
          key={rtcViewKey}
          streamURL={stream.toURL?.() ?? stream.id}
          style={StyleSheet.absoluteFill}
          objectFit={fullScreen ? 'contain' : 'cover'}
        />
      ) : (
        <View style={styles.tileAvatarWrap}>
          <FastImage
            style={fullScreen ? styles.tileAvatarLg : styles.tileAvatarMd}
            source={
              member?.avatar
                ? { uri: member.avatar }
                : require('../../assets/images/user-avatar.png')
            }
          />
        </View>
      )}
      <View style={styles.tileNameBar}>
        <Text style={styles.tileName} numberOfLines={1}>
          {member?.fullname ?? 'Người dùng'}
        </Text>
      </View>
      {isMicOff && (
        <View style={styles.micOffBadge}>
          <FontAwesome name="microphone-slash" size={12} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
}

function MoreMenuItem({
  icon,
  label,
  onPress,
  active,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.moreMenuItem}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View
        style={[
          styles.ctrlBtn,
          active ? styles.ctrlBtnPrimary : styles.ctrlBtnMuted,
        ]}
      >
        <FontAwesome name={icon as any} size={20} color="#fff" />
      </View>
      <Text style={styles.moreMenuLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function CallControlButton({
  icon,
  iconSlash,
  onPress,
  active,
  highlightWhenActive,
  danger,
}: {
  icon: string;
  iconSlash?: boolean;
  onPress: () => void;
  active?: boolean;
  highlightWhenActive?: boolean;
  danger?: boolean;
}) {
  const highlighted = highlightWhenActive && (active ?? false);
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.ctrlBtn,
        danger && styles.ctrlBtnDanger,
        highlighted && styles.ctrlBtnPrimary,
        !danger && !highlighted && styles.ctrlBtnMuted,
      ]}
      activeOpacity={0.8}
    >
      <FontAwesome
        name={icon as any}
        size={danger ? 26 : 22}
        color="#fff"
        style={iconSlash ? { opacity: 0.45 } : undefined}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  headerOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 40,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  headerDuration: {
    color: '#D1D5DB',
    fontSize: 14,
    marginTop: 4,
  },
  mainView: {
    flex: 1,
    backgroundColor: '#000',
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 4,
    justifyContent: 'center',
    alignContent: 'center',
    flexGrow: 1,
  },
  tile: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1C1C2E',
    position: 'relative',
  },
  tileFull: {
    flex: 1,
    width: '100%',
    borderRadius: 0,
  },
  tileAvatarWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
    minHeight: 200,
  },
  tileAvatarLg: {
    width: 128,
    height: 128,
    borderRadius: 64,
  },
  tileAvatarMd: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  tileNameBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  tileName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  micOffBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 4,
  },
  waiting: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  waitingAvatarRing: {
    width: 128,
    height: 128,
    borderRadius: 64,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: PRIMARY,
  },
  waitingAvatar: {
    width: '100%',
    height: '100%',
  },
  waitingName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  waitingHint: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
  },
  localPip: {
    position: 'absolute',
    top: 100,
    right: 12,
    width: 100,
    height: 136,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: PRIMARY,
    backgroundColor: '#1C1C2E',
  },
  pipLabel: {
    position: 'absolute',
    left: 4,
    right: 4,
    bottom: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 4,
    paddingVertical: 2,
  },
  pipLabelText: {
    color: '#fff',
    fontSize: 10,
    textAlign: 'center',
  },
  cameraOffOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 8,
  },
  controls: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 28,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 20,
    paddingHorizontal: 24,
    zIndex: 10,
  },
  moreWrap: {
    position: 'relative',
    alignItems: 'center',
  },
  moreMenu: {
    position: 'absolute',
    bottom: CTRL_SIZE + 12,
    right: 0,
    alignItems: 'flex-end',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.82)',
  },
  moreMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  moreMenuLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    maxWidth: 160,
  },
  ctrlBtn: {
    width: CTRL_SIZE,
    height: CTRL_SIZE,
    borderRadius: CTRL_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctrlBtnPrimary: {
    backgroundColor: PRIMARY,
  },
  ctrlBtnMuted: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  ctrlBtnDanger: {
    backgroundColor: '#EF4444',
  },
});
