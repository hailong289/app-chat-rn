import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Vibration,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import useCallStore from '../../store/useCallStore';
import { IncomingCallPayload, CallMember } from '../../types/call.state';

const RING_TIMEOUT_MS = 45_000;

interface Props {
  visible: boolean;
  payload: IncomingCallPayload;
}

function IncomingCallModal({ visible, payload }: Props) {
  const { acceptIncomingCall, rejectIncomingCall, missIncomingCall } =
    useCallStore();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const missTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const caller = payload.members.find(
    (m: CallMember) => m.id === payload.actionUserId,
  ) ?? payload.members[0];

  const callTypeLabel =
    payload.callType === 'video' ? 'Cuộc gọi video' : 'Cuộc gọi thoại';
  const isGroup = payload.members.length > 2;

  // Pulse animation on avatar
  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, pulseAnim]);

  // Vibrate while ringing
  useEffect(() => {
    if (!visible) return;
    const pattern = [0, 400, 200, 400];
    Vibration.vibrate(pattern, true);
    return () => Vibration.cancel();
  }, [visible]);

  // Auto-miss timeout (server also handles this at 30s, FE at 45s as fallback)
  useEffect(() => {
    if (!visible) return;
    const elapsed = Date.now() - payload.receivedAt;
    const remaining = Math.max(0, RING_TIMEOUT_MS - elapsed);
    missTimerRef.current = setTimeout(() => {
      missIncomingCall();
    }, remaining);
    return () => {
      if (missTimerRef.current) clearTimeout(missTimerRef.current);
    };
  }, [visible, payload.receivedAt, missIncomingCall]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <Text style={styles.callTypeText}>{callTypeLabel} đến</Text>
          {isGroup && (
            <Text style={styles.groupLabel}>Cuộc gọi nhóm</Text>
          )}

          {/* Caller avatar */}
          <Animated.View
            style={[styles.avatarContainer, { transform: [{ scale: pulseAnim }] }]}
          >
            {caller?.avatar ? (
              <FastImage
                style={styles.avatar}
                source={{ uri: caller.avatar, priority: FastImage.priority.high }}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>
                  {(caller?.fullname ?? '?')[0].toUpperCase()}
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Caller name */}
          <Text style={styles.callerName}>
            {isGroup
              ? `${caller?.fullname ?? 'Nhóm'} và ${payload.members.length - 1} người khác`
              : caller?.fullname ?? 'Người dùng'}
          </Text>
          <Text style={styles.callingLabel}>Đang gọi...</Text>

          {/* Action buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={rejectIncomingCall}
              accessibilityLabel="Từ chối"
            >
              <Text style={styles.actionIcon}>✕</Text>
              <Text style={styles.actionLabel}>Từ chối</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.acceptBtn]}
              onPress={acceptIncomingCall}
              accessibilityLabel="Chấp nhận"
            >
              <Text style={styles.actionIcon}>📞</Text>
              <Text style={styles.actionLabel}>Chấp nhận</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Root-level wrapper: renders IncomingCallModal when `incomingCall` is set.
 * Mount this once near the root of the app (inside AppNavigator).
 */
export default function IncomingCallOverlay() {
  const incomingCall = useCallStore((s) => s.incomingCall);
  if (!incomingCall) return null;
  return <IncomingCallModal visible={true} payload={incomingCall} />;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#1C1C2E',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 28,
    paddingBottom: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  callTypeText: {
    color: '#AAB0BD',
    fontSize: 14,
    marginBottom: 4,
  },
  groupLabel: {
    color: '#42A59F',
    fontSize: 12,
    marginBottom: 8,
  },
  avatarContainer: {
    marginVertical: 20,
    shadowColor: '#42A59F',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#42A59F',
  },
  avatarFallback: {
    backgroundColor: '#2D2D42',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '700',
  },
  callerName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  callingLabel: {
    color: '#AAB0BD',
    fontSize: 14,
    marginTop: 6,
    marginBottom: 36,
  },
  actions: {
    flexDirection: 'row',
    gap: 40,
    justifyContent: 'center',
  },
  actionBtn: {
    alignItems: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
  },
  acceptBtn: {
    backgroundColor: '#22C55E',
  },
  rejectBtn: {
    backgroundColor: '#EF4444',
  },
  actionIcon: {
    fontSize: 26,
  },
  actionLabel: {
    color: '#fff',
    fontSize: 11,
    marginTop: 4,
    position: 'absolute',
    bottom: -22,
    width: 80,
    textAlign: 'center',
  },
});
