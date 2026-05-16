import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { QuizzResponse } from "../../types/quizz.type";
import {
  getQuizStatus,
  getMsUntilNextTransition,
  formatTimeUntil,
  formatDateTime,
} from "../../libs/helpers";

interface QuizCardProps {
  quiz: QuizzResponse;
  isMine?: boolean;
  isDraft?: boolean;
  hasCompleted?: boolean;
  onPress?: () => void;
  onEdit?: () => void;
  onViewResults?: () => void;
}

export default function QuizCard({
  quiz,
  isMine,
  isDraft,
  hasCompleted,
  onPress,
  onEdit,
  onViewResults,
}: QuizCardProps) {
  const [status, setStatus] = useState(() => getQuizStatus({
    quiz_startTime: quiz.quiz_startTime,
    quiz_endTime: quiz.quiz_endTime,
    quiz_status: quiz.quiz_status,
  }));
  const [ticker, setTicker] = useState(0);

  // Auto-refresh: every minute normally, every second in last minute
  useEffect(() => {
    const ms = getMsUntilNextTransition({
      quiz_startTime: quiz.quiz_startTime,
      quiz_endTime: quiz.quiz_endTime,
    });
    const interval = ms < 60000 && ms > 0 ? 1000 : 60000;
    const timer = setInterval(() => {
      setStatus(getQuizStatus({
        quiz_startTime: quiz.quiz_startTime,
        quiz_endTime: quiz.quiz_endTime,
        quiz_status: quiz.quiz_status,
      }));
      setTicker((t) => t + 1);
    }, interval);
    return () => clearInterval(timer);
  }, [quiz.quiz_startTime, quiz.quiz_endTime, quiz.quiz_status]);

  const statusBgColors: Record<string, string> = {
    success: "bg-green-100 dark:bg-green-900/30",
    warning: "bg-yellow-100 dark:bg-yellow-900/30",
    danger: "bg-red-100 dark:bg-red-900/30",
    default: "bg-gray-100 dark:bg-gray-700",
  };

  const statusTextColors: Record<string, string> = {
    success: "text-green-600 dark:text-green-400",
    warning: "text-yellow-600 dark:text-yellow-400",
    danger: "text-red-600 dark:text-red-400",
    default: "text-gray-600 dark:text-gray-400",
  };

  return (
    <TouchableOpacity
      className={`rounded-xl p-4 mb-2 max-w-[85%] ${isMine ? "bg-primary-500 self-end" : "bg-gray-100 dark:bg-gray-800 self-start"}`}
      onPress={() => {
        if (isMine && isDraft) {
          onEdit?.();
        } else if (isMine && !isDraft) {
          onViewResults?.();
        } else if (!isMine) {
          if (hasCompleted) {
            onViewResults?.();
          } else {
            onPress?.();
          }
        }
      }}
      activeOpacity={0.8}
    >
      {/* Header */}
      <View className="flex-row items-center mb-2">
        <Text className="text-lg mr-2">📝</Text>
        <Text
          className={`text-base font-semibold flex-1 ${isMine ? "text-white" : "text-gray-900 dark:text-white"}`}
          numberOfLines={2}
        >
          {quiz.quiz_title}
        </Text>
      </View>

      {quiz.quiz_description ? (
        <Text
          className={`text-sm mb-2 ${isMine ? "text-white/80" : "text-gray-600 dark:text-gray-400"}`}
          numberOfLines={2}
        >
          {quiz.quiz_description}
        </Text>
      ) : null}

      {/* Status badge */}
      <View className={`self-start px-3 py-1 rounded-full mb-2 ${statusBgColors[status.color] || statusBgColors.default}`}>
        <Text className={`text-xs font-medium ${statusTextColors[status.color] || statusTextColors.default}`}>
          {status.label}
        </Text>
      </View>

      {/* Info row */}
      <View className="flex-row items-center justify-between mt-1">
        <View className="flex-row items-center">
          <Text className={`text-xs ${isMine ? "text-white/70" : "text-gray-500 dark:text-gray-400"}`}>
            {quiz.quiz_questions?.length || 0} câu
          </Text>
          <Text className={`text-xs ml-3 ${isMine ? "text-white/70" : "text-gray-500 dark:text-gray-400"}`}>
            {quiz.quiz_questions?.reduce((s, q) => s + q.points, 0) || 0} điểm
          </Text>
        </View>
        <Text className={`text-xs ${isMine ? "text-white/70" : "text-gray-500 dark:text-gray-400"}`}>
          {quiz.quiz_startTime ? formatDateTime(quiz.quiz_startTime) : "Không giới hạn"}
        </Text>
      </View>

      {/* Action hint */}
      <View className={`mt-2 pt-2 border-t ${isMine ? "border-white/20" : "border-gray-200 dark:border-gray-700"}`}>
        <Text className={`text-xs text-center ${isMine ? "text-white/70" : "text-primary-500"}`}>
          {isMine && isDraft
            ? "Chỉnh sửa →"
            : isMine && !isDraft
              ? "Xem kết quả →"
              : hasCompleted
                ? "Xem kết quả →"
                : status.label === "Đã kết thúc"
                  ? "Đã kết thúc"
                  : status.label === "Chưa bắt đầu"
                    ? `Bắt đầu sau ${formatTimeUntil(getMsUntilNextTransition({ quiz_startTime: quiz.quiz_startTime, quiz_endTime: quiz.quiz_endTime }))}`
                    : "Làm quiz →"}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
