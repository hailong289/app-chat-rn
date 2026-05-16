import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import QuizzService from "../../service/quizz.service";
import { LeaderboardEntry, QuizzResponse } from "../../types/quizz.type";
import { formatDuration } from "../../libs/helpers";

interface QuizResultsProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: QuizzResponse;
  userId?: string;
}

export default function QuizResults({ isOpen, onClose, quiz, userId }: QuizResultsProps) {
  const [loading, setLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [totalSubmissions, setTotalSubmissions] = useState(0);

  useEffect(() => {
    if (isOpen) {
      fetchResults();
    }
  }, [isOpen, quiz.quiz_id]);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const response = await QuizzService.getResults(quiz.quiz_id || quiz._id || "");
      const data = (response.data as any)?.metadata;
      setLeaderboard(data?.leaderboard || []);
      setTotalParticipants(data?.total_participants || 0);
      setTotalSubmissions(data?.total_submissions || 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const medalEmojis = ["🥇", "🥈", "🥉"];

  return (
    <Modal visible={isOpen} transparent animationType="slide">
      <View className="flex-1 bg-white dark:bg-gray-900 pt-12">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">
            Kết quả Quiz
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text className="text-primary-500 text-base">Đóng</Text>
          </TouchableOpacity>
        </View>

        <View className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <Text className="text-base font-medium text-gray-900 dark:text-white">{quiz.quiz_title}</Text>
          <View className="flex-row mt-2 space-x-4">
            <View className="bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2 mr-2">
              <Text className="text-xs text-gray-500 dark:text-gray-400">Tham gia</Text>
              <Text className="text-lg font-semibold text-blue-600 dark:text-blue-400">{totalParticipants}</Text>
            </View>
            <View className="bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2 mr-2">
              <Text className="text-xs text-gray-500 dark:text-gray-400">Đã nộp</Text>
              <Text className="text-lg font-semibold text-green-600 dark:text-green-400">{totalSubmissions}</Text>
            </View>
            <View className="bg-orange-50 dark:bg-orange-900/20 rounded-lg px-3 py-2">
              <Text className="text-xs text-gray-500 dark:text-gray-400">Chưa nộp</Text>
              <Text className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                {totalParticipants - totalSubmissions}
              </Text>
            </View>
          </View>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#42A59F" />
          </View>
        ) : (
          <FlatList
            data={leaderboard}
            keyExtractor={(item) => `${item.user_id}-${item.rank}`}
            contentContainerClassName="px-4 py-3"
            renderItem={({ item, index }) => (
              <View
                className={`flex-row items-center p-3 rounded-xl mb-2 ${
                  item.user_id === userId
                    ? "bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800"
                    : "bg-gray-50 dark:bg-gray-800"
                }`}
              >
                <Text className="text-xl w-10 text-center">
                  {index < 3 ? medalEmojis[index] : `#${item.rank}`}
                </Text>
                <View className="flex-1 ml-2">
                  <Text className="text-sm font-medium text-gray-900 dark:text-white">
                    {item.user_name}
                    {item.user_id === userId ? " (Bạn)" : ""}
                  </Text>
                  <View className="flex-row items-center mt-0.5">
                    <Text className="text-xs text-gray-500">
                      {item.correct_count}/{leaderboard[0]?.max_score ? `${item.total_score}/${item.max_score}` : `${item.total_score}đ`}
                    </Text>
                    {item.time_taken > 0 && (
                      <Text className="text-xs text-gray-400 ml-2">{formatDuration(item.time_taken)}</Text>
                    )}
                  </View>
                </View>
                {/* Score percentage bar */}
                {item.max_score > 0 && (
                  <View className="w-16 items-end">
                    <Text className="text-sm font-semibold text-primary-500">
                      {Math.round((item.total_score / item.max_score) * 100)}%
                    </Text>
                  </View>
                )}
              </View>
            )}
            ListEmptyComponent={
              <View className="items-center py-16">
                <Text className="text-gray-500 dark:text-gray-400">Chưa có ai nộp bài</Text>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );
}
