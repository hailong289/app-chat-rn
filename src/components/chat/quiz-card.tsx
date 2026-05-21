import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import FontAwesome from "@react-native-vector-icons/fontawesome";
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
  canOpen?: boolean;
  showAsViewResults?: boolean;
  senderCanEdit?: boolean;
  onPress?: () => void;
  onEdit?: () => void;
  onViewResults?: () => void;
}

const PRIMARY = "#42A59F";
const PRIMARY_SOFT_BG = "#E8F5F2";
const PRIMARY_SOFT_BORDER = "#B7E0D9";
const DANGER = "#EF4444";

export default function QuizCard({
  quiz,
  isMine,
  isDraft,
  hasCompleted,
  canOpen = true,
  showAsViewResults,
  senderCanEdit,
  onPress,
  onEdit,
  onViewResults,
}: QuizCardProps) {
  const [status, setStatus] = useState(() =>
    getQuizStatus({
      quiz_startTime: quiz.quiz_startTime,
      quiz_endTime: quiz.quiz_endTime,
      quiz_status: quiz.quiz_status,
    }),
  );

  useEffect(() => {
    const ms = getMsUntilNextTransition({
      quiz_startTime: quiz.quiz_startTime,
      quiz_endTime: quiz.quiz_endTime,
    });
    const interval = ms < 60000 && ms > 0 ? 1000 : 60000;
    const timer = setInterval(() => {
      setStatus(
        getQuizStatus({
          quiz_startTime: quiz.quiz_startTime,
          quiz_endTime: quiz.quiz_endTime,
          quiz_status: quiz.quiz_status,
        }),
      );
    }, interval);
    return () => clearInterval(timer);
  }, [quiz.quiz_startTime, quiz.quiz_endTime, quiz.quiz_status]);

  const totalQuestions = quiz.quiz_questions?.length ?? 0;
  const totalPoints = quiz.quiz_questions?.reduce((s, q) => s + q.points, 0) ?? 0;

  const handlePress = () => {
    if (!canOpen) return;
    if (isMine && isDraft && senderCanEdit) {
      onEdit?.();
    } else if (isMine && !isDraft) {
      onViewResults?.();
    } else if (!isMine) {
      if (hasCompleted || showAsViewResults) {
        onViewResults?.();
      } else {
        onPress?.();
      }
    }
  };

  // Top-right pill content: "Xem kết quả" (sender / completed) — otherwise status chip
  const showResultPill = hasCompleted || (isMine && !isDraft) || showAsViewResults;
  const topPillLabel = showResultPill
    ? "Xem kết quả"
    : isDraft
      ? "Bản nháp"
      : status.label;

  // Footer CTA
  const footerLabel = (() => {
    if (!canOpen) {
      if (isDraft && !isMine) return "Quiz chưa được gửi";
      if (status.label === "Chưa bắt đầu") {
        const ms = getMsUntilNextTransition({
          quiz_startTime: quiz.quiz_startTime,
          quiz_endTime: quiz.quiz_endTime,
        });
        return `Bắt đầu sau ${formatTimeUntil(ms)}`;
      }
      if (status.label === "Đã kết thúc") return "Đã kết thúc";
      return "Không khả dụng";
    }
    if (isMine && isDraft && senderCanEdit) return "Sửa bản nháp";
    if (isMine && !isDraft) return "Xem kết quả";
    if (hasCompleted || showAsViewResults) return "Xem kết quả";
    if (status.label === "Đã kết thúc") return "Đã kết thúc";
    if (status.label === "Chưa bắt đầu") {
      const ms = getMsUntilNextTransition({
        quiz_startTime: quiz.quiz_startTime,
        quiz_endTime: quiz.quiz_endTime,
      });
      return `Bắt đầu sau ${formatTimeUntil(ms)}`;
    }
    return "Làm bài ngay";
  })();

  return (
    <TouchableOpacity
      activeOpacity={canOpen ? 0.85 : 1}
      disabled={!canOpen}
      onPress={handlePress}
      style={{
        width: 300,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: PRIMARY_SOFT_BORDER,
        backgroundColor: PRIMARY_SOFT_BG,
        overflow: "hidden",
        opacity: canOpen ? 1 : 0.7,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
          paddingTop: 12,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: PRIMARY_SOFT_BORDER,
          gap: 10,
        }}
      >
        {/* Icon box */}
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            backgroundColor: "#D4EEE8",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FontAwesome
            name={showResultPill ? "check-circle" : "graduation-cap"}
            size={18}
            color={PRIMARY}
          />
        </View>

        {/* Label + title */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              fontSize: 10,
              fontWeight: "800",
              letterSpacing: 1.2,
              color: PRIMARY,
              marginBottom: 1,
            }}
          >
            BÀI KIỂM TRA
          </Text>
          <Text
            numberOfLines={1}
            style={{ fontSize: 14, fontWeight: "700", color: "#0F172A" }}
          >
            {quiz.quiz_title}
          </Text>
        </View>

        {/* Top-right pill */}
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 999,
            backgroundColor: "#fff",
            borderWidth: 1,
            borderColor: PRIMARY_SOFT_BORDER,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: "600", color: PRIMARY }}>
            {topPillLabel}
          </Text>
        </View>
      </View>

      {/* Body */}
      <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
        {/* Time rows */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
          <FontAwesome name="calendar" size={13} color={PRIMARY} style={{ marginRight: 8, width: 14 }} />
          <Text style={{ fontSize: 13, color: "#475569", width: 70 }}>Bắt đầu:</Text>
          <Text style={{ flex: 1, fontSize: 13, color: "#0F172A", fontWeight: "500" }} numberOfLines={1}>
            {quiz.quiz_startTime ? formatDateTime(quiz.quiz_startTime) : "Không giới hạn"}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
          <FontAwesome name="clock-o" size={14} color={DANGER} style={{ marginRight: 8, width: 14 }} />
          <Text style={{ fontSize: 13, color: "#475569", width: 70 }}>Kết thúc:</Text>
          <Text style={{ flex: 1, fontSize: 13, color: "#0F172A", fontWeight: "500" }} numberOfLines={1}>
            {quiz.quiz_endTime ? formatDateTime(quiz.quiz_endTime) : "Không giới hạn"}
          </Text>
        </View>

        {/* Stats pills */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 999,
              backgroundColor: "#F1F5F9",
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#334155", marginRight: 4 }}>
              {totalQuestions}
            </Text>
            <Text style={{ fontSize: 12, color: "#64748B" }}>câu hỏi</Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 999,
              backgroundColor: "#D4EEE8",
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "700", color: PRIMARY, marginRight: 4 }}>
              {totalPoints}
            </Text>
            <Text style={{ fontSize: 12, color: PRIMARY }}>điểm</Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      {canOpen ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderTopWidth: 1,
            borderTopColor: PRIMARY_SOFT_BORDER,
            backgroundColor: "rgba(66, 165, 159, 0.06)",
          }}
        >
          {/* Sender can edit → show two-button layout */}
          {isMine && (isDraft || senderCanEdit) ? (
            <>
              <TouchableOpacity
                onPress={() => onEdit?.()}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={{ flexDirection: "row", alignItems: "center" }}
              >
                <FontAwesome name="pencil" size={12} color={PRIMARY} style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 13, fontWeight: "600", color: PRIMARY }}>
                  {isDraft ? "Sửa bản nháp" : "Sửa"}
                </Text>
              </TouchableOpacity>
              {!isDraft && (
                <TouchableOpacity
                  onPress={() => onViewResults?.()}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  style={{ flexDirection: "row", alignItems: "center" }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "600", color: PRIMARY, marginRight: 4 }}>
                    Xem kết quả
                  </Text>
                  <FontAwesome name="chevron-right" size={11} color={PRIMARY} />
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <Text style={{ fontSize: 13, fontWeight: "600", color: PRIMARY }}>{footerLabel}</Text>
              <FontAwesome name="chevron-right" size={12} color={PRIMARY} />
            </>
          )}
        </View>
      ) : (
        <View
          style={{
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderTopWidth: 1,
            borderTopColor: PRIMARY_SOFT_BORDER,
            backgroundColor: "rgba(148, 163, 184, 0.08)",
          }}
        >
          <Text style={{ fontSize: 12, color: "#64748B", textAlign: "center" }}>
            {footerLabel}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
