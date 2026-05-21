import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import FontAwesome from "@react-native-vector-icons/fontawesome";
import QuizzService from "../../service/quizz.service";
import {
  LeaderboardEntry,
  QuizResultResponse,
  QuizzResponse,
} from "../../types/quizz.type";
import { formatDuration, getQuizStatus } from "../../libs/helpers";
import { ImageAvatar } from "../chat/image-avatar.component";

interface QuizResultsProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: QuizzResponse;
  userId?: string;
}

const PRIMARY = "#42A59F";
const COLOR_TEXT = "#0F172A";
const COLOR_MUTED = "#64748B";
const COLOR_DIVIDER = "#E2E8F0";

const STAT_THEMES = {
  participants: { bg: "#E8F5F2", icon: PRIMARY, value: PRIMARY },
  submitted: { bg: "#ECFDF5", icon: "#10B981", value: "#059669" },
  pending: { bg: "#FFF7ED", icon: "#F59E0B", value: "#D97706" },
} as const;

const MEDAL_COLORS = ["#F59E0B", "#94A3B8", "#B45309"];

export default function QuizResults({ isOpen, onClose, quiz, userId }: QuizResultsProps) {
  const [loading, setLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [submittedCount, setSubmittedCount] = useState(0);
  const [notSubmittedCount, setNotSubmittedCount] = useState(0);
  const [myResult, setMyResult] = useState<QuizResultResponse | null>(null);
  const [showMyDetails, setShowMyDetails] = useState(false);
  const [showExplanations, setShowExplanations] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchResults();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, quiz.quiz_id]);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const response = await QuizzService.getResults(quiz.quiz_id || quiz._id || "");
      const data = (response.data as any)?.metadata;
      setLeaderboard(data?.leaderboard || []);
      const totalP = data?.total_participants ?? 0;
      const submitted = data?.submitted_count ?? data?.total_submissions ?? 0;
      const notSubmitted = data?.not_submitted_count ?? Math.max(0, totalP - submitted);
      setTotalParticipants(totalP);
      setSubmittedCount(submitted);
      setNotSubmittedCount(notSubmitted);
      setMyResult(data?.my_result ?? null);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const totalMaxScore =
    leaderboard[0]?.max_score ??
    quiz.quiz_questions?.reduce((s, q) => s + q.points, 0) ??
    0;

  const status = getQuizStatus({
    quiz_startTime: quiz.quiz_startTime,
    quiz_endTime: quiz.quiz_endTime,
    quiz_status: quiz.quiz_status,
  });
  const statusLabel = status.label === "Đang mở" ? "Đang diễn ra" : status.label;
  const statusColors: Record<string, { bg: string; fg: string }> = {
    success: { bg: "#D1FAE5", fg: "#047857" },
    warning: { bg: "#FEF3C7", fg: "#B45309" },
    danger: { bg: "#FEE2E2", fg: "#B91C1C" },
    default: { bg: "#F1F5F9", fg: "#475569" },
  };
  const stColor = statusColors[status.color] || statusColors.default;

  return (
    <Modal visible={isOpen} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#fff", paddingTop: 48 }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 16, flexDirection: "row", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: COLOR_TEXT }} numberOfLines={2}>
              {quiz.quiz_title}
            </Text>
            <Text style={{ fontSize: 13, color: COLOR_MUTED, marginTop: 2 }}>
              Kết quả & Thành viên tham gia
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ padding: 4 }}
          >
            <FontAwesome name="times" size={20} color={COLOR_MUTED} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
          {/* Stat cards */}
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
            <StatCard
              theme={STAT_THEMES.participants}
              icon="users"
              value={totalParticipants}
              label="Tham gia"
            />
            <StatCard
              theme={STAT_THEMES.submitted}
              icon="check-circle"
              value={submittedCount}
              label="Đã nộp"
            />
            <StatCard
              theme={STAT_THEMES.pending}
              icon="clock-o"
              value={notSubmittedCount}
              label="Chưa nộp"
            />
          </View>

          {/* Status + total score */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: stColor.bg,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "600", color: stColor.fg }}>{statusLabel}</Text>
            </View>
            <Text style={{ fontSize: 13, color: COLOR_MUTED }}>
              Tổng điểm tối đa:{" "}
              <Text style={{ fontWeight: "700", color: COLOR_TEXT }}>{totalMaxScore}đ</Text>
            </Text>
          </View>

          <View style={{ height: 1, backgroundColor: COLOR_DIVIDER, marginBottom: 16 }} />

          {/* My Result */}
          {myResult && (
            <MyResultCard
              myResult={myResult}
              quiz={quiz}
              expanded={showMyDetails}
              onToggle={() => setShowMyDetails((v) => !v)}
              showExplanations={showExplanations}
              onToggleExplanations={() => setShowExplanations((v) => !v)}
            />
          )}

          {/* Leaderboard header */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ fontSize: 18, marginRight: 6 }}>🏆</Text>
            <Text style={{ fontSize: 15, fontWeight: "700", color: COLOR_TEXT }}>Bảng xếp hạng</Text>
          </View>

          {/* Leaderboard */}
          {loading ? (
            <View style={{ paddingVertical: 32, alignItems: "center" }}>
              <ActivityIndicator size="large" color={PRIMARY} />
            </View>
          ) : leaderboard.length === 0 ? (
            <View style={{ paddingVertical: 32, alignItems: "center" }}>
              <Text style={{ color: COLOR_MUTED }}>Chưa có ai nộp bài</Text>
            </View>
          ) : (
            leaderboard.map((entry, i) => (
              <LeaderboardRow
                key={`${entry.user_id}-${entry.rank}`}
                entry={entry}
                index={i}
                isMe={entry.user_id === userId}
                totalQuestionsFallback={quiz.quiz_questions?.length ?? 0}
              />
            ))
          )}
        </ScrollView>

        {/* Footer */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderTopWidth: 1,
            borderTopColor: COLOR_DIVIDER,
            alignItems: "flex-end",
          }}
        >
          <TouchableOpacity
            onPress={onClose}
            style={{
              paddingHorizontal: 24,
              paddingVertical: 10,
              borderRadius: 999,
              backgroundColor: "#F1F5F9",
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: COLOR_MUTED }}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function StatCard({
  theme,
  icon,
  value,
  label,
}: {
  theme: { bg: string; icon: string; value: string };
  icon: string;
  value: number;
  label: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.bg,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: "center",
      }}
    >
      <FontAwesome name={icon as any} size={20} color={theme.icon} />
      <Text style={{ fontSize: 22, fontWeight: "700", color: theme.value, marginTop: 6 }}>
        {value}
      </Text>
      <Text style={{ fontSize: 12, color: COLOR_MUTED, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function LeaderboardRow({
  entry,
  index,
  isMe,
  totalQuestionsFallback,
}: {
  entry: LeaderboardEntry;
  index: number;
  isMe: boolean;
  totalQuestionsFallback: number;
}) {
  const isTop = index < 3;
  const percentage =
    entry.max_score > 0 ? Math.round((entry.total_score / entry.max_score) * 100) : 0;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 14,
        marginBottom: 8,
        backgroundColor: isMe ? "#E8F5F2" : isTop ? "#FFFBEB" : "#F8FAFC",
        borderWidth: isMe ? 1 : 0,
        borderColor: PRIMARY,
      }}
    >
      {/* Medal */}
      <View style={{ width: 32, alignItems: "center", marginRight: 8 }}>
        {isTop ? (
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: MEDAL_COLORS[index],
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#fff" }}>{index + 1}</Text>
          </View>
        ) : (
          <Text style={{ fontSize: 13, fontWeight: "600", color: COLOR_MUTED }}>
            #{entry.rank}
          </Text>
        )}
      </View>

      {/* Avatar */}
      <ImageAvatar
        src={entry.user_avatar}
        id={entry.user_id}
        size={36}
        style={{ width: 36, height: 36, borderRadius: 18, marginRight: 10 }}
      />

      {/* Name + meta */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: COLOR_TEXT }} numberOfLines={1}>
          {entry.user_name}
          {isMe ? " (Bạn)" : ""}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
          <Text style={{ fontSize: 12, color: COLOR_MUTED }}>
            {entry.correct_count}/{entry.total_questions ?? totalQuestionsFallback} đúng
          </Text>
          {entry.time_taken > 0 && (
            <>
              <Text style={{ fontSize: 12, color: COLOR_MUTED, marginHorizontal: 6 }}>•</Text>
              <FontAwesome name="clock-o" size={11} color={COLOR_MUTED} style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 12, color: COLOR_MUTED }}>{formatDuration(entry.time_taken)}</Text>
            </>
          )}
        </View>
      </View>

      {/* Score */}
      <View style={{ alignItems: "flex-end" }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: PRIMARY }}>
          {entry.total_score}/{entry.max_score}đ
        </Text>
        <Text style={{ fontSize: 12, color: PRIMARY, fontWeight: "500" }}>{percentage}%</Text>
      </View>
    </View>
  );
}

function MyResultCard({
  myResult,
  quiz,
  expanded,
  onToggle,
  showExplanations,
  onToggleExplanations,
}: {
  myResult: QuizResultResponse;
  quiz: QuizzResponse;
  expanded: boolean;
  onToggle: () => void;
  showExplanations: boolean;
  onToggleExplanations: () => void;
}) {
  const total = myResult.total_questions || quiz.quiz_questions?.length || 0;
  const percentage =
    myResult.max_score > 0
      ? Math.round((myResult.total_score / myResult.max_score) * 100)
      : 0;
  const passed = percentage >= 50;

  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
        <FontAwesome name="user-circle" size={16} color={PRIMARY} style={{ marginRight: 6 }} />
        <Text style={{ fontSize: 15, fontWeight: "700", color: COLOR_TEXT }}>Kết quả của bạn</Text>
      </View>

      {/* Score hero */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: passed ? "#ECFDF5" : "#FEF2F2",
          borderRadius: 14,
          padding: 14,
          borderWidth: 1,
          borderColor: passed ? "#A7F3D0" : "#FECACA",
        }}
      >
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: passed ? "#10B981" : "#EF4444",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 14,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "800", color: "#fff" }}>{percentage}%</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, color: COLOR_MUTED, marginBottom: 2 }}>
            {passed ? "Hoàn thành tốt!" : "Cần cố gắng hơn"}
          </Text>
          <Text style={{ fontSize: 16, fontWeight: "700", color: COLOR_TEXT }}>
            {myResult.total_score}/{myResult.max_score} điểm
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
            <FontAwesome name="check" size={11} color="#10B981" style={{ marginRight: 4 }} />
            <Text style={{ fontSize: 12, color: COLOR_MUTED }}>
              {myResult.correct_count}/{total} đúng
            </Text>
            {myResult.time_taken > 0 && (
              <>
                <Text style={{ fontSize: 12, color: COLOR_MUTED, marginHorizontal: 6 }}>•</Text>
                <FontAwesome name="clock-o" size={11} color={COLOR_MUTED} style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 12, color: COLOR_MUTED }}>
                  {formatDuration(myResult.time_taken)}
                </Text>
              </>
            )}
          </View>
        </View>
      </View>

      {/* Toggle details */}
      <TouchableOpacity
        onPress={onToggle}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 10,
          marginTop: 10,
          borderRadius: 10,
          backgroundColor: "#F1F5F9",
        }}
      >
        <FontAwesome
          name={expanded ? "chevron-up" : "chevron-down"}
          size={12}
          color={COLOR_MUTED}
          style={{ marginRight: 6 }}
        />
        <Text style={{ fontSize: 13, fontWeight: "600", color: COLOR_MUTED }}>
          {expanded ? "Ẩn chi tiết câu trả lời" : "Xem chi tiết câu trả lời"}
        </Text>
      </TouchableOpacity>

      {/* Detail answers */}
      {expanded && (
        <View style={{ marginTop: 12 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "700", color: COLOR_TEXT }}>
              Chi tiết câu trả lời
            </Text>
            <TouchableOpacity
              onPress={onToggleExplanations}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: PRIMARY,
              }}
            >
              <FontAwesome
                name={showExplanations ? "eye-slash" : "eye"}
                size={11}
                color="#fff"
                style={{ marginRight: 4 }}
              />
              <Text style={{ fontSize: 11, fontWeight: "600", color: "#fff" }}>
                {showExplanations ? "Ẩn giải thích" : "Xem giải thích"}
              </Text>
            </TouchableOpacity>
          </View>

          {quiz.quiz_questions?.map((q, qi) => {
            const ua = myResult.user_answers?.find((a) => a.question_index === qi);
            const selected = ua?.selected_answer_indices ?? [];
            const correctIndices = (q.answers || [])
              .map((a, i) => (a.is_correct ? i : -1))
              .filter((i) => i >= 0);
            const isText = q.question_type === "text";
            const isCorrect = ua?.is_correct === true;
            const unanswered = !ua || (selected.length === 0 && !ua.text_answer);

            const statusColor = isText
              ? "#3B82F6"
              : unanswered
              ? "#94A3B8"
              : isCorrect
              ? "#10B981"
              : "#EF4444";
            const statusBg = isText
              ? "#EFF6FF"
              : unanswered
              ? "#F1F5F9"
              : isCorrect
              ? "#ECFDF5"
              : "#FEF2F2";
            const statusIcon = isText
              ? "pencil"
              : unanswered
              ? "minus-circle"
              : isCorrect
              ? "check-circle"
              : "times-circle";

            return (
              <View
                key={qi}
                style={{
                  borderWidth: 1,
                  borderColor: COLOR_DIVIDER,
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 10,
                  backgroundColor: "#fff",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 8 }}>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 999,
                      backgroundColor: statusBg,
                      flexDirection: "row",
                      alignItems: "center",
                      marginRight: 8,
                    }}
                  >
                    <FontAwesome name={statusIcon as any} size={11} color={statusColor} style={{ marginRight: 4 }} />
                    <Text style={{ fontSize: 11, fontWeight: "700", color: statusColor }}>
                      Câu {qi + 1}
                    </Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: 13, fontWeight: "600", color: COLOR_TEXT }}>
                    {q.question_text}
                  </Text>
                  <Text style={{ fontSize: 12, color: COLOR_MUTED, marginLeft: 6 }}>
                    {ua?.points_earned ?? 0}/{q.points}đ
                  </Text>
                </View>

                {isText ? (
                  <View style={{ marginTop: 4 }}>
                    <Text style={{ fontSize: 12, color: COLOR_MUTED, marginBottom: 4 }}>
                      Trả lời của bạn:
                    </Text>
                    <View
                      style={{
                        backgroundColor: "#F8FAFC",
                        borderRadius: 8,
                        padding: 10,
                        borderWidth: 1,
                        borderColor: COLOR_DIVIDER,
                      }}
                    >
                      <Text style={{ fontSize: 13, color: COLOR_TEXT }}>
                        {ua?.text_answer || "(Không có câu trả lời)"}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={{ marginTop: 4 }}>
                    {unanswered ? (
                      <Text style={{ fontSize: 12, color: COLOR_MUTED, fontStyle: "italic" }}>
                        Bạn chưa trả lời câu này
                      </Text>
                    ) : (
                      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center" }}>
                        <Text style={{ fontSize: 12, color: COLOR_MUTED, marginRight: 6 }}>Bạn chọn:</Text>
                        {selected.map((idx) => {
                          const ans = q.answers?.[idx];
                          const ok = ans?.is_correct;
                          return (
                            <View
                              key={idx}
                              style={{
                                paddingHorizontal: 8,
                                paddingVertical: 3,
                                borderRadius: 999,
                                backgroundColor: ok ? "#ECFDF5" : "#FEF2F2",
                                marginRight: 6,
                                marginBottom: 4,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 11,
                                  fontWeight: "600",
                                  color: ok ? "#059669" : "#DC2626",
                                }}
                              >
                                {ans?.answer_text}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    )}

                    {!isCorrect && correctIndices.length > 0 && (
                      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginTop: 6 }}>
                        <Text style={{ fontSize: 12, color: COLOR_MUTED, marginRight: 6 }}>Đáp án đúng:</Text>
                        {correctIndices.map((idx) => (
                          <View
                            key={idx}
                            style={{
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 999,
                              backgroundColor: "#ECFDF5",
                              marginRight: 6,
                              marginBottom: 4,
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: "600", color: "#059669" }}>
                              {q.answers?.[idx]?.answer_text}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {showExplanations && q.explanation ? (
                  <View
                    style={{
                      marginTop: 10,
                      padding: 10,
                      borderRadius: 8,
                      backgroundColor: "#FFFBEB",
                      borderWidth: 1,
                      borderColor: "#FDE68A",
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                      <FontAwesome name="lightbulb-o" size={12} color="#D97706" style={{ marginRight: 4 }} />
                      <Text style={{ fontSize: 12, fontWeight: "700", color: "#92400E" }}>Giải thích</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: "#78350F", lineHeight: 18 }}>
                      {q.explanation}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      <View style={{ height: 1, backgroundColor: COLOR_DIVIDER, marginTop: 4 }} />
    </View>
  );
}
