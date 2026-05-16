import React from "react";
import { View, Text } from "react-native";

interface ProgressTrackingProps {
  progress?: {
    new_cards: number;
    learning_cards: number;
    review_cards: number;
    mastered_cards: number;
    total_cards: number;
  };
  totalCards?: number;
}

const statusLabels: Record<string, string> = {
  new_cards: "Mới",
  learning_cards: "Đang học",
  review_cards: "Ôn tập",
  mastered_cards: "Thuần thục",
};

const statusColors: Record<string, string> = {
  new_cards: "#9CA3AF",
  learning_cards: "#F59E0B",
  review_cards: "#3B82F6",
  mastered_cards: "#10B981",
};

export default function ProgressTracking({ progress, totalCards }: ProgressTrackingProps) {
  if (!progress && !totalCards) {
    return (
      <View className="items-center py-4">
        <Text className="text-gray-500 dark:text-gray-400 text-sm">Chưa có dữ liệu tiến trình</Text>
      </View>
    );
  }

  const total = progress?.total_cards || totalCards || 1;
  const items = progress
    ? [
        { key: "mastered_cards", value: progress.mastered_cards },
        { key: "review_cards", value: progress.review_cards },
        { key: "learning_cards", value: progress.learning_cards },
        { key: "new_cards", value: progress.new_cards },
      ]
    : [];

  const masteryPercentage = progress
    ? Math.round((progress.mastered_cards / Math.max(progress.total_cards, 1)) * 100)
    : 0;

  return (
    <View className="bg-white dark:bg-gray-800 rounded-xl p-4">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-base font-semibold text-gray-900 dark:text-white">
          Tiến trình học tập
        </Text>
        <View className="bg-green-100 dark:bg-green-900/30 rounded-full px-3 py-1">
          <Text className="text-sm font-semibold text-green-600 dark:text-green-400">
            {masteryPercentage}% thuần thục
          </Text>
        </View>
      </View>

      {/* Mastery progress bar */}
      <View className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
        {items.length > 0 && (
          <View className="flex-row h-full">
            {items.map((item) => {
              const pct = (item.value / total) * 100;
              return pct > 0 ? (
                <View
                  key={item.key}
                  style={{
                    width: `${pct}%`,
                    backgroundColor: statusColors[item.key] || "#9CA3AF",
                  }}
                />
              ) : null;
            })}
          </View>
        )}
      </View>

      {/* Legend */}
      <View className="flex-row flex-wrap">
        {items.map((item) => (
          <View key={item.key} className="flex-row items-center mr-4 mb-1">
            <View
              className="w-3 h-3 rounded-full mr-1.5"
              style={{ backgroundColor: statusColors[item.key] || "#9CA3AF" }}
            />
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              {statusLabels[item.key] || item.key} ({item.value})
            </Text>
          </View>
        ))}
      </View>

      {/* Total cards */}
      <View className="flex-row justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        <Text className="text-sm text-gray-500 dark:text-gray-400">Tổng số thẻ</Text>
        <Text className="text-sm font-medium text-gray-900 dark:text-white">{total}</Text>
      </View>
    </View>
  );
}
