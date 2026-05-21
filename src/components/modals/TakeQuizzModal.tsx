import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import FontAwesome from "@react-native-vector-icons/fontawesome";
import QuizzService from "../../service/quizz.service";
import {
  QuizzResponse,
  QuizzUserAnswer,
  UserAnswerPayload,
  LeaderboardEntry,
  QuizResultResponse,
} from "../../types/quizz.type";
import { formatDuration, formatCountdown, findMyQuizResult, getMsUntilStart, getQuizApiId, getQuizMongoId } from "../../libs/helpers";
import { useSocket, SocketEvents } from "../../providers/socket.provider";
import useMessageStore from "../../store/useMessage";
import { resolveCanonicalRoomId } from "../../libs/normalize-socket-message";
import { ImageAvatar } from "../chat/image-avatar.component";

type Phase = "intro" | "taking" | "result";

interface TakeQuizzModalProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: QuizzResponse;
  userId: string;
  userFullname: string;
  userAvatar?: string;
  hasCompleted?: boolean;
  roomId?: string;
  onSubmitted?: (updatedQuiz: QuizzResponse) => void;
}

export default function TakeQuizzModal({
  isOpen,
  onClose,
  quiz,
  userId,
  userFullname,
  userAvatar,
  hasCompleted,
  roomId,
  onSubmitted,
}: TakeQuizzModalProps) {
  const { socket } = useSocket('/chat');
  const { updateQuizInMessages } = useMessageStore();
  const [phase, setPhase] = useState<Phase>(hasCompleted ? "result" : "intro");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<QuizzUserAnswer[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [startedAt, setStartedAt] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResultResponse | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoadingResult, setIsLoadingResult] = useState(false);
  const [showExplanations, setShowExplanations] = useState(false);
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
      const next = data?.my_result || data?.results?.[0] || null;
      if (next) setResult(next);
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

  const handleExit = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    onClose();
  }, [onClose]);

  const confirmExitTaking = useCallback(() => {
    Alert.alert(
      'Thoát bài làm?',
      'Tiến trình làm bài sẽ không được lưu.',
      [
        { text: 'Ở lại', style: 'cancel' },
        { text: 'Thoát', style: 'destructive', onPress: handleExit },
      ],
    );
  }, [handleExit]);

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
      const quizApiId = getQuizApiId(quiz);
      const response = await QuizzService.submitResult(quizApiId, {
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
      const submitMeta = (response.data as any)?.metadata;
      const updatedQuiz: QuizzResponse | undefined = submitMeta?.quiz;
      const myResultFromQuiz = findMyQuizResult(updatedQuiz?.quiz_results, { _id: userId });

      if (updatedQuiz) {
        const effectiveRoomId = resolveCanonicalRoomId(
          roomId || updatedQuiz.quiz_roomId || quiz.quiz_roomId || '',
        );
        const quizIdForSync = getQuizMongoId(updatedQuiz) || getQuizApiId(updatedQuiz);
        if (effectiveRoomId && quizIdForSync) {
          updateQuizInMessages(effectiveRoomId, quizIdForSync, updatedQuiz);
          socket?.emit(SocketEvents.UPDATE_QUIZ, {
            roomId: effectiveRoomId,
            quizId: quizIdForSync,
            payload: updatedQuiz,
          });
        }
        onSubmitted?.(updatedQuiz);
      }

      setResult(myResultFromQuiz || submitMeta || null);
      setPhase("result");
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
  const totalQuestions = questions.length;
  const answeredCount = answers.filter(
    (a) =>
      a.selectedAnswers.length > 0 || (a.textAnswer?.trim()?.length ?? 0) > 0,
  ).length;
  const progressPercent =
    totalQuestions > 0 ? ((currentQuestion + 1) / totalQuestions) * 100 : 0;

  // Intro Phase
  if (phase === "intro") {
    return (
      <Modal visible={isOpen} animationType="slide" onRequestClose={handleExit}>
        <View className="flex-1 bg-white dark:bg-gray-900 pt-12">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              Thông tin bài kiểm tra
            </Text>
            <TouchableOpacity onPress={handleExit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text className="text-base text-gray-500 dark:text-gray-400">Thoát</Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-6 py-6" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
            <View className="bg-gray-50 dark:bg-gray-800 rounded-3xl p-6">
              <Text className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
                {quiz.quiz_title}
              </Text>
              {quiz.quiz_description ? (
                <Text className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
                  {quiz.quiz_description}
                </Text>
              ) : null}
              <View className="bg-white dark:bg-gray-700 rounded-xl p-4 mb-4">
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
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  }

  // Taking Phase
  if (phase === "taking") {
    return (
      <Modal visible={isOpen} animationType="slide" onRequestClose={confirmExitTaking}>
        <View className="flex-1 bg-white dark:bg-gray-900 pt-12">
          {/* Top bar */}
          <View style={takeStyles.metaSection} className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <TouchableOpacity onPress={confirmExitTaking} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text className="text-base text-gray-500 dark:text-gray-400">Thoát</Text>
            </TouchableOpacity>
            <Text
              className="flex-1 mx-2 text-center text-sm font-semibold text-gray-900 dark:text-white"
              numberOfLines={1}
            >
              {quiz.quiz_title}
            </Text>
            <TouchableOpacity
              onPress={() => {
                Alert.alert("Nộp bài?", "Bạn có chắc muốn nộp bài?", [
                  { text: "Hủy", style: "cancel" },
                  { text: "Nộp", onPress: handleSubmit },
                ]);
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#42A59F" />
              ) : (
                <Text className="text-base font-medium text-red-500">Nộp bài</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Step + timer — no flex-grow; progress bar uses fixed pixel height (h-1.5 breaks on RN) */}
          <View style={takeStyles.metaSection} className="px-4 pt-3 pb-3 border-b border-gray-200 dark:border-gray-700">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                Câu {currentQuestion + 1} / {totalQuestions}
              </Text>
              {timeLeft > 0 ? (
                <Text
                  className={`text-sm font-semibold ${
                    timeLeft <= 60
                      ? "text-red-500"
                      : timeLeft <= 300
                        ? "text-amber-500"
                        : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {formatCountdown(timeLeft)}
                </Text>
              ) : null}
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                {answeredCount}/{totalQuestions} đã trả lời
              </Text>
            </View>
            <View className="bg-gray-200 dark:bg-gray-700" style={takeStyles.progressTrack}>
              <View className="bg-primary-500" style={[takeStyles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
          </View>

          {/* Question picker */}
          <View style={takeStyles.dotsSection} className="flex-row flex-wrap justify-center px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            {questions.map((_, i) => {
              const isAnswered =
                (answers[i]?.selectedAnswers?.length ?? 0) > 0 ||
                (answers[i]?.textAnswer?.trim()?.length ?? 0) > 0;
              const isCurrent = i === currentQuestion;
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => navigateQuestion(i)}
                  style={takeStyles.dot}
                  className={`items-center justify-center ${
                    isCurrent
                      ? "bg-primary-500"
                      : isAnswered
                        ? "bg-primary-100 dark:bg-primary-900/30"
                        : "bg-gray-200 dark:bg-gray-700"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      isCurrent
                        ? "text-white"
                        : isAnswered
                          ? "text-primary-500"
                          : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {i + 1}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <ScrollView className="flex-1 px-4 py-4" keyboardShouldPersistTaps="handled">
            <Text className="text-base font-medium text-gray-900 dark:text-white mb-1 leading-6">
              {question?.question_text}
            </Text>
            <Text className="text-xs text-gray-400 mb-4">{question?.points} điểm</Text>

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
                      className={`w-5 h-5 border-2 mr-3 items-center justify-center ${
                        isMulti ? "rounded-md" : "rounded-full"
                      } ${isSelected ? "bg-primary-500 border-primary-500" : "border-gray-400"}`}
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

          <View style={takeStyles.metaSection} className="flex-row px-4 py-3 border-t border-gray-200 dark:border-gray-700 pb-6">
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
      ? Math.round((result.total_score / Math.max(1, result.max_score)) * 100)
      : 0;
    const totalMaxScoreSubmitted = result?.max_score ?? totalPoints;
    const totalScoreSubmitted = result?.total_score ?? 0;
    const totalQuestionsResult = result?.total_questions ?? questions.length;
    const correctCountResult = result?.correct_count ?? 0;

    const scoreColor =
      percentage >= 80 ? "#10B981" : percentage >= 50 ? "#F59E0B" : "#EF4444";

    const myAnswerByQ = new Map<number, UserAnswerPayload>();
    result?.user_answers?.forEach((ua) => myAnswerByQ.set(ua.question_index, ua));

    return (
      <Modal visible={isOpen} animationType="slide" onRequestClose={handleExit}>
        <View style={{ flex: 1, backgroundColor: "#fff", paddingTop: 48 }}>
          {/* Header */}
          <View style={resultStyles.header}>
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              <Text style={{ fontSize: 20, marginRight: 8 }}>🎓</Text>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#0F172A" }}>Kết quả</Text>
            </View>
            <TouchableOpacity
              onPress={handleExit}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={resultStyles.closeBtn}
            >
              <FontAwesome name="times" size={16} color="#42A59F" />
            </TouchableOpacity>
          </View>

          {isLoadingResult && !result ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator size="large" color="#42A59F" />
            </View>
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
              {/* Score hero */}
              <View style={resultStyles.scoreHero}>
                <View style={resultStyles.scoreCircle}>
                  <Text style={[resultStyles.scorePct, { color: scoreColor }]}>{percentage}%</Text>
                </View>
                <Text style={resultStyles.scoreMain}>
                  {totalScoreSubmitted} / {totalMaxScoreSubmitted} điểm
                </Text>
                <Text style={resultStyles.scoreSub}>
                  {correctCountResult} câu đúng / {totalQuestionsResult} câu hỏi
                </Text>
                {(result?.time_taken ?? 0) > 0 && (
                  <View style={resultStyles.timeRow}>
                    <FontAwesome name="clock-o" size={13} color="#64748B" style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 13, color: "#64748B" }}>
                      Thời gian: {formatDuration(result?.time_taken ?? 0)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Answer details */}
              {questions.length > 0 && (
                <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
                  <View style={resultStyles.sectionHeader}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Text style={{ fontSize: 16, marginRight: 6 }}>📊</Text>
                      <Text style={resultStyles.sectionTitle}>Chi tiết câu trả lời</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setShowExplanations((v) => !v)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      style={resultStyles.explainBtn}
                    >
                      <FontAwesome
                        name={showExplanations ? "eye-slash" : "eye"}
                        size={12}
                        color="#42A59F"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={resultStyles.explainBtnText}>
                        {showExplanations ? "Ẩn giải thích" : "Xem giải thích"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {questions.map((q, qi) => {
                    const myA = myAnswerByQ.get(qi);
                    const hasMyAnswer =
                      !!myA && (myA.selected_answer_indices?.length > 0 || !!myA.text_answer);
                    const isCorrect = myA?.is_correct === true;
                    const isText = q.question_type === "text";
                    const correctAnswers = q.answers
                      .filter((a) => a.is_correct)
                      .map((a) => a.answer_text)
                      .join(", ");
                    const mySelectedTexts =
                      myA?.selected_answer_indices
                        ?.map((idx) => q.answers[idx]?.answer_text)
                        .filter(Boolean)
                        .join(", ") || "";

                    // 4 visual states: text / correct / wrong / unanswered
                    const bg = isText
                      ? "#F8FAFC"
                      : !hasMyAnswer
                        ? "#F1F5F9"
                        : isCorrect
                          ? "#ECFDF5"
                          : "#FEF2F2";
                    const border = isText
                      ? "#E2E8F0"
                      : !hasMyAnswer
                        ? "#CBD5E1"
                        : isCorrect
                          ? "#A7F3D0"
                          : "#FECACA";

                    return (
                      <View
                        key={qi}
                        style={[resultStyles.answerCard, { backgroundColor: bg, borderColor: border }]}
                      >
                        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                          <View style={{ marginRight: 8, marginTop: 2 }}>
                            {isText ? (
                              <FontAwesome name="pencil" size={14} color="#64748B" />
                            ) : !hasMyAnswer ? (
                              <FontAwesome name="minus-circle" size={16} color="#64748B" />
                            ) : isCorrect ? (
                              <FontAwesome name="check-circle" size={16} color="#10B981" />
                            ) : (
                              <FontAwesome name="times-circle" size={16} color="#EF4444" />
                            )}
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={resultStyles.questionText}>
                              {qi + 1}. {q.question_text}
                            </Text>
                            {!isText && mySelectedTexts && (
                              <Text style={resultStyles.correctAnswerLine}>
                                Bạn chọn:{" "}
                                <Text
                                  style={{
                                    fontWeight: "600",
                                    color: isCorrect ? "#059669" : "#B91C1C",
                                  }}
                                >
                                  {mySelectedTexts}
                                </Text>
                              </Text>
                            )}
                            {!isCorrect && !isText && correctAnswers && (
                              <Text style={resultStyles.correctAnswerLine}>
                                Đáp án đúng:{" "}
                                <Text style={{ fontWeight: "600", color: "#059669" }}>{correctAnswers}</Text>
                              </Text>
                            )}
                            {isText && myA?.text_answer && (
                              <Text style={resultStyles.correctAnswerLine}>
                                Câu trả lời của bạn:{" "}
                                <Text style={{ color: "#0F172A" }}>{myA.text_answer}</Text>
                              </Text>
                            )}
                            {!isText && !hasMyAnswer && (
                              <Text style={resultStyles.correctAnswerLine}>
                                Đáp án đúng:{" "}
                                <Text style={{ fontWeight: "600", color: "#059669" }}>{correctAnswers}</Text>
                              </Text>
                            )}
                            {showExplanations && !!q.explanation && (
                              <View style={resultStyles.explanationBox}>
                                <FontAwesome
                                  name="lightbulb-o"
                                  size={12}
                                  color="#D97706"
                                  style={{ marginRight: 6, marginTop: 2 }}
                                />
                                <Text style={resultStyles.explanationText}>{q.explanation}</Text>
                              </View>
                            )}
                          </View>
                          <View style={resultStyles.pointPill}>
                            <Text style={resultStyles.pointPillText}>{q.points}đ</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Leaderboard */}
              {leaderboard.length > 0 && (
                <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
                  <View style={[resultStyles.sectionHeader, { marginBottom: 10 }]}>
                    <Text style={{ fontSize: 16, marginRight: 6 }}>🏆</Text>
                    <Text style={resultStyles.sectionTitle}>Bảng xếp hạng</Text>
                  </View>
                  {leaderboard.slice(0, 10).map((entry, i) => {
                    const isMe = entry.user_id === userId;
                    const isTop = i < 3;
                    const pct =
                      entry.max_score > 0
                        ? Math.round((entry.total_score / entry.max_score) * 100)
                        : 0;
                    return (
                      <View
                        key={entry.user_id}
                        style={[
                          resultStyles.leaderRow,
                          {
                            backgroundColor: isMe ? "#E8F5F2" : isTop ? "#FFFBEB" : "#F8FAFC",
                            borderColor: isMe ? "#42A59F" : "transparent",
                            borderWidth: isMe ? 1 : 0,
                          },
                        ]}
                      >
                        <View style={{ width: 32, alignItems: "center", marginRight: 8 }}>
                          {isTop ? (
                            <View
                              style={[
                                resultStyles.medalBadge,
                                { backgroundColor: ["#F59E0B", "#94A3B8", "#B45309"][i] },
                              ]}
                            >
                              <Text style={{ fontSize: 12, fontWeight: "700", color: "#fff" }}>
                                {i + 1}
                              </Text>
                            </View>
                          ) : (
                            <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B" }}>
                              #{entry.rank}
                            </Text>
                          )}
                        </View>
                        <ImageAvatar
                          src={entry.user_avatar}
                          id={entry.user_id}
                          size={34}
                          style={{ width: 34, height: 34, borderRadius: 17, marginRight: 10 }}
                        />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ fontSize: 14, fontWeight: "600", color: "#0F172A" }} numberOfLines={1}>
                            {entry.user_name}
                            {isMe ? " (Bạn)" : ""}
                          </Text>
                          <Text style={{ fontSize: 12, color: "#64748B", marginTop: 1 }}>
                            {entry.correct_count}/{entry.total_questions ?? totalQuestionsResult} đúng •{" "}
                            {formatDuration(entry.time_taken)}
                          </Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={{ fontSize: 14, fontWeight: "700", color: "#42A59F" }}>
                            {entry.total_score}đ
                          </Text>
                          <Text style={{ fontSize: 12, color: "#42A59F" }}>{pct}%</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          )}

          {/* Footer */}
          <View style={resultStyles.footer}>
            <TouchableOpacity onPress={handleExit} style={resultStyles.closeFooterBtn}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#fff" }}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return null;
}

const takeStyles = StyleSheet.create({
  metaSection: {
    flexGrow: 0,
    flexShrink: 0,
  },
  progressTrack: {
    height: 6,
    width: "100%",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    borderRadius: 999,
  },
  dotsSection: {
    flexGrow: 0,
    flexShrink: 0,
    gap: 8,
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
});

const resultStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#42A59F",
    alignItems: "center",
    justifyContent: "center",
  },
  scoreHero: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 24,
    backgroundColor: "#F1F5F9",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
    borderRadius: 18,
  },
  scoreCircle: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  scorePct: { fontSize: 32, fontWeight: "800" },
  scoreMain: { fontSize: 18, fontWeight: "700", color: "#0F172A", marginBottom: 4 },
  scoreSub: { fontSize: 13, color: "#64748B" },
  timeRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  answerCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  questionText: { fontSize: 14, color: "#0F172A", lineHeight: 20 },
  correctAnswerLine: { fontSize: 12, color: "#475569", marginTop: 6 },
  pointPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.7)",
    marginLeft: 8,
  },
  pointPillText: { fontSize: 11, fontWeight: "600", color: "#475569" },
  explainBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#42A59F",
  },
  explainBtnText: { fontSize: 12, fontWeight: "600", color: "#42A59F" },
  explanationBox: {
    flexDirection: "row",
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    borderLeftWidth: 3,
    borderLeftColor: "#F59E0B",
    borderRadius: 6,
  },
  explanationText: { flex: 1, fontSize: 12, color: "#78350F", lineHeight: 18 },
  leaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 8,
  },
  medalBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    alignItems: "flex-end",
  },
  closeFooterBtn: {
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#42A59F",
  },
});
