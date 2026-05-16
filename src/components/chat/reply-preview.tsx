import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import FontAwesome from '@react-native-vector-icons/fontawesome';

type ReplyInfo = {
  _id: string;
  type: string;
  content?: string;
  isMine?: boolean;
  isDeleted?: boolean;
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
};

function getTypeBadge(type: string): string {
  switch (type) {
    case 'image': return '📷 Ảnh';
    case 'video': return '🎥 Video';
    case 'file': return '📎 File';
    case 'gif': return '🎬 GIF';
    case 'audio': return '🎵 Audio';
    default: return '';
  }
}

function getPreviewText(reply: ReplyInfo): string {
  const isRecalled = !!reply.isDeleted || reply.status === 'recalled';
  const isDeleted = !!reply.hiddenByMe;

  if (isDeleted) return 'Tin nhắn đã bị ẩn';
  if (isRecalled) return reply.isMine ? 'Bạn đã thu hồi tin nhắn' : 'Tin nhắn đã bị thu hồi';
  if (reply.type === 'text') return reply.content || '';
  return reply.attachments?.[0]?.name || getTypeBadge(reply.type) || 'File đính kèm';
}

export const ReplyPreview: React.FC<ReplyPreviewProps> = ({
  reply,
  onJump,
  onClose,
  showCloseButton = false,
}) => {
  if (!reply) return null;

  const senderName = reply.isMine
    ? 'Bạn'
    : (reply.sender?.fullname || reply.sender?.name || 'Unknown');
  const previewText = getPreviewText(reply);
  const badge = reply.type !== 'text' ? getTypeBadge(reply.type) : '';

  return (
    <TouchableOpacity
      activeOpacity={onJump ? 0.7 : 1}
      onPress={() => onJump?.(reply._id)}
      style={styles.container}
    >
      <View style={styles.leftBar} />
      <View style={styles.content}>
        <View style={styles.header}>
          <FontAwesome name="reply" size={10} color="#0d9488" style={styles.replyIcon} />
          <Text style={styles.senderName}>{senderName}</Text>
          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.previewText} numberOfLines={2}>
          {previewText}
        </Text>
      </View>
      {showCloseButton && onClose && (
        <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <FontAwesome name="times" size={14} color="#6b7280" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  leftBar: {
    width: 4,
    backgroundColor: '#0d9488',
  },
  content: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 4,
  },
  replyIcon: {
    marginRight: 2,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0d9488',
  },
  badge: {
    backgroundColor: '#dbeafe',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 4,
  },
  badgeText: {
    fontSize: 10,
    color: '#1d4ed8',
  },
  previewText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  closeButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ReplyPreview;
