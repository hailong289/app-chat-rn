import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { Flashcard } from "../../types/flashcard.type";
import { flashcardService } from "../../service/flashcard.service";

interface StudyCardProps {
  cards: Flashcard[];
  onComplete: (results: { mastered: number; partial: number; unknown: number }) => void;
  onClose: () => void;
}

type MasteryLevel = "unknown" | "partial" | "mastered";

export default function StudyCard({ cards, onComplete, onClose }: StudyCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [results, setResults] = useState<MasteryLevel[]>(new Array(cards.length).fill("unknown"));
  const [isFinished, setIsFinished] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const flipAnim = useSharedValue(0);

  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipAnim.value, [0, 1], [0, 180], Extrapolation.CLAMP);
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
      backfaceVisibility: "hidden" as const,
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipAnim.value, [0, 1], [180, 360], Extrapolation.CLAMP);
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
      backfaceVisibility: "hidden" as const,
    };
  });

  const handleFlip = () => {
    setIsFlipped((prev) => !prev);
    flipAnim.value = withTiming(isFlipped ? 0 : 1, { duration: 400 });
  };

  const handleRate = async (level: MasteryLevel) => {
    const newResults = [...results];
    newResults[currentIndex] = level;
    setResults(newResults);

    const card = cards[currentIndex];
    const cardId = card._id || card.id || "";

    // Update progress via API
    if (cardId) {
      setIsUpdating(true);
      try {
        const masteryMap: Record<MasteryLevel, { mastery_level: number; status: string }> = {
          unknown: { mastery_level: 1, status: "learning" },
          partial: { mastery_level: 3, status: "review" },
          mastered: { mastery_level: 5, status: "mastered" },
        };
        const { mastery_level, status } = masteryMap[level];
        await flashcardService.updateProgress(cardId, {
          mastery_level,
          status: status as any,
        });
      } catch {
        // Ignore progress update failures
      } finally {
        setIsUpdating(false);
      }
    }

    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
      flipAnim.value = 0;
    } else {
      setIsFinished(true);
    }
  };

  const finishStudy = () => {
    const masteredCount = results.filter((r) => r === "mastered").length;
    const partialCount = results.filter((r) => r === "partial").length;
    const unknownCount = results.filter((r) => r === "unknown").length;
    onComplete({ mastered: masteredCount, partial: partialCount, unknown: unknownCount });
  };

  if (isFinished) {
    const masteredCount = results.filter((r) => r === "mastered").length;
    const partialCount = results.filter((r) => r === "partial").length;
    const unknownCount = results.filter((r) => r === "unknown").length;

    return (
      <Modal visible transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/50 px-6">
          <View className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full">
            <Text className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
              Kết quả học tập
            </Text>
            <Text className="text-4xl text-center mb-4">🎉</Text>
            <View className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-4">
              <View className="flex-row justify-between py-2 border-b border-gray-200 dark:border-gray-600">
                <Text className="text-green-600 font-medium">Đã thuộc</Text>
                <Text className="text-green-600 font-semibold">{masteredCount}</Text>
              </View>
              <View className="flex-row justify-between py-2 border-b border-gray-200 dark:border-gray-600">
                <Text className="text-yellow-600 font-medium">Một phần</Text>
                <Text className="text-yellow-600 font-semibold">{partialCount}</Text>
              </View>
              <View className="flex-row justify-between py-2">
                <Text className="text-red-500 font-medium">Chưa nhớ</Text>
                <Text className="text-red-500 font-semibold">{unknownCount}</Text>
              </View>
            </View>
            <TouchableOpacity
              className="py-4 bg-primary-500 rounded-xl items-center mb-2"
              onPress={() => {
                onComplete({ mastered: masteredCount, partial: partialCount, unknown: unknownCount });
              }}
            >
              <Text className="text-white text-base font-semibold">Hoàn thành</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  const card = cards[currentIndex];

  return (
    <View className="flex-1 bg-white dark:bg-gray-900 px-4 pt-12">
      {/* Header */}
      <View className="flex-row items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
        <TouchableOpacity onPress={finishStudy}>
          <Text className="text-gray-500 text-base">Kết thúc</Text>
        </TouchableOpacity>
        <Text className="text-base font-medium text-gray-900 dark:text-white">
          {currentIndex + 1} / {cards.length}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Progress bar */}
      <View className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full mt-3 mb-6">
        <View
          className="h-1 bg-primary-500 rounded-full"
          style={{ width: `${((currentIndex) / cards.length) * 100}%` }}
        />
      </View>

      {/* Card */}
      <View className="flex-1 items-center justify-center">
        <TouchableOpacity
          className="w-full aspect-[3/4] max-h-96"
          onPress={handleFlip}
          activeOpacity={1}
        >
          {/* Front */}
          <Animated.View
            className="absolute inset-0 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 items-center justify-center"
            style={frontAnimatedStyle}
          >
            <Text className="text-gray-900 dark:text-white text-xl font-medium text-center leading-relaxed">
              {card.card_front}
            </Text>
            {card.card_hint ? (
              <View className="mt-4 px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                <Text className="text-yellow-700 dark:text-yellow-400 text-sm text-center">
                  Gợi ý: {card.card_hint}
                </Text>
              </View>
            ) : null}
            <Text className="text-gray-400 text-xs mt-4">Chạm để lật</Text>
          </Animated.View>

          {/* Back */}
          <Animated.View
            className="absolute inset-0 bg-primary-50 dark:bg-primary-900/20 rounded-2xl shadow-lg border border-primary-200 dark:border-primary-800 p-6 items-center justify-center"
            style={backAnimatedStyle}
          >
            <Text className="text-gray-900 dark:text-white text-xl font-medium text-center leading-relaxed">
              {card.card_back}
            </Text>
            {card.card_tags && card.card_tags.length > 0 && (
              <View className="flex-row flex-wrap justify-center gap-1 mt-4">
                {card.card_tags.map((tag) => (
                  <View key={tag} className="bg-primary-100 dark:bg-primary-800/30 rounded-full px-3 py-1">
                    <Text className="text-xs text-primary-600 dark:text-primary-400">#{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>
        </TouchableOpacity>

        {/* Rating buttons (visible when flipped) */}
        {isFlipped && (
          <View className="flex-row gap-3 mt-6 w-full px-4">
            <TouchableOpacity
              className="flex-1 py-4 bg-red-500 rounded-xl items-center"
              onPress={() => handleRate("unknown")}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Text className="text-white text-lg">😕</Text>
                  <Text className="text-white text-xs mt-1 font-medium">Chưa nhớ</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 py-4 bg-yellow-500 rounded-xl items-center"
              onPress={() => handleRate("partial")}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Text className="text-white text-lg">🤔</Text>
                  <Text className="text-white text-xs mt-1 font-medium">Một phần</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 py-4 bg-green-500 rounded-xl items-center"
              onPress={() => handleRate("mastered")}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Text className="text-white text-lg">😎</Text>
                  <Text className="text-white text-xs mt-1 font-medium">Đã thuộc</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}
