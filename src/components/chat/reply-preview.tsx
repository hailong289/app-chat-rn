import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import FontAwesome from '@react-native-vector-icons/fontawesome';

type ReplyInfo = {
  _id: string;
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
  /**
   * true khi ReplyPreview nằm trong bubble của mình (primary bg).
   * Sẽ dùng nền tối + text sáng để tạo contrast.
   */
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
    default: return '';
  }
}

function getPreviewText(reply: ReplyInfo): string {
  const isRecalled =
    !!reply.isDeleted || !!reply.isDelete || reply.status === 'recalled';
  const isHidden = !!reply.hiddenByMe;

  if (isHidden) return 'Tin nhắn đã bị ẩn';
  if (isRecalled)
    return reply.isMine ? 'Bạn đã thu hồi tin nhắn' : 'Tin nhắn đã bị thu hồi';
  if (reply.type === 'text') return reply.content || '';
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
  if (!reply) return null;

  const isRecalled =
    !!reply.isDeleted || !!reply.isDelete || reply.status === 'recalled';
  const isHidden = !!reply.hiddenByMe;
  const showBadge = reply.type !== 'text' && !isRecalled && !isHidden;

  const senderName = reply.isMine
    ? 'Bạn'
    : reply.sender?.fullname || reply.sender?.name || 'Unknown';
  const previewText = getPreviewText(reply);
  const badgeLabel = showBadge ? getTypeBadgeLabel(reply.type) : '';

  return (
    <TouchableOpacity
      activeOpacity={onJump ? 0.7 : 1}
      onPress={() => onJump?.(reply._id)}
      style={[
        styles.container,
        isMine ? styles.containerMine : styles.containerOther,
      ]}
    >
      <View
        style={[
          styles.leftBar,
          isMine ? styles.leftBarMine : styles.leftBarOther,
        ]}
      />
      <View style={styles.content}>
        <View style={styles.header}>
          <FontAwesome
            name="reply"
            size={10}
            color={isMine ? '#a5f3fc' : '#0d9488'}
            style={styles.replyIcon}
          />
          <Text style={[styles.senderName, isMine && styles.senderNameMine]}>
            {senderName}
          </Text>
          {!!badgeLabel && (
            <View style={[styles.badge, isMine && styles.badgeMine]}>
              <Text style={[styles.badgeText, isMine && styles.badgeTextMine]}>
                {badgeLabel}
              </Text>
            </View>
          )}
        </View>
        <Text
          style={[styles.previewText, isMine && styles.previewTextMine]}
          numberOfLines={2}
        >
          {previewText}
        </Text>
      </View>
      {showCloseButton && onClose && (
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <FontAwesome
            name="times"
            size={14}
            color={isMine ? '#cbd5e1' : '#6b7280'}
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 8,
    marginBottom: 4,
    overflow: 'hidden',
  },
  /** Bubble của người khác: nền xanh lá nhạt (teal) */
  containerOther: {
    backgroundColor: '#f0fdf4',
  },
  /** Bubble của mình: nền trắng mờ trên nền primary */
  containerMine: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  leftBar: {
    width: 3,
  },
  leftBarOther: {
    backgroundColor: '#0d9488',
  },
  leftBarMine: {
    backgroundColor: '#a5f3fc',
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
  senderNameMine: {
    color: '#a5f3fc',
  },
  /** Badge màu primary (tím) — nhất quán với web bg-primary-100 text-primary-700 */
  badge: {
    backgroundColor: '#ede9fe',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 4,
  },
  badgeMine: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  badgeText: {
    fontSize: 10,
    color: '#6d28d9',
  },
  badgeTextMine: {
    color: '#e0e7ff',
  },
  previewText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  previewTextMine: {
    color: 'rgba(255,255,255,0.85)',
  },
  closeButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ReplyPreview;
