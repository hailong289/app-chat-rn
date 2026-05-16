import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { flashcardService } from "../../service/flashcard.service";
import { FlashcardDeck } from "../../types/flashcard.type";

const levelLabels: Record<string, string> = {
  beginner: "Cơ bản",
  intermediate: "Trung cấp",
  advanced: "Nâng cao",
  expert: "Chuyên gia",
};

const levelColors: Record<string, string> = {
  beginner: "#10B981",
  intermediate: "#3B82F6",
  advanced: "#8B5CF6",
  expert: "#EF4444",
};

export default function DeckListPage() {
  const navigation = useNavigation<any>();
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchDecks = useCallback(async (pageNum = 1) => {
    if (loading) return;
    setLoading(true);
    try {
      const data = await flashcardService.getListDeck();
      const list = Array.isArray(data) ? data : data?.data || [];
      if (pageNum === 1) {
        setDecks(list);
      } else {
        setDecks((prev) => [...prev, ...list]);
      }
      setHasMore(list.length >= 10);
      setPage(pageNum);
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Không thể tải danh sách bộ thẻ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDecks();
  }, []);

  const handleDelete = (deck: FlashcardDeck) => {
    Alert.alert("Xác nhận", `Xóa bộ thẻ "${deck.deck_name}"?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await flashcardService.deleteDeck(deck.deck_id || deck._id || "");
            setDecks((prev) => prev.filter((d) => d.deck_id !== deck.deck_id && d._id !== deck._id));
          } catch (e: any) {
            Alert.alert("Lỗi", e?.message || "Không thể xóa");
          }
        },
      },
    ]);
  };

  const renderProgressBar = (deck: FlashcardDeck) => {
    const p = deck.progress;
    if (!p || p.total_cards === 0) return null;
    const mastered = (p.mastered_cards / p.total_cards) * 100;
    const review = (p.review_cards / p.total_cards) * 100;
    const learning = (p.learning_cards / p.total_cards) * 100;
    const newCards = (p.new_cards / p.total_cards) * 100;

    return (
      <View className="mt-2">
        <View className="flex-row h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
          {mastered > 0 && <View className="bg-green-500" style={{ width: `${mastered}%` }} />}
          {review > 0 && <View className="bg-blue-500" style={{ width: `${review}%` }} />}
          {learning > 0 && <View className="bg-yellow-500" style={{ width: `${learning}%` }} />}
          {newCards > 0 && <View className="bg-gray-400" style={{ width: `${newCards}%` }} />}
        </View>
        <View className="flex-row justify-between mt-1">
          <Text className="text-xs text-gray-500">{p.mastered_cards} thuần thục</Text>
          <Text className="text-xs text-gray-500">{p.total_cards} thẻ</Text>
        </View>
      </View>
    );
  };

  const renderDeck = ({ item }: { item: FlashcardDeck }) => (
    <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 shadow-sm border border-gray-100 dark:border-gray-700">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-900 dark:text-white">{item.deck_name}</Text>
          {item.deck_description ? (
            <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1" numberOfLines={2}>
              {item.deck_description}
            </Text>
          ) : null}
        </View>
        {item.deck_level && (
          <View
            className="px-2 py-0.5 rounded-full ml-2"
            style={{ backgroundColor: (levelColors[item.deck_level] || "#6B7280") + "20" }}
          >
            <Text className="text-xs" style={{ color: levelColors[item.deck_level] || "#6B7280" }}>
              {levelLabels[item.deck_level] || item.deck_level}
            </Text>
          </View>
        )}
      </View>

      {/* Tags */}
      {item.deck_tags && item.deck_tags.length > 0 && (
        <View className="flex-row flex-wrap gap-1 mt-2">
          {item.deck_tags.slice(0, 5).map((tag) => (
            <View key={tag} className="bg-gray-100 dark:bg-gray-700 rounded-full px-2 py-0.5">
              <Text className="text-xs text-gray-600 dark:text-gray-400">#{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {renderProgressBar(item)}

      <View className="flex-row items-center mt-3">
        <Text className="text-xs text-gray-400">
          {item.total_cards || item.flashcards?.length || 0} thẻ
        </Text>
        {item.deck_language && (
          <Text className="text-xs text-gray-400 ml-3">{item.deck_language}</Text>
        )}
      </View>

      {/* Actions */}
      <View className="flex-row justify-end mt-3 gap-2 border-t border-gray-100 dark:border-gray-700 pt-3">
        <TouchableOpacity
          className="px-4 py-2 bg-primary-500 rounded-xl"
          onPress={() => navigation.navigate("FlashcardStudy", { deckId: item.deck_id || item._id, deck: item })}
        >
          <Text className="text-white text-sm font-medium">Học</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl"
          onPress={() => navigation.navigate("FlashcardView", { deckId: item.deck_id || item._id })}
        >
          <Text className="text-gray-700 dark:text-gray-300 text-sm">Xem</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl"
          onPress={() => navigation.navigate("FlashcardEdit", { deckId: item.deck_id || item._id })}
        >
          <Text className="text-gray-700 dark:text-gray-300 text-sm">Sửa</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-xl"
          onPress={() => handleDelete(item)}
        >
          <Text className="text-red-500 text-sm">Xóa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-xl font-bold text-gray-900 dark:text-white">Bộ thẻ</Text>
        <TouchableOpacity
          className="px-4 py-2 bg-primary-500 rounded-xl"
          onPress={() => navigation.navigate("FlashcardCreate")}
        >
          <Text className="text-white text-sm font-medium">+ Tạo bộ thẻ</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={decks}
        renderItem={renderDeck}
        keyExtractor={(item) => item.deck_id || item._id || ""}
        contentContainerClassName="px-4 pb-8"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => fetchDecks(1)} />}
        onEndReached={() => hasMore && fetchDecks(page + 1)}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          !loading ? (
            <View className="items-center justify-center py-16">
              <Text className="text-5xl mb-4">🃏</Text>
              <Text className="text-gray-500 dark:text-gray-400 text-center">
                Chưa có bộ thẻ nào{"\n"}Tạo bộ thẻ đầu tiên để bắt đầu học!
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}
