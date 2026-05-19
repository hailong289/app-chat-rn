import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import useCallStore from '../../store/useCallStore';
import useAuthStore from '../../store/useAuth';
import Helpers from '../../libs/helpers';
import type { CallHistoryType } from '../../types/message.type';

interface CallBubbleProps {
  callHistory: CallHistoryType;
  isMine: boolean;
}

export default function CallBubble({ callHistory, isMine }: CallBubbleProps) {
  const currentUser = useAuthStore((s) => s.user);
  const { openCall, socket } = useCallStore();

  const members = callHistory.members ?? [];
  const isVideoCall = callHistory.call_type === 'video';
  const isGroupCall = members.length > 2;
  const callMode = callHistory.call_mode || 'sfu';

  const currentMember = members.find((m) => m.id === currentUser?.id);
  const otherMember = members.find((m) => m.id !== currentUser?.id);

  // ── Status ──────────────────────────────────────────────────────────
  const myStatus = currentMember?.status;
  const isStarted = ['started', 'accepted'].includes(myStatus || '');
  const isPending = ['initiated', 'pending'].includes(myStatus || '');

  let statusLabel = 'Cuộc gọi đã kết thúc';
  let statusColorClass = 'text-gray-500';
  let iconBgClass = 'bg-gray-100';
  let iconName = isVideoCall ? 'video' : 'phone';
  let iconColor = '#6B7280';

  if (isPending) {
    statusLabel = 'Đang chờ...';
    statusColorClass = 'text-yellow-600';
    iconBgClass = 'bg-yellow-100';
    iconName = isVideoCall ? 'video' : 'phone';
    iconColor = '#CA8A04';
  } else if (isStarted) {
    statusLabel = 'Đang diễn ra';
    statusColorClass = 'text-green-600';
    iconBgClass = 'bg-green-100';
    iconName = isVideoCall ? 'video' : 'phone';
    iconColor = '#16A34A';
  } else if (['missed', 'rejected'].includes(myStatus || '')) {
    statusLabel = 'Cuộc gọi nhỡ';
    statusColorClass = 'text-red-600';
    iconBgClass = 'bg-red-100';
    iconName = 'phone-slash';
    iconColor = '#DC2626';
  } else if (myStatus === 'cancelled') {
    statusLabel = 'Đã hủy';
    statusColorClass = 'text-yellow-600';
    iconBgClass = 'bg-yellow-100';
    iconName = isVideoCall ? 'video' : 'phone';
    iconColor = '#CA8A04';
  }

  // ── Title ───────────────────────────────────────────────────────────
  let title = isVideoCall ? 'Video Call' : 'Voice Call';
  if (isGroupCall) title = 'Cuộc gọi nhóm';

  const subtitle = isGroupCall
    ? `${members.length} thành viên`
    : otherMember?.fullname ?? 'Người dùng';

  // ── Ongoing detection (matches web) ─────────────────────────────────
  const hasActiveMember = members.some(
    (m) =>
      m.id !== currentUser?.id &&
      ['started', 'accepted'].includes(m.status),
  );
  const isCallOngoing = !callHistory.ended_at || hasActiveMember;
  const hasLeftMidCall = myStatus === 'ended';

  // ── Join handler ────────────────────────────────────────────────────
  const handleJoinCall = useCallback(() => {
    if (!currentUser || !socket) return;
    const memberList = members.map((m) => ({
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
  }, [callHistory, currentUser, socket, openCall, callMode]);

  // ── Render ──────────────────────────────────────────────────────────
  const bubbleBg = isMine
    ? 'bg-primary-500/10 border border-primary-500/20'
    : 'bg-gray-100 border border-gray-200';

  const titleColor = isMine
    ? 'text-primary-900'
    : 'text-typography-950';

  const subtitleColor = isMine
    ? 'text-primary-700/70'
    : 'text-typography-500';

  return (
    <View className={`rounded-2xl p-3 max-w-[280px] min-w-[180px] ${bubbleBg}`}>
      {/* Icon + Title */}
      <View className="flex-row items-center gap-3 mb-2">
        <View className={`p-2.5 rounded-full ${iconBgClass}`}>
          <FontAwesome6 name={iconName as any} iconStyle="solid" size={20} color={iconColor} />
        </View>
        <View className="flex-1 min-w-0">
          <Text className={`text-sm font-semibold ${titleColor}`} numberOfLines={1}>
            {title}
          </Text>
          <Text className={`text-xs ${subtitleColor}`} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </View>

      {/* Status + duration */}
      <View className="flex-row items-center gap-1.5 mb-2">
        <Text className={`text-xs font-medium ${statusColorClass}`}>{statusLabel}</Text>
        {callHistory.duration > 0 && (
          <>
            <Text className="text-xs text-gray-400">·</Text>
            <Text className="text-xs text-gray-500">
              {Helpers.formatVideoDuration(callHistory.duration)}
            </Text>
          </>
        )}
      </View>

      {/* Join / Rejoin button (group calls only, matches web condition) */}
      {isGroupCall && isCallOngoing && !isStarted && (
        <TouchableOpacity
          className="bg-primary-500 rounded-lg py-1.5 px-4 self-start"
          onPress={handleJoinCall}
        >
          <Text className="text-white text-xs font-semibold">
            {hasLeftMidCall ? 'Tham gia lại' : 'Tham gia'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
