import { findMyQuizResult, getQuizStatus } from './helpers';
import type { QuizzResponse, QuizResultResponse } from '../types/quizz.type';
import type { User } from '../types/user.type';

/** Normalize quiz_createdBy to string id. */
export function getQuizCreatorId(quiz: QuizzResponse): string {
  if (!quiz.quiz_createdBy) return '';
  const raw = quiz.quiz_createdBy as string | { _id?: string; id?: string };
  return String(typeof raw === 'object' ? raw._id ?? raw.id ?? '' : raw);
}

/** Match web quizz-list isQuizCreator. */
export function isQuizCreator(quiz: QuizzResponse, user: User | null | undefined): boolean {
  if (!user) return false;
  const creatorId = getQuizCreatorId(quiz);
  if (!creatorId) return false;
  return creatorId === String(user._id) || creatorId === String(user.id);
}

function findMyResult(
  quiz: QuizzResponse,
  user: User | null | undefined,
): QuizResultResponse | undefined {
  return findMyQuizResult(quiz.quiz_results, user);
}

// ── Drawer list (app-chat-fe quizz-list.tsx) ─────────────────────────

/** Chưa gửi vào chat. Bản nháp chỉ creator gửi; quiz active mọi thành viên có thể gửi (web). */
export function canSendQuizInDrawer(quiz: QuizzResponse, user: User | null | undefined): boolean {
  if (quiz.is_send) return false;
  if (quiz.quiz_status === 'draft') return isQuizCreator(quiz, user);
  return true;
}

/** Everyone can xem kết quả khi quiz đã gửi vào chat. */
export function canViewResultsInDrawer(quiz: QuizzResponse): boolean {
  return !!quiz.is_send;
}

/** Chỉ người tạo quiz. */
export function canEditQuizInDrawer(quiz: QuizzResponse, user: User | null | undefined): boolean {
  return isQuizCreator(quiz, user);
}

/** Chỉ người tạo quiz. */
export function canDeleteQuizInDrawer(quiz: QuizzResponse, user: User | null | undefined): boolean {
  return isQuizCreator(quiz, user);
}

/**
 * Drawer không có nút Làm bài trên web.
 * RN giữ nút này nhưng chỉ cho thành viên (không phải creator) khi quiz đang mở.
 */
export function canTakeQuizInDrawer(quiz: QuizzResponse, user: User | null | undefined): boolean {
  if (isQuizCreator(quiz, user)) return false;
  if (quiz.quiz_status === 'draft') return false;

  const status = getQuizStatus(quiz);
  if (status.label === 'Đã kết thúc' || status.label === 'Chưa bắt đầu') return false;

  const myResult = findMyResult(quiz, user);
  if (myResult?.is_submitted && !quiz.quiz_allowRetake) return false;

  return true;
}

// ── Message card (app-chat-fe QuizMessageCard.tsx) ───────────────────

export interface QuizMessagePermissions {
  isDraft: boolean;
  isEnded: boolean;
  isNotStarted: boolean;
  isStarted: boolean;
  hasCompleted: boolean;
  canOpen: boolean;
  showAsViewResults: boolean;
  senderCanEdit: boolean;
  canTake: boolean;
}

export function getQuizMessagePermissions(
  quiz: QuizzResponse,
  user: User | null | undefined,
  isSender: boolean,
  roomId?: string,
): QuizMessagePermissions {
  const status = getQuizStatus(quiz);
  const isEnded = status.color === 'danger';
  const isNotStarted = status.label === 'Chưa bắt đầu';
  const isStarted = !quiz.quiz_startTime || new Date(quiz.quiz_startTime) <= new Date();
  const isDraft = quiz.quiz_status === 'draft';
  const myResult = findMyResult(quiz, user);
  const hasCompleted = !!myResult?.is_submitted;
  const quizId = quiz._id ?? quiz.quiz_id;

  const canOpen = (isSender && isDraft)
    ? !!quizId && !!roomId && !!quiz.quiz_id
    : !isDraft && (isSender || (isStarted && !isEnded) || hasCompleted) && !!quizId;

  const showAsViewResults = (isSender && !isDraft) || hasCompleted;
  const senderCanEdit = isSender && (isNotStarted || isDraft) && !!roomId && !!quiz.quiz_id;

  const canTake =
    !isSender &&
    !isDraft &&
    isStarted &&
    !isEnded &&
    !!quizId &&
    (!hasCompleted || !!quiz.quiz_allowRetake);

  return {
    isDraft,
    isEnded,
    isNotStarted,
    isStarted,
    hasCompleted,
    canOpen,
    showAsViewResults,
    senderCanEdit,
    canTake,
  };
}
