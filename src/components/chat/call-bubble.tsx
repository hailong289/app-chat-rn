import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import useCallStore, { setCallNavigationRef } from '../../store/useCallStore';
import useAuthStore from '../../store/useAuth';
import Helpers from '../../libs/helpers';

export interface CallHistoryType {
  _id: string;
  call_id: string;
  room_id: string;
  call_type: 'audio' | 'video';
  call_mode?: 'p2p' | 'sfu';
  message_id: string;
  members: any[];
  started_at: string;
  ended_at: string;
  duration: number;
  caller_id?: string;
  callee_id?: string;
}

interface CallBubbleProps {
  callHistory: CallHistoryType;
  isMine: boolean;
}

export default function CallBubble({ callHistory, isMine }: CallBubbleProps) {
  const currentUser = useAuthStore((s) => s.user);
  const { openCall, socket } = useCallStore();

  const isVideoCall = callHistory.call_type === 'video';
  const isGroupCall = callHistory.members.length > 2;
  const callMode = callHistory.call_mode || 'sfu';

  const currentMember = callHistory.members.find((m) => m.id === currentUser?.id);
  const otherMember = callHistory.members.find((m) => m.id !== currentUser?.id);

  // Determine status label
  const hasActiveMember = callHistory.members.some(
    (m) => m.status === 'accepted' || m.status === 'joined',
  );
  const isCallOngoing = !callHistory.ended_at || hasActiveMember;

  let statusLabel = 'Cuộc gọi đã kết thúc';
  let statusColor = '#AAB0BD';
  let statusIcon = isVideoCall ? '🎥' : '📞';

  if (isCallOngoing) {
    statusLabel = 'Đang diễn ra';
    statusColor = '#22C55E';
  } else if (
    currentMember?.status === 'missed' ||
    currentMember?.status === 'rejected'
  ) {
    statusLabel = currentMember.status === 'missed' ? 'Cuộc gọi nhỡ' : 'Đã từ chối';
    statusColor = '#EF4444';
    statusIcon = '📵';
  } else if (currentMember?.status === 'cancelled') {
    statusLabel = 'Đã hủy';
    statusColor = '#F59E0B';
  }

  // Title
  let title = isVideoCall ? 'Video Call' : 'Voice Call';
  if (isGroupCall) title = 'Cuộc gọi nhóm';

  const memberInfo = isGroupCall
    ? `${callHistory.members.length} thành viên`
    : otherMember?.fullname ?? 'Người dùng';

  const handleJoinCall = () => {
    if (!currentUser || !socket) return;
    const memberList = callHistory.members.map((m) => ({
      id: m.id,
      fullname: m.fullname,
      avatar: m.avatar,
      is_caller: m.id === callHistory.caller_id,
      status: m.status,
    }));
    openCall({
      roomId: callHistory.room_id,
      mode: callHistory.call_type,
      members: memberList,
      currentUser,
      socket,
      callMode,
    });
  };

  return (
    <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
      {/* Icon + title */}
      <View style={styles.header}>
        <Text style={styles.icon}>{statusIcon}</Text>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.memberInfo} numberOfLines={1}>
            {memberInfo}
          </Text>
        </View>
      </View>

      {/* Status + duration */}
      <View style={styles.statusRow}>
        <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
        {callHistory.duration > 0 && (
          <Text style={styles.duration}>
            · {Helpers.formatVideoDuration(callHistory.duration)}
          </Text>
        )}
      </View>

      {/* Join / Rejoin button */}
      {(isCallOngoing || !callHistory.ended_at) && (
        <TouchableOpacity style={styles.joinBtn} onPress={handleJoinCall}>
          <Text style={styles.joinText}>
            {currentMember?.status === 'accepted' ? 'Tham gia lại' : 'Tham gia'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    borderRadius: 14,
    padding: 12,
    maxWidth: 260,
    minWidth: 180,
  },
  bubbleMine: {
    backgroundColor: '#42A59F22',
    borderWidth: 1,
    borderColor: '#42A59F55',
  },
  bubbleOther: {
    backgroundColor: '#2A2A3E',
    borderWidth: 1,
    borderColor: '#3A3A4E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  icon: {
    fontSize: 28,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  memberInfo: {
    color: '#AAB0BD',
    fontSize: 12,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  duration: {
    color: '#AAB0BD',
    fontSize: 12,
  },
  joinBtn: {
    backgroundColor: '#42A59F',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  joinText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
