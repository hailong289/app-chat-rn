import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { FlashcardDeck } from '@/src/types/flashcard.type';
import { flashcardService } from '@/src/service/flashcard.service';

interface FlashcardDeckMessageCardProps {
  deck: FlashcardDeck;
  isSender?: boolean;
}

export const FlashcardDeckMessageCard: React.FC<FlashcardDeckMessageCardProps> = ({
  deck,
  isSender = false,
}) => {
  const navigation = useNavigation<any>();
  const [isCloning, setIsCloning] = useState(false);
  const [hasCloned, setHasCloned] = useState(false);

  const handleClone = async () => {
    if (isCloning || hasCloned || isSender) return;
    try {
      setIsCloning(true);
      await flashcardService.cloneDeck(deck.deck_id);
      setHasCloned(true);
      Alert.alert('Thành công', 'Đã lưu bộ thẻ thành công!');
    } catch (error) {
      console.error('Lỗi khi lưu bộ thẻ:', error);
      Alert.alert('Lỗi', 'Không thể lưu bộ thẻ. Vui lòng thử lại.');
    } finally {
      setIsCloning(false);
    }
  };

  const handleOpenDeck = () => {
    navigation.navigate('DeckDetail', { deckId: deck.deck_id });
  };

  return (
    <View className="w-80 rounded-2xl border-2 border-secondary/25 bg-white mb-4 overflow-hidden">
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 pt-4 pb-3 border-b border-gray-100">
        <View className="w-10 h-10 rounded-xl items-center justify-center bg-purple-100">
          <Text className="text-lg">📚</Text>
        </View>
        <View className="flex-1">
          <Text className="text-[10px] font-bold uppercase tracking-widest text-purple-600 mb-0.5">
            Bộ Thẻ Ghi Nhớ
          </Text>
          <Text className="text-sm font-bold text-gray-900 truncate">
            {deck.deck_name}
          </Text>
        </View>
        <View className="bg-purple-100 rounded-full px-2 py-0.5">
          <Text className="text-[10px] font-semibold text-purple-600">
            {deck.deck_level || 'beginner'}
          </Text>
        </View>
      </View>

      {/* Body */}
      <View className="px-4 py-3 gap-2">
        <Text className="text-xs text-gray-600 line-clamp-2">
          {deck.deck_description || 'Không có mô tả'}
        </Text>

        <View className="flex-row items-center gap-2 pt-0.5">
          <View className="flex-row items-center gap-1 bg-gray-100 rounded-full px-2 py-1">
            <Text className="font-bold text-xs text-gray-700">{deck.total_cards || 0}</Text>
            <Text className="text-xs text-gray-500">thẻ</Text>
          </View>
          {deck.deck_tags && deck.deck_tags.length > 0 && (
            <View className="flex-row items-center gap-1 bg-purple-100 rounded-full px-2 py-1 max-w-[120px]">
              <Text className="text-xs text-purple-600 truncate">{deck.deck_tags[0]}</Text>
              {deck.deck_tags.length > 1 && (
                <Text className="text-xs text-purple-400">+{deck.deck_tags.length - 1}</Text>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Footer */}
      <TouchableOpacity
        className="flex-row items-center justify-between px-4 py-2.5 border-t border-purple-100 bg-purple-50 active:opacity-80"
        onPress={isSender ? handleOpenDeck : handleClone}
        disabled={isCloning}
      >
        {!isSender ? (
          <View className="flex-row items-center gap-1.5">
            {isCloning ? (
              <ActivityIndicator size="small" color="#9333ea" />
            ) : hasCloned ? (
              <Text className="text-green-600 text-xs font-semibold">✓ Đã lưu</Text>
            ) : (
              <Text className="text-purple-600 text-xs font-semibold">💾 Lưu bộ thẻ</Text>
            )}
          </View>
        ) : (
          <Text className="text-xs font-semibold text-purple-600">Bộ thẻ của bạn</Text>
        )}
        <Text className="text-xs text-purple-400">Xem →</Text>
      </TouchableOpacity>
    </View>
  );
};

export default FlashcardDeckMessageCard;
