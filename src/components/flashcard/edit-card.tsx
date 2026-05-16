import React, { useState } from "react";
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
import { Flashcard } from "../../types/flashcard.type";
import { flashcardService } from "../../service/flashcard.service";

interface EditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: Flashcard;
  onUpdated?: (card: Flashcard) => void;
  onDeleted?: (cardId: string) => void;
}

export default function EditCardModal({
  isOpen,
  onClose,
  card,
  onUpdated,
  onDeleted,
}: EditCardModalProps) {
  const [front, setFront] = useState(card.card_front);
  const [back, setBack] = useState(card.card_back);
  const [hint, setHint] = useState(card.card_hint || "");
  const [tags, setTags] = useState((card.card_tags || []).join(", "));
  const [difficulty, setDifficulty] = useState(String(card.card_difficulty || 3));
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = async () => {
    if (!front.trim() || !back.trim()) {
      Alert.alert("Lỗi", "Mặt trước và mặt sau không được để trống");
      return;
    }
    setIsSaving(true);
    try {
      const cardId = card._id || card.id || "";
      const updated = await flashcardService.updateCard(cardId, {
        card_front: front.trim(),
        card_back: back.trim(),
        card_hint: hint.trim() || undefined,
        card_tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
        card_difficulty: parseInt(difficulty) || 3,
      });
      onUpdated?.(updated);
      onClose();
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Không thể cập nhật thẻ");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert("Xác nhận", "Xóa thẻ này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          setIsDeleting(true);
          try {
            const cardId = card._id || card.id || "";
            await flashcardService.deleteCard(cardId);
            onDeleted?.(cardId);
            onClose();
          } catch (e: any) {
            Alert.alert("Lỗi", e?.message || "Không thể xóa");
          } finally {
            setIsDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <Modal visible={isOpen} transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white dark:bg-gray-800 rounded-t-3xl p-6 max-h-[80%]">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Sửa thẻ
          </Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Mặt trước *
            </Text>
            <TextInput
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white mb-3"
              placeholder="Nội dung mặt trước"
              placeholderTextColor="#9CA3AF"
              value={front}
              onChangeText={setFront}
              multiline
            />
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Mặt sau *
            </Text>
            <TextInput
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white mb-3"
              placeholder="Nội dung mặt sau"
              placeholderTextColor="#9CA3AF"
              value={back}
              onChangeText={setBack}
              multiline
            />
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Gợi ý
            </Text>
            <TextInput
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white mb-3"
              placeholder="Gợi ý (hiển thị khi học)"
              placeholderTextColor="#9CA3AF"
              value={hint}
              onChangeText={setHint}
            />
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tags
            </Text>
            <TextInput
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white mb-3"
              placeholder="tag1, tag2, tag3"
              placeholderTextColor="#9CA3AF"
              value={tags}
              onChangeText={setTags}
            />
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Độ khó (1-5)
            </Text>
            <View className="flex-row mb-4">
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity
                  key={n}
                  className={`w-10 h-10 rounded-full items-center justify-center mr-2 ${
                    parseInt(difficulty) === n ? "bg-primary-500" : "bg-gray-200 dark:bg-gray-700"
                  }`}
                  onPress={() => setDifficulty(String(n))}
                >
                  <Text className={`text-sm ${parseInt(difficulty) === n ? "text-white" : "text-gray-600 dark:text-gray-400"}`}>
                    {n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View className="flex-row gap-3 mt-2">
            <TouchableOpacity
              className="flex-1 py-3 rounded-lg bg-red-500 items-center"
              onPress={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-white font-medium">Xóa</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 py-3 rounded-lg border border-gray-300 dark:border-gray-600 items-center"
              onPress={onClose}
            >
              <Text className="text-gray-700 dark:text-gray-300">Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 py-3 rounded-lg bg-primary-500 items-center"
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-white font-medium">Lưu</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
