import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { launchImageLibrary } from "react-native-image-picker";
import { flashcardService } from "../../service/flashcard.service";
import { DeckLevel, CreateFlashcardPayload } from "../../types/flashcard.type";

interface CreateDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const DECK_LEVELS: { value: DeckLevel; label: string }[] = [
  { value: "beginner", label: "Cơ bản" },
  { value: "intermediate", label: "Trung cấp" },
  { value: "advanced", label: "Nâng cao" },
  { value: "expert", label: "Chuyên gia" },
];

interface CardFormData {
  card_front: string;
  card_back: string;
  card_hint: string;
  card_tags: string;
  card_difficulty: string;
}

export default function CreateDeckModal({ isOpen, onClose, onCreated }: CreateDeckModalProps) {
  const [step, setStep] = useState<"info" | "cards">("info");
  const [deckName, setDeckName] = useState("");
  const [deckDesc, setDeckDesc] = useState("");
  const [deckLevel, setDeckLevel] = useState<DeckLevel>("beginner");
  const [deckLanguage, setDeckLanguage] = useState("vi");
  const [deckImage, setDeckImage] = useState("");
  const [deckTags, setDeckTags] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState("");
  const [aiTopic, setAiTopic] = useState("");
  const [aiCardCount, setAiCardCount] = useState("10");
  const [aiDifficulty, setAiDifficulty] = useState("3");
  const [useAI, setUseAI] = useState(false);

  // Card creation
  const [cards, setCards] = useState<CardFormData[]>([]);
  const [currentCard, setCurrentCard] = useState<CardFormData>({
    card_front: "",
    card_back: "",
    card_hint: "",
    card_tags: "",
    card_difficulty: "3",
  });
  const [page, setPage] = useState(0);
  const cardsPerPage = 10;

  const [isSaving, setIsSaving] = useState(false);

  const resetForm = () => {
    setStep("info");
    setDeckName("");
    setDeckDesc("");
    setDeckLevel("beginner");
    setDeckLanguage("vi");
    setDeckImage("");
    setDeckTags("");
    setUseAI(false);
    setAiTopic("");
    setAiCardCount("10");
    setAiDifficulty("3");
    setCards([]);
    setCurrentCard({ card_front: "", card_back: "", card_hint: "", card_tags: "", card_difficulty: "3" });
  };

  const handleGenerate = async () => {
    if (!aiTopic.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập chủ đề");
      return;
    }
    setIsGenerating(true);
    setGenProgress("Đang tạo thẻ...");
    try {
      const result = await flashcardService.generateFlashcard(
        {
          topic: aiTopic.trim(),
          card_count: parseInt(aiCardCount) || 10,
          difficulty: parseInt(aiDifficulty) || 3,
        },
        { onChunk: () => setGenProgress((p) => p + ".") },
      );

      // Populate from AI
      if (result.deck_name) setDeckName(result.deck_name);
      if (result.deck_description) setDeckDesc(result.deck_description);
      if (result.deck_level) setDeckLevel(result.deck_level as DeckLevel);
      if (result.deck_language) setDeckLanguage(result.deck_language);
      if (result.deck_tags?.length) setDeckTags(result.deck_tags.join(", "));

      const generatedCards: CardFormData[] = result.flashcards.map((fc) => ({
        card_front: fc.card_front,
        card_back: fc.card_back,
        card_hint: fc.card_hint || "",
        card_tags: (fc.card_tags || []).join(", "),
        card_difficulty: String(fc.card_difficulty || 3),
      }));
      setCards(generatedCards);
      setStep("cards");
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Tạo thất bại");
    } finally {
      setIsGenerating(false);
      setGenProgress("");
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await launchImageLibrary({ mediaType: "photo", selectionLimit: 1 });
      if (result.assets?.[0]?.uri) {
        setDeckImage(result.assets[0].uri);
      }
    } catch {
      Alert.alert("Lỗi", "Không thể chọn ảnh");
    }
  };

  const handleAddCard = () => {
    if (!currentCard.card_front.trim() || !currentCard.card_back.trim()) {
      Alert.alert("Lỗi", "Mặt trước và mặt sau không được để trống");
      return;
    }
    setCards((prev) => [...prev, { ...currentCard }]);
    setCurrentCard({ card_front: "", card_back: "", card_hint: "", card_tags: "", card_difficulty: "3" });
  };

  const handleSave = async () => {
    if (!deckName.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên bộ thẻ");
      return;
    }
    if (cards.length === 0) {
      Alert.alert("Lỗi", "Cần ít nhất 1 thẻ");
      return;
    }
    setIsSaving(true);
    try {
      const flashcards: CreateFlashcardPayload[] = cards.map((c) => ({
        card_front: c.card_front.trim(),
        card_back: c.card_back.trim(),
        card_hint: c.card_hint.trim() || undefined,
        card_tags: c.card_tags ? c.card_tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
        card_difficulty: parseInt(c.card_difficulty) || 3,
      }));

      await flashcardService.createDeck({
        deck_name: deckName.trim(),
        deck_description: deckDesc.trim() || undefined,
        deck_level: deckLevel,
        deck_language: deckLanguage || undefined,
        deck_image: deckImage || undefined,
        deck_tags: deckTags ? deckTags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
        flashcards,
      });
      resetForm();
      onCreated?.();
      onClose();
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Không thể lưu bộ thẻ");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} transparent animationType="slide">
      <View className="flex-1 bg-white dark:bg-gray-900 pt-12">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <TouchableOpacity onPress={() => { resetForm(); onClose(); }}>
            <Text className="text-primary-500 text-base">Hủy</Text>
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">
            {step === "info" ? "Tạo bộ thẻ" : `Thẻ (${cards.length})`}
          </Text>
          {step === "cards" ? (
            <TouchableOpacity onPress={handleSave} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator size="small" color="#42A59F" />
              ) : (
                <Text className="text-primary-500 text-base font-semibold">Lưu</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setStep("cards")} disabled={!deckName.trim()}>
              <Text className={`text-base ${deckName.trim() ? "text-primary-500" : "text-gray-400"}`}>
                Tiếp
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView className="flex-1 px-4 py-4">
          {step === "info" ? (
            <View>
              {/* AI generation toggle */}
              <TouchableOpacity
                className={`p-4 rounded-xl mb-4 border-2 ${useAI ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20" : "border-gray-200 dark:border-gray-700"}`}
                onPress={() => setUseAI(!useAI)}
              >
                <Text className="text-base font-medium text-gray-900 dark:text-white">
                  🤖 Tạo bằng AI
                </Text>
                <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Nhập chủ đề, AI sẽ tạo bộ thẻ cho bạn
                </Text>
              </TouchableOpacity>

              {useAI && (
                <View className="mb-4">
                  <TextInput
                    className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white mb-2"
                    placeholder="Chủ đề (vd: Từ vựng tiếng Anh về động vật)"
                    placeholderTextColor="#9CA3AF"
                    value={aiTopic}
                    onChangeText={setAiTopic}
                  />
                  <View className="flex-row gap-3 mb-2">
                    <View className="flex-1">
                      <Text className="text-xs text-gray-500 mb-1">Số thẻ</Text>
                      <TextInput
                        className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                        keyboardType="numeric"
                        value={aiCardCount}
                        onChangeText={setAiCardCount}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs text-gray-500 mb-1">Độ khó (1-5)</Text>
                      <TextInput
                        className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                        keyboardType="numeric"
                        value={aiDifficulty}
                        onChangeText={setAiDifficulty}
                      />
                    </View>
                  </View>
                  <TouchableOpacity
                    className="py-3 bg-primary-500 rounded-xl items-center"
                    onPress={handleGenerate}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <View className="items-center">
                        <ActivityIndicator color="white" />
                        <Text className="text-white text-xs mt-1">{genProgress}</Text>
                      </View>
                    ) : (
                      <Text className="text-white font-medium">Tạo với AI</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tên bộ thẻ *</Text>
              <TextInput
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white mb-3"
                placeholder="Nhập tên bộ thẻ"
                placeholderTextColor="#9CA3AF"
                value={deckName}
                onChangeText={setDeckName}
              />

              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mô tả</Text>
              <TextInput
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white mb-3"
                placeholder="Mô tả ngắn về bộ thẻ"
                placeholderTextColor="#9CA3AF"
                value={deckDesc}
                onChangeText={setDeckDesc}
                multiline
              />

              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cấp độ</Text>
              <View className="flex-row flex-wrap gap-2 mb-3">
                {DECK_LEVELS.map((l) => (
                  <TouchableOpacity
                    key={l.value}
                    className={`px-4 py-2 rounded-full ${deckLevel === l.value ? "bg-primary-500" : "bg-gray-100 dark:bg-gray-700"}`}
                    onPress={() => setDeckLevel(l.value)}
                  >
                    <Text className={`text-sm ${deckLevel === l.value ? "text-white" : "text-gray-700 dark:text-gray-300"}`}>
                      {l.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ngôn ngữ</Text>
              <TextInput
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white mb-3"
                placeholder="vi, en, ja, ..."
                placeholderTextColor="#9CA3AF"
                value={deckLanguage}
                onChangeText={setDeckLanguage}
              />

              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags (phân cách bằng dấu phẩy)</Text>
              <TextInput
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white mb-3"
                placeholder="toan, vat-ly, ..."
                placeholderTextColor="#9CA3AF"
                value={deckTags}
                onChangeText={setDeckTags}
              />
            </View>
          ) : (
            /* Cards step */
            <View>
              {/* Existing cards */}
              {cards.length > 0 && (
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Thẻ đã thêm ({cards.length})
                  </Text>
                  {cards.slice(page * cardsPerPage, (page + 1) * cardsPerPage).map((card, i) => (
                    <View key={i} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-2">
                      <Text className="text-sm font-medium text-gray-900 dark:text-white">
                        {card.card_front}
                      </Text>
                      <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {card.card_back}
                      </Text>
                      <View className="flex-row mt-2">
                        <TouchableOpacity
                          className="px-2 py-0.5 bg-red-50 dark:bg-red-900/20 rounded"
                          onPress={() => setCards((prev) => prev.filter((_, idx) => idx !== page * cardsPerPage + i))}
                        >
                          <Text className="text-xs text-red-500">Xóa</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}

                  {/* Pagination */}
                  {cards.length > cardsPerPage && (
                    <View className="flex-row justify-center gap-2 mt-2">
                      {Array.from({ length: Math.ceil(cards.length / cardsPerPage) }).map((_, i) => (
                        <TouchableOpacity
                          key={i}
                          className={`w-8 h-8 rounded-full items-center justify-center ${page === i ? "bg-primary-500" : "bg-gray-200 dark:bg-gray-700"}`}
                          onPress={() => setPage(i)}
                        >
                          <Text className={`text-sm ${page === i ? "text-white" : "text-gray-600 dark:text-gray-300"}`}>
                            {i + 1}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Add new card form */}
              <View className="border border-dashed border-primary-300 dark:border-primary-700 rounded-xl p-4">
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Thêm thẻ mới</Text>
                <TextInput
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white mb-2"
                  placeholder="Mặt trước *"
                  placeholderTextColor="#9CA3AF"
                  value={currentCard.card_front}
                  onChangeText={(v) => setCurrentCard((p) => ({ ...p, card_front: v }))}
                />
                <TextInput
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white mb-2"
                  placeholder="Mặt sau *"
                  placeholderTextColor="#9CA3AF"
                  value={currentCard.card_back}
                  onChangeText={(v) => setCurrentCard((p) => ({ ...p, card_back: v }))}
                />
                <TextInput
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white mb-2"
                  placeholder="Gợi ý"
                  placeholderTextColor="#9CA3AF"
                  value={currentCard.card_hint}
                  onChangeText={(v) => setCurrentCard((p) => ({ ...p, card_hint: v }))}
                />
                <View className="flex-row gap-2 mb-2">
                  <View className="flex-1">
                    <TextInput
                      className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                      placeholder="Tags"
                      placeholderTextColor="#9CA3AF"
                      value={currentCard.card_tags}
                      onChangeText={(v) => setCurrentCard((p) => ({ ...p, card_tags: v }))}
                    />
                  </View>
                  <View className="w-20">
                    <TextInput
                      className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-center"
                      placeholder="1-5"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                      value={currentCard.card_difficulty}
                      onChangeText={(v) => setCurrentCard((p) => ({ ...p, card_difficulty: v }))}
                    />
                  </View>
                </View>
                <TouchableOpacity
                  className="py-2 bg-primary-500 rounded-lg items-center"
                  onPress={handleAddCard}
                >
                  <Text className="text-white text-sm font-medium">+ Thêm thẻ</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
