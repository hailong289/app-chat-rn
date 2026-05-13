import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  FlatList,
} from 'react-native';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import type { MessageType } from '../../types/message.type';

// EMOJIS list - 6 nhanh + full
const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'];
const FULL_EMOJIS = [
  '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇',
  '🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚',
  '😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥸',
  '🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️',
  '😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡',
  '🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓',
  '🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄',
  '😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵',
  '🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠',
  '👍','👎','👏','🙌','🤝','👊','✊','🤛','🤜','🤞',
  '✌️','🤟','🤘','👌','🤌','🤏','👈','👉','👆','👇',
  '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔',
  '❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️',
  '🔥','⭐','🌟','💫','✨','🎉','🎊','🎈','🎁','🏆',
];

type ReactionPickerProps = {
  visible: boolean;
  message: MessageType | null;
  onReact: (emoji: string) => void;
  onClose: () => void;
};

export const ReactionsPicker: React.FC<ReactionPickerProps> = ({
  visible,
  message,
  onReact,
  onClose,
}) => {
  const [showAll, setShowAll] = useState(false);

  const handleReact = useCallback(
    (emoji: string) => {
      onReact(emoji);
      onClose();
    },
    [onReact, onClose],
  );

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
          <Text style={styles.title}>Phản ứng</Text>

          {/* Quick reactions */}
          <View style={styles.quickRow}>
            {QUICK_EMOJIS.map(em => {
              const isSelected = message?.reactions?.some(
                r => r.emoji === em && r.users.some(u => u._id),
              );
              return (
                <TouchableOpacity
                  key={em}
                  style={[styles.emojiBtn, isSelected && styles.emojiBtnSelected]}
                  onPress={() => handleReact(em)}
                >
                  <Text style={styles.emojiText}>{em}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={styles.emojiBtn}
              onPress={() => setShowAll(v => !v)}
            >
              <FontAwesome
                name={showAll ? 'chevron-up' : 'plus'}
                size={16}
                color="#6b7280"
              />
            </TouchableOpacity>
          </View>

          {/* Full emoji grid */}
          {showAll && (
            <ScrollView style={styles.fullGrid} showsVerticalScrollIndicator={false}>
              <FlatList
                data={FULL_EMOJIS}
                keyExtractor={(em, i) => `${em}-${i}`}
                numColumns={8}
                scrollEnabled={false}
                columnWrapperStyle={styles.gridRow}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.gridEmoji}
                    onPress={() => handleReact(item)}
                  >
                    <Text style={styles.emojiText}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            </ScrollView>
          )}

          {/* Current reactions summary */}
          {message?.reactions && message.reactions.length > 0 && (
            <View style={styles.currentReactions}>
              <Text style={styles.reactionsTitle}>Phản ứng hiện tại</Text>
              <View style={styles.reactionsRow}>
                {message.reactions.map(r => (
                  <View key={r.emoji} style={styles.reactionChip}>
                    <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                    <Text style={styles.reactionCount}>{r.count}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
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
    padding: 20,
    paddingBottom: 36,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  emojiBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  emojiBtnSelected: {
    backgroundColor: '#dbeafe',
  },
  emojiText: {
    fontSize: 26,
  },
  fullGrid: {
    maxHeight: 220,
    marginBottom: 12,
  },
  gridRow: {
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  gridEmoji: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  currentReactions: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
  },
  reactionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  reactionsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  reactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  reactionEmoji: {
    fontSize: 16,
  },
  reactionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
});

export default ReactionsPicker;
