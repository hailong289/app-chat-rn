import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import QuizzService from "../../service/quizz.service";
import {
  QuizzResponse,
  QuizzUserAnswer,
  UserAnswerPayload,
  LeaderboardEntry,
  QuizResultResponse,
} from "../../types/quizz.type";
import { formatDuration, getMsUntilStart } from "../../libs/helpers";

type Phase = "intro" | "taking" | "result";

interface TakeQuizzModalProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: QuizzResponse;
  userId: string;
  userFullname: string;
  userAvatar?: string;
  hasCompleted?: boolean;
}

export default function TakeQuizzModal({
  isOpen,
  onClose,
  quiz,
  userId,
  userFullname,
  userAvatar,
  hasCompleted,
}: TakeQuizzModalProps) {
  const [phase, setPhase] = useState<Phase>(hasCompleted ? "result" : "intro");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<QuizzUserAnswer[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [startedAt, setStartedAt] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResultResponse | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoadingResult, setIsLoadingResult] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const questions = quiz.quiz_questions || [];
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  useEffect(() => {
    if (hasCompleted) {
      setPhase("result");
      fetchResult();
    } else {
      setPhase("intro");
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hasCompleted, quiz.quiz_id]);

  useEffect(() => {
    if (phase === "taking") {
      const endMs = quiz.quiz_endTime ? new Date(quiz.quiz_endTime).getTime() : 0;
      timerRef.current = setInterval(() => {
        const now = Date.now();
        const remaining = endMs ? Math.max(0, Math.floor((endMs - now) / 1000)) : 0;
        setTimeLeft(remaining);
        if (remaining <= 0 && endMs > 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleSubmit();
        }
      }, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [phase]);

  const fetchResult = async () => {
    setIsLoadingResult(true);
    try {
      const response = await QuizzService.getResults(quiz.quiz_id || quiz._id || "");
      const data = (response.data as any)?.metadata;
      setResult(data?.my_result || data?.results?.[0] || null);
      setLeaderboard(data?.leaderboard || []);
    } catch {
      // ignore
    } finally {
      setIsLoadingResult(false);
    }
  };

  const startQuiz = () => {
    if (quiz.quiz_startTime) {
      const ms = getMsUntilStart(quiz.quiz_startTime);
      if (ms > 0) {
        Alert.alert("Chưa bắt đầu", "Quiz này chưa đến giờ bắt đầu.");
        return;
      }
    }
    const initialAnswers: QuizzUserAnswer[] = questions.map((_, i) => ({
      questionIndex: i,
      selectedAnswers: [],
      textAnswer: "",
    }));
    setAnswers(initialAnswers);
    setCurrentQuestion(0);
    setStartedAt(new Date().toISOString());
    setPhase("taking");
  };

  const selectAnswer = (answerIndex: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      const q = questions[currentQuestion];
      const current = next[currentQuestion];

      if (q.question_type === "single_choice" || q.question_type === "true_false") {
        current.selectedAnswers = [answerIndex];
      } else if (q.question_type === "multiple_choice") {
        if (current.selectedAnswers.includes(answerIndex)) {
          current.selectedAnswers = current.selectedAnswers.filter((i) => i !== answerIndex);
        } else {
          current.selectedAnswers = [...current.selectedAnswers, answerIndex];
        }
      }
      return next;
    });
  };

  const setTextAnswer = (text: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[currentQuestion].textAnswer = text;
      return next;
    });
  };

  const navigateQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestion(index);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const completedAt = new Date().toISOString();
    const timeTaken = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);

    // Calculate results
    let totalScore = 0;
    let correctCount = 0;
    let maxScore = 0;

    const userAnswers: UserAnswerPayload[] = answers.map((ans, i) => {
      const question = questions[i];
      let isCorrect = false;
      let pointsEarned = 0;

      if (question.question_type === "text") {
        // Text answers aren't auto-graded
        pointsEarned = 0;
      } else {
        const correctIndices = question.answers
          .map((a, idx) => (a.is_correct ? idx : -1))
          .filter((idx) => idx >= 0);
        const selected = ans.selectedAnswers.sort();
        const expected = correctIndices.sort();
        isCorrect =
          selected.length === expected.length &&
          selected.every((v, idx) => v === expected[idx]);
        if (isCorrect) {
          pointsEarned = question.points;
        }
      }

      maxScore += question.points;
      if (isCorrect) {
        totalScore += pointsEarned;
        correctCount++;
      }

      return {
        question_index: i,
        selected_answer_indices: ans.selectedAnswers,
        text_answer: ans.textAnswer || "",
        is_correct: isCorrect,
        points_earned: pointsEarned,
        answered_at: completedAt,
      };
    });

    setIsSubmitting(true);
    try {
      const response = await QuizzService.submitResult(quiz.quiz_id || quiz._id || "", {
        user_answers: userAnswers,
        total_score: totalScore,
        max_score: maxScore,
        correct_count: correctCount,
        total_questions: questions.length,
        started_at: startedAt,
        completed_at: completedAt,
        time_taken: timeTaken,
        is_completed: true,
        is_submitted: true,
      });
      setResult((response.data as any)?.metadata || null);
      setPhase("result");
      // Fetch leaderboard
      await fetchResult();
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Nộp bài thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const question = questions[currentQuestion];
  const currentAnswer = answers[currentQuestion];

  // Intro Phase
  if (phase === "intro") {
    return (
      <Modal visible={isOpen} transparent animationType="slide">
        <View className="flex-1 justify-center items-center bg-black/50 px-6">
          <View className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full">
            <Text className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
              {quiz.quiz_title}
            </Text>
            {quiz.quiz_description ? (
              <Text className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
                {quiz.quiz_description}
              </Text>
            ) : null}
            <View className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-4">
              <View className="flex-row justify-between mb-1">
                <Text className="text-sm text-gray-500 dark:text-gray-400">Số câu hỏi</Text>
                <Text className="text-sm font-medium text-gray-900 dark:text-white">{questions.length}</Text>
              </View>
              <View className="flex-row justify-between mb-1">
                <Text className="text-sm text-gray-500 dark:text-gray-400">Tổng điểm</Text>
                <Text className="text-sm font-medium text-gray-900 dark:text-white">{totalPoints}</Text>
              </View>
              {quiz.quiz_endTime && (
                <View className="flex-row justify-between">
                  <Text className="text-sm text-gray-500 dark:text-gray-400">Thời gian kết thúc</Text>
                  <Text className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(quiz.quiz_endTime).toLocaleString("vi-VN")}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              className="py-4 bg-primary-500 rounded-xl items-center"
              onPress={startQuiz}
            >
              <Text className="text-white text-base font-semibold">Bắt đầu</Text>
            </TouchableOpacity>
            <TouchableOpacity className="mt-3 py-2 items-center" onPress={onClose}>
              <Text className="text-gray-500">Để sau</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // Taking Phase
  if (phase === "taking") {
    return (
      <Modal visible={isOpen} transparent animationType="slide">
        <View className="flex-1 bg-white dark:bg-gray-900 pt-12">
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              Câu {currentQuestion + 1}/{questions.length}
            </Text>
            {timeLeft > 0 && (
              <Text className="text-sm font-medium text-red-500">{formatDuration(timeLeft)}</Text>
            )}
            <TouchableOpacity
              className="px-4 py-1.5 bg-red-500 rounded-lg"
              onPress={() => {
                Alert.alert("Nộp bài?", "Bạn có chắc muốn nộp bài?", [
                  { text: "Hủy", style: "cancel" },
                  { text: "Nộp", onPress: handleSubmit },
                ]);
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white text-sm font-medium">Nộp bài</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Question dots */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
            {questions.map((_, i) => (
              <TouchableOpacity
                key={i}
                className={`w-8 h-8 rounded-full mr-1 items-center justify-center ${
                  i === currentQuestion
                    ? "bg-primary-500"
                    : answers[i]?.selectedAnswers?.length > 0 || answers[i]?.textAnswer
                      ? "bg-green-100 dark:bg-green-900/30"
                      : "bg-gray-100 dark:bg-gray-700"
                }`}
                onPress={() => navigateQuestion(i)}
              >
                <Text
                  className={`text-xs ${
                    i === currentQuestion
                      ? "text-white"
                      : answers[i]?.selectedAnswers?.length > 0 || answers[i]?.textAnswer
                        ? "text-green-600 dark:text-green-400"
                        : "text-gray-500"
                  }`}
                >
                  {i + 1}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView className="flex-1 px-4 py-4">
            {/* Question */}
            <Text className="text-base font-medium text-gray-900 dark:text-white mb-4">
              {question?.question_text}
            </Text>
            <Text className="text-xs text-gray-400 mb-4">{question?.points} điểm</Text>

            {/* Answers */}
            {question?.question_type !== "text" ? (
              question?.answers.map((answer, i) => {
                const isSelected = currentAnswer?.selectedAnswers?.includes(i);
                const isMulti = question.question_type === "multiple_choice";
                return (
                  <TouchableOpacity
                    key={i}
                    className={`flex-row items-center p-4 rounded-xl mb-2 border ${
                      isSelected
                        ? "bg-primary-50 dark:bg-primary-900/20 border-primary-500"
                        : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                    }`}
                    onPress={() => selectAnswer(i)}
                  >
                    <View
                      className={`w-5 h-5 rounded-${isMulti ? "lg" : "full"} border-2 mr-3 items-center justify-center ${
                        isSelected ? "bg-primary-500 border-primary-500" : "border-gray-400"
                      }`}
                    >
                      {isSelected && <Text className="text-white text-xs">✓</Text>}
                    </View>
                    <Text className="flex-1 text-sm text-gray-800 dark:text-white">{answer.answer_text}</Text>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View className="border border-gray-300 dark:border-gray-600 rounded-xl p-4">
                <Text className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Nhập câu trả lời của bạn (sẽ được chấm sau)
                </Text>
                <Text className="text-gray-900 dark:text-white">
                  {currentAnswer?.textAnswer || "(Chưa nhập - chạm vào màn hình để nhập)"}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Navigation buttons */}
          <View className="flex-row px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <TouchableOpacity
              className={`flex-1 py-3 rounded-xl ${currentQuestion > 0 ? "bg-gray-100 dark:bg-gray-700" : "bg-gray-50 dark:bg-gray-800"}`}
              onPress={() => navigateQuestion(currentQuestion - 1)}
              disabled={currentQuestion === 0}
            >
              <Text className={`text-center ${currentQuestion > 0 ? "text-gray-700 dark:text-gray-300" : "text-gray-400"}`}>
                ← Trước
              </Text>
            </TouchableOpacity>
            <View className="w-3" />
            {currentQuestion < questions.length - 1 ? (
              <TouchableOpacity
                className="flex-1 py-3 rounded-xl bg-primary-500"
                onPress={() => navigateQuestion(currentQuestion + 1)}
              >
                <Text className="text-center text-white">Sau →</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                className="flex-1 py-3 rounded-xl bg-green-500"
                onPress={() => {
                  Alert.alert("Nộp bài?", "Bạn đã đến câu hỏi cuối cùng.", [
                    { text: "Xem lại", style: "cancel" },
                    { text: "Nộp bài", onPress: handleSubmit },
                  ]);
                }}
              >
                <Text className="text-center text-white font-medium">Nộp bài ✓</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    );
  }

  // Result Phase
  if (phase === "result") {
    const percentage = result
      ? Math.round((result.total_score / result.max_score) * 100)
      : 0;
    const medalEmojis = ["🥇", "🥈", "🥉"];

    return (
      <Modal visible={isOpen} transparent animationType="slide">
        <View className="flex-1 bg-white dark:bg-gray-900 pt-12">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">Kết quả</Text>
            <TouchableOpacity onPress={onClose}>
              <Text className="text-primary-500 text-base">Đóng</Text>
            </TouchableOpacity>
          </View>

          {isLoadingResult ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#42A59F" />
            </View>
          ) : (
            <ScrollView className="flex-1 px-4 py-4">
              {result && (
                <>
                  {/* Score circle */}
                  <View className="items-center mb-6">
                    <View className="w-32 h-32 rounded-full bg-primary-50 dark:bg-primary-900/20 items-center justify-center border-4 border-primary-500">
                      <Text className="text-3xl font-bold text-primary-500">{percentage}%</Text>
                      <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {result.total_score}/{result.max_score}
                      </Text>
                    </View>
                    <Text className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      {result.correct_count}/{result.total_questions} câu đúng
                    </Text>
                    {result.time_taken > 0 && (
                      <Text className="text-xs text-gray-400 mt-1">
                        Thời gian: {formatDuration(result.time_taken)}
                      </Text>
                    )}
                  </View>
                </>
              )}

              {/* Leaderboard */}
              {leaderboard.length > 0 && (
                <View>
                  <Text className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                    Bảng xếp hạng
                  </Text>
                  {leaderboard.slice(0, 10).map((entry, i) => (
                    <View
                      key={entry.user_id}
                      className={`flex-row items-center p-3 rounded-xl mb-2 ${
                        entry.user_id === userId
                          ? "bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800"
                          : "bg-gray-50 dark:bg-gray-800"
                      }`}
                    >
                      <Text className="text-lg w-8 text-center">
                        {i < 3 ? medalEmojis[i] : `#${entry.rank}`}
                      </Text>
                      <View className="flex-1 ml-2">
                        <Text className="text-sm font-medium text-gray-900 dark:text-white">
                          {entry.user_name}
                          {entry.user_id === userId ? " (Bạn)" : ""}
                        </Text>
                        <Text className="text-xs text-gray-500">{formatDuration(entry.time_taken)}</Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-sm font-semibold text-primary-500">
                          {entry.total_score}/{entry.max_score}
                        </Text>
                        <Text className="text-xs text-gray-500">
                          {entry.correct_count} đúng
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* No result yet */}
              {!result && !isLoadingResult && (
                <View className="items-center py-8">
                  <Text className="text-gray-500 dark:text-gray-400">Chưa có kết quả</Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
    );
  }

  return null;
}
