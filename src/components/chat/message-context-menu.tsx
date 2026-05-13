import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import Clipboard from '@react-native-clipboard/clipboard';
import type { MessageType } from '../../types/message.type';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

type ContextAction =
  | 'reply'
  | 'react'
  | 'copy'
  | 'pin'
  | 'forward'
  | 'delete'
  | 'recall'
  | 'translate'
  | 'summarize';

type MessageContextMenuProps = {
  visible: boolean;
  message: MessageType | null;
  isMine: boolean;
  onClose: () => void;
  onReply?: () => void;
  onReact?: (emoji: string) => void;
  onOpenReactionPicker?: () => void;
  onCopy?: () => void;
  onPin?: () => void;
  onForward?: () => void;
  onDelete?: () => void;
  onRecall?: () => void;
  onTranslate?: () => void;
  onSummarize?: () => void;
};

const RECALL_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

export const MessageContextMenu: React.FC<MessageContextMenuProps> = ({
  visible,
  message,
  isMine,
  onClose,
  onReply,
  onReact,
  onOpenReactionPicker,
  onCopy,
  onPin,
  onForward,
  onDelete,
  onRecall,
  onTranslate,
  onSummarize,
}) => {
  if (!message) return null;

  const canRecall =
    isMine &&
    !message.isDeleted &&
    Date.now() - new Date(message.createdAt).getTime() < RECALL_WINDOW_MS;

  const canTranslate = message.type === 'text' && !!message.content;
  const canSummarize =
    message.type === 'file' ||
    (message.attachments?.length ?? 0) > 0;

  const handleCopy = useCallback(() => {
    if (message.content) {
      Clipboard.setString(message.content);
    }
    onCopy?.();
    onClose();
  }, [message.content, onCopy, onClose]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Xóa tin nhắn',
      'Tin nhắn sẽ bị ẩn với bạn. Bạn có chắc không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            onDelete?.();
            onClose();
          },
        },
      ],
    );
  }, [onDelete, onClose]);

  const handleRecall = useCallback(() => {
    Alert.alert(
      'Thu hồi tin nhắn',
      'Tin nhắn sẽ bị thu hồi với tất cả mọi người. Bạn có chắc không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Thu hồi',
          style: 'destructive',
          onPress: () => {
            onRecall?.();
            onClose();
          },
        },
      ],
    );
  }, [onRecall, onClose]);

  const menuItems = [
    onReply && {
      key: 'reply',
      icon: 'reply',
      label: 'Trả lời',
      onPress: () => { onReply(); onClose(); },
    },
    message.type === 'text' && onCopy && {
      key: 'copy',
      icon: 'copy',
      label: 'Sao chép',
      onPress: handleCopy,
    },
    onPin && {
      key: 'pin',
      icon: message.pinned ? 'thumb-tack' : 'thumb-tack',
      label: message.pinned ? 'Bỏ ghim' : 'Ghim',
      onPress: () => { onPin(); onClose(); },
    },
    onForward && {
      key: 'forward',
      icon: 'share',
      label: 'Chuyển tiếp',
      onPress: () => { onForward(); onClose(); },
    },
    canTranslate && onTranslate && {
      key: 'translate',
      icon: 'language',
      label: 'Dịch',
      onPress: () => { onTranslate(); onClose(); },
    },
    canSummarize && onSummarize && {
      key: 'summarize',
      icon: 'file-text-o',
      label: 'Tóm tắt',
      onPress: () => { onSummarize(); onClose(); },
    },
    canRecall && {
      key: 'recall',
      icon: 'undo',
      label: 'Thu hồi',
      danger: true,
      onPress: handleRecall,
    },
    onDelete && {
      key: 'delete',
      icon: 'trash-o',
      label: 'Xóa (với tôi)',
      danger: true,
      onPress: handleDelete,
    },
  ].filter(Boolean) as Array<{
    key: string;
    icon: string;
    label: string;
    danger?: boolean;
    onPress: () => void;
  }>;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.sheet}>
          {/* Quick emoji reactions */}
          <View style={styles.quickReactions}>
            {QUICK_EMOJIS.map(em => (
              <TouchableOpacity
                key={em}
                onPress={() => { onReact?.(em); onClose(); }}
                style={styles.emojiBtn}
              >
                <Text style={styles.emoji}>{em}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.emojiBtn}
              onPress={() => { onOpenReactionPicker?.(); onClose(); }}
            >
              <FontAwesome name="plus-circle" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Action items */}
          {menuItems.map(item => (
            <TouchableOpacity
              key={item.key}
              style={styles.menuItem}
              onPress={item.onPress}
            >
              <FontAwesome
                name={item.icon as any}
                size={17}
                color={item.danger ? '#ef4444' : '#374151'}
                style={styles.menuIcon}
              />
              <Text
                style={[styles.menuLabel, item.danger && styles.menuLabelDanger]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  quickReactions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  emojiBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  emoji: {
    fontSize: 26,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  menuIcon: {
    width: 28,
  },
  menuLabel: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  menuLabelDanger: {
    color: '#ef4444',
  },
});

export default MessageContextMenu;
