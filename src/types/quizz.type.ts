export type QuizzType = "single_choice" | "multiple_choice" | "true_false" | "text";
export type InputType = "text" | "file";

export interface QuizzAnswer {
  answer_text: string;
  is_correct: boolean;
  points: number;
}

export interface QuizzQuestion {
  question_text: string;
  question_type: QuizzType;
  points: number;
  order: number;
  explanation: string;
  answers: QuizzAnswer[];
}

export interface QuizzResponse {
  id?: string;
  _id?: string;
  quiz_id?: string;
  quiz_title: string;
  quiz_description: string;
  quiz_status: string;
  quiz_questions: QuizzQuestion[];
  quiz_createdBy?: string;
  quiz_startTime?: string;
  quiz_endTime?: string;
  quiz_allowRetake?: boolean;
  quiz_maxAttempts?: number;
  roomId?: string;
  createdAt?: string;
  updatedAt?: string;
  quiz_results?: QuizResultResponse[];
  is_send?: boolean;
  quiz_roomId?: string;
}

export interface QuizzForm {
  inputType: InputType;
  quizzType: QuizzType;
  textContent: string;
  file: { uri: string; name: string; type: string } | null;
  numberOfQuestions: string;
  totalScore: string;
}

export interface CreateQuizzModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId?: string;
  userId?: string;
}

export interface QuizzUserAnswer {
  questionIndex: number;
  selectedAnswers: number[];
  textAnswer?: string;
}

export interface UserAnswerPayload {
  question_index: number;
  selected_answer_indices: number[];
  text_answer: string;
  is_correct: boolean;
  points_earned: number;
  answered_at: string;
}

export interface SubmitQuizResultPayload {
  user_answers: UserAnswerPayload[];
  total_score: number;
  max_score: number;
  correct_count: number;
  total_questions: number;
  started_at: string;
  completed_at: string;
  time_taken: number;
  is_completed: boolean;
  is_submitted: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  correct_count: number;
  total_score: number;
  max_score: number;
  time_taken: number;
  is_completed: boolean;
}

export interface QuizResultsListResponse {
  message: string;
  statusCode: number;
  metadata: {
    results: QuizResultResponse[];
    leaderboard: LeaderboardEntry[];
    my_result?: QuizResultResponse;
    quiz_id: string;
    quiz_title: string;
    total_participants: number;
    total_submissions: number;
  };
}

export interface QuizResultResponse {
  _id?: string;
  user_id: string;
  user_answers: UserAnswerPayload[];
  total_score: number;
  max_score: number;
  correct_count: number;
  total_questions: number;
  started_at: string;
  completed_at: string | null;
  time_taken: number;
  is_completed: boolean;
  is_submitted: boolean;
  quiz?: QuizzResponse;
}

export interface QuizzScoreEntry {
  userId: string;
  fullname: string;
  avatar?: string;
  score: number;
  totalScore: number;
  percentage: number;
  correctCount: number;
  totalQuestions: number;
  completedAt: string;
  timeTaken?: number;
}

export interface TakeQuizzModalProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: QuizzResponse;
  userId: string;
  userFullname: string;
  userAvatar?: string;
  hasCompleted?: boolean;
}
