import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import useAuthStore from '@/src/store/useAuth';
import { MESSAGE_BUBBLE_MAX_WIDTH } from './constants/messageConstants';

type ReplyInfo = {
  _id?: string;
  /** Some payloads use `id` instead of `_id` */
  id?: string;
  type: string;
  content?: string;
  isMine?: boolean;
  isDeleted?: boolean;
  /** Web sends isDelete (no d) in some payloads */
  isDelete?: boolean;
  hiddenByMe?: boolean;
  status?: string;
  sender?: {
    _id?: string;
    name?: string;
    fullname?: string;
  };
  attachments?: Array<{ name?: string }>;
};

type ReplyPreviewProps = {
  reply: ReplyInfo;
  onJump?: (id: string) => void;
  onClose?: () => void;
  /** Dùng trong InputBar: hiện nút X để xóa reply */
  showCloseButton?: boolean;
  /** true khi ReplyPreview nằm trên bubble của mình — nền primary nhạt hơn bubble. */
  isMine?: boolean;
};

function getTypeBadgeLabel(type: string): string {
  switch (type) {
    case 'image': return '📷 Ảnh';
    case 'video': return '🎥 Video';
    case 'file': return '📎 File';
    case 'gif': return '🎬 GIF';
    case 'audio': return '🎵 Audio';
    case 'call': return '📞 Cuộc gọi';
    case 'flashcard': return '🃏 Flashcard';
    case 'quiz': return '❓ Quiz';
    case 'document': return '📄 Tài liệu';
    case 'todo_project': return '✅ Todo';
    default: return '';
  }
}

function getPreviewText(reply: ReplyInfo, isReplySentByMe?: boolean): string {
  const isRecalled =
    !!reply.isDeleted || !!reply.isDelete || reply.status === 'recalled';
  const isHidden = !!reply.hiddenByMe;

  if (isHidden) return 'Tin nhắn đã bị ẩn';
  if (isRecalled)
    return isReplySentByMe ? 'Bạn đã thu hồi tin nhắn' : 'Tin nhắn đã bị thu hồi';
  if (reply.type === 'text') {
    if (reply.content && reply.content.trim().length > 0) {
      return reply.content;
    }
    return '[Tin nhắn văn bản]';
  }
  if (reply.type === 'gif') return '🎬 GIF';
  return (
    reply.attachments?.[0]?.name ||
    getTypeBadgeLabel(reply.type) ||
    'File đính kèm'
  );
}

export const ReplyPreview: React.FC<ReplyPreviewProps> = ({
  reply,
  onJump,
  onClose,
  showCloseButton = false,
  isMine = false,
}) => {
  const { user } = useAuthStore();

  if (!reply) return null;

  const isRecalled =
    !!reply.isDeleted || !!reply.isDelete || reply.status === 'recalled';
  const isHidden = !!reply.hiddenByMe;
  const showBadge = reply.type !== 'text' && !isRecalled && !isHidden;

  const currentUserId = user?._id || user?.id || '';
  const isReplySentByMe =
    reply.isMine === true ||
    (!!reply.sender?._id && reply.sender._id === currentUserId);

  const senderName = isReplySentByMe
    ? 'Bạn'
    : reply.sender?.fullname || reply.sender?.name || 'Unknown';
  const previewText = getPreviewText(reply, isReplySentByMe);
  const badgeLabel = showBadge ? getTypeBadgeLabel(reply.type) : '';

  return (
    <TouchableOpacity
      activeOpacity={onJump ? 0.7 : 1}
      onPress={() => onJump?.(reply._id || reply.id || '')}
      className={`flex-row items-stretch rounded-2xl mb-1 overflow-hidden ${
        isMine ? 'bg-primary-500/10' : 'bg-gray-100'
      } ${showCloseButton ? 'w-full' : isMine ? 'self-end' : 'self-start'}`}
      style={showCloseButton ? undefined : { maxWidth: MESSAGE_BUBBLE_MAX_WIDTH }}
    >
      <View className="w-[3px] bg-primary-500" />
      <View className="px-2.5 py-1.5">
        <View className="flex-row items-center mb-0.5 gap-1">
          <FontAwesome
            name="reply"
            size={10}
            color="#42A59F"
            style={{ marginRight: 2 }}
          />
          <Text className="text-xs font-semibold text-black">
            {senderName}
          </Text>
          {!!badgeLabel && (
            <View className="rounded-full px-1.5 py-px ml-1 bg-primary-500/15">
              <Text className="text-[10px] text-black">
                {badgeLabel}
              </Text>
            </View>
          )}
        </View>
        <Text
          className="text-sm leading-[18px] text-black"
          numberOfLines={2}
        >
          {previewText}
        </Text>
      </View>
      {showCloseButton && onClose && (
        <TouchableOpacity
          onPress={onClose}
          className="p-2 justify-center items-center"
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <FontAwesome name="times" size={14} color="#6b7280" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

export default ReplyPreview;
