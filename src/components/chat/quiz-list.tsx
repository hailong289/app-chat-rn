import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import QuizzService from '../../service/quizz.service';
import { QuizzResponse } from '../../types/quizz.type';
import type { User } from '../../types/user.type';
import {
  canSendQuizInDrawer,
  canViewResultsInDrawer,
  canEditQuizInDrawer,
  canDeleteQuizInDrawer,
  canTakeQuizInDrawer,
} from '../../libs/quiz-permissions';

// ── Time status helper ────────────────────────────────────────────────
const getQuizTimeStatus = (quiz: QuizzResponse) => {
  const now = new Date();
  if (quiz.quiz_endTime && new Date(quiz.quiz_endTime) < now) {
    return { label: 'Đã kết thúc', color: '#ef4444', bg: '#fef2f2' };
  }
  if (quiz.quiz_startTime && new Date(quiz.quiz_startTime) > now) {
    return { label: 'Chưa bắt đầu', color: '#f59e0b', bg: '#fffbeb' };
  }
  if (quiz.quiz_status === 'active') {
    return { label: 'Đang mở', color: '#10b981', bg: '#f0fdf4' };
  }
  return { label: 'Nháp', color: '#6b7280', bg: '#f9fafb' };
};

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ── Props ─────────────────────────────────────────────────────────────
interface QuizListProps {
  roomId: string;
  user: User | null;
  onSendQuiz: (quiz: QuizzResponse) => void;
  onCreatePress: () => void;
  onTakeQuiz: (quiz: QuizzResponse) => void;
  onResultsPress: (quiz: QuizzResponse) => void;
  onEditPress: (quiz: QuizzResponse) => void;
  onDeletePress: (quiz: QuizzResponse) => void;
  refreshTrigger?: boolean;
}

const PAGE_SIZE = 5;

export default function QuizList({
  roomId,
  user,
  onSendQuiz,
  onTakeQuiz,
  onResultsPress,
  onEditPress,
  onDeletePress,
  refreshTrigger,
}: QuizListProps) {
  const [quizzes, setQuizzes] = useState<QuizzResponse[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchQuizzes = useCallback(
    async (p: number, reset = false) => {
      if (!roomId) return;
      p === 1 ? setIsLoading(true) : setIsLoadingMore(true);
      try {
        const res = await QuizzService.getQuizzes({ roomId, page: p, limit: PAGE_SIZE });
        const raw = (res.data as any)?.metadata;
        // API: { metadata: { data: [...], total_item, total_page, page } }
        const items: QuizzResponse[] = Array.isArray(raw?.data)
          ? raw.data
          : Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.quizzes)
          ? raw.quizzes
          : Array.isArray(raw?.items)
          ? raw.items
          : [];
        const totalPage = parseInt(raw?.total_page ?? '1', 10);
        const currentPage = parseInt(raw?.page ?? String(p), 10);
        if (currentPage >= totalPage || items.length < PAGE_SIZE) setHasMore(false);
        else setHasMore(true);
        setQuizzes(prev => (reset || p === 1 ? items : [...prev, ...items]));
      } catch {
        // silent fail
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [roomId],
  );

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchQuizzes(1, true);
  }, [roomId, refreshTrigger, fetchQuizzes]);

  const handleLoadMore = () => {
    if (isLoadingMore || !hasMore) return;
    const next = page + 1;
    setPage(next);
    fetchQuizzes(next);
  };

  const handleDelete = (quiz: QuizzResponse) => {
    Alert.alert('Xóa quiz', `Xóa "${quiz.quiz_title}"?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => onDeletePress(quiz) },
    ]);
  };

  const getDrawerActions = (quiz: QuizzResponse) => ({
    showSend: canSendQuizInDrawer(quiz, user),
    showResults: canViewResultsInDrawer(quiz),
    showTake: canTakeQuizInDrawer(quiz, user),
    showEdit: canEditQuizInDrawer(quiz, user),
    showDelete: canDeleteQuizInDrawer(quiz, user),
  });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#42A59F" />
      </View>
    );
  }

  if (!Array.isArray(quizzes) || quizzes.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>📝</Text>
        <Text style={styles.emptyText}>Chưa có quizz nào</Text>
        <Text style={styles.emptyHint}>Nhấn "＋ Tạo quizz" để tạo quiz đầu tiên</Text>
      </View>
    );
  }


  return (
    <View>
      {(Array.isArray(quizzes) ? quizzes : []).map(quiz => {
        const status = getQuizTimeStatus(quiz);
        const totalPoints = quiz.quiz_questions?.reduce((s, q) => s + q.points, 0) ?? 0;
        const questionCount = quiz.quiz_questions?.length ?? 0;
        const actions = getDrawerActions(quiz);
        const hasPrimaryActions = actions.showSend || actions.showResults || actions.showTake;
        const hasCreatorActions = actions.showEdit || actions.showDelete;

        return (
          <View key={quiz._id || quiz.id} style={styles.card}>
            {/* Title row */}
            <View style={styles.titleRow}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {quiz.quiz_title}
              </Text>
              {/* Status chip */}
              <View style={[styles.chip, { backgroundColor: status.bg }]}>
                <Text style={[styles.chipText, { color: status.color }]}>
                  {status.label}
                </Text>
              </View>
            </View>

            {/* Sent chip */}
            {quiz.is_send && (
              <View style={[styles.chip, styles.sentChip]}>
                <Text style={styles.sentChipText}>✓ Đã gửi</Text>
              </View>
            )}

            {/* Description */}
            {!!quiz.quiz_description && (
              <Text style={styles.cardDesc} numberOfLines={2}>
                {quiz.quiz_description}
              </Text>
            )}

            {/* Stats row */}
            <View style={styles.statsRow}>
              <Text style={styles.statText}>📋 {questionCount} câu</Text>
              <Text style={styles.statText}>⭐ {totalPoints} điểm</Text>
              {quiz.quiz_startTime && (
                <Text style={styles.statText} numberOfLines={1}>
                  🕐 {formatDateTime(quiz.quiz_startTime)}
                </Text>
              )}
            </View>

            {/* Action buttons — permissions match app-chat-fe quizz-list */}
            {(hasPrimaryActions || hasCreatorActions) && (
            <View style={styles.actionSection}>
              {hasPrimaryActions && (
              <View style={styles.actionRow}>
                {actions.showResults ? (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.resultBtn, styles.actionBtnFlex]}
                    onPress={() => onResultsPress(quiz)}
                  >
                    <FontAwesome name="bar-chart" size={12} color="#6366f1" />
                    <Text style={[styles.actionBtnText, { color: '#6366f1' }]}>
                      Kết quả
                    </Text>
                  </TouchableOpacity>
                ) : actions.showSend ? (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.sendBtn, styles.actionBtnFlex]}
                    onPress={() => onSendQuiz(quiz)}
                  >
                    <FontAwesome name="send" size={12} color="#fff" />
                    <Text style={[styles.actionBtnText, { color: '#fff' }]}>
                      Gửi vào chat
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {actions.showTake && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.takeBtn, styles.actionBtnFlex]}
                    onPress={() => onTakeQuiz(quiz)}
                  >
                    <FontAwesome name="pencil" size={12} color="#42A59F" />
                    <Text style={[styles.actionBtnText, { color: '#42A59F' }]}>
                      Làm bài
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              )}

              {hasCreatorActions && (
                <View style={styles.creatorRow}>
                  {actions.showEdit && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.editBtn, styles.creatorBtnFlex]}
                    onPress={() => onEditPress(quiz)}
                  >
                    <FontAwesome name="edit" size={12} color="#f59e0b" />
                    <Text style={[styles.actionBtnText, { color: '#f59e0b' }]}>Sửa</Text>
                  </TouchableOpacity>
                  )}
                  {actions.showDelete && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn, styles.creatorBtnFlex]}
                    onPress={() => handleDelete(quiz)}
                  >
                    <FontAwesome name="trash" size={12} color="#ef4444" />
                    <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Xóa</Text>
                  </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
            )}
          </View>
        );
      })}

      {/* Load more */}
      {hasMore && (
        <TouchableOpacity
          style={styles.loadMoreBtn}
          onPress={handleLoadMore}
          disabled={isLoadingMore}
        >
          {isLoadingMore ? (
            <ActivityIndicator size="small" color="#6366f1" />
          ) : (
            <Text style={styles.loadMoreText}>Xem thêm</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  emptyHint: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  cardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  chip: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sentChip: {
    backgroundColor: '#eff6ff',
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  sentChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563eb',
  },
  cardDesc: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  statText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  actionSection: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'stretch',
  },
  creatorRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'stretch',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    minHeight: 36,
  },
  actionBtnFlex: {
    flex: 1,
  },
  creatorBtnFlex: {
    flex: 1,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sendBtn: {
    backgroundColor: '#42A59F',
  },
  resultBtn: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  takeBtn: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  editBtn: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 10,
  },
  deleteBtn: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 10,
  },
  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  loadMoreText: {
    fontSize: 13,
    color: '#6366f1',
    fontWeight: '600',
  },
});
