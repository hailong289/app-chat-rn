import apiService from "./api.service";
import { consumeAiSse } from "./ai-stream.service";
import {
  QuizzResponse,
  SubmitQuizResultPayload,
  QuizResultResponse,
  QuizResultsListResponse,
} from "../types/quizz.type";

interface GenerateQuizzPayload {
  type: "document";
  question_type: "single_choice" | "multiple_choice" | "true_false" | "text";
  question_max_points: number;
  question_max: number;
  text?: string;
  file?: { uri: string; name: string; type: string };
}

interface CreateQuizzPayload {
  quiz_title: string;
  quiz_description: string;
  quiz_status: "draft" | "active";
  quiz_roomId: string;
  quiz_questions: QuizzResponse["quiz_questions"];
  quiz_startTime?: string;
  quiz_endTime?: string;
  quiz_allowRetake?: boolean;
  quiz_maxAttempts?: number;
}

interface UpdateQuizzPayload {
  quiz_title?: string;
  quiz_description?: string;
  quiz_status?: string;
  quiz_questions?: QuizzResponse["quiz_questions"];
  quiz_startTime?: string;
  quiz_endTime?: string;
  quiz_allowRetake?: boolean;
  quiz_maxAttempts?: number;
}

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function extractJsonCandidate(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");

  const direct = tryParseJson(withoutFence);
  if (direct !== undefined) return direct;

  const firstBrace = withoutFence.indexOf("{");
  const lastBrace = withoutFence.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return tryParseJson(withoutFence.slice(firstBrace, lastBrace + 1));
  }

  return undefined;
}

function normalizeQuizzResponse(value: unknown): QuizzResponse | undefined {
  if (!value) return undefined;

  if (typeof value === "string") {
    return normalizeQuizzResponse(extractJsonCandidate(value));
  }

  if (typeof value !== "object") return undefined;

  const candidate = value as Record<string, unknown>;
  if (Array.isArray(candidate.quiz_questions)) {
    return candidate as unknown as QuizzResponse;
  }

  if (candidate.metadata !== undefined) {
    return normalizeQuizzResponse(candidate.metadata);
  }

  if (candidate.data !== undefined) {
    return normalizeQuizzResponse(candidate.data);
  }

  return undefined;
}

export default class QuizzService {
  static async generateQuizz(
    body: GenerateQuizzPayload | FormData,
    options?: { onChunk?: (chunk: string) => void },
  ) {
    const payload = body instanceof FormData ? body : JSON.stringify(body);
    const { metadata, chunks } = await consumeAiSse("/ai/stream/quizz", {
      method: "POST",
      body: payload,
      onChunk: options?.onChunk,
    });

    let parsed = normalizeQuizzResponse(metadata);
    if (!parsed && chunks.length > 0) {
      parsed = normalizeQuizzResponse(chunks.join(""));
    }

    return {
      data: parsed ? { metadata: parsed } : { metadata: { quiz_questions: [] } },
    } as { data: { metadata: QuizzResponse; message?: string; statusCode?: number } };
  }

  static createQuizz(body: CreateQuizzPayload) {
    return apiService.post("/learning/quizz/create", body);
  }

  static updateQuizz(quizzId: string, body: UpdateQuizzPayload) {
    return apiService.patch(`/learning/quizz/update/${quizzId}`, body);
  }

  static getQuizz(quizzId: string) {
    return apiService.get(`/learning/quizz/${quizzId}`);
  }

  static getQuizzes(queryParams: { roomId: string; page: number; limit: number }) {
    return apiService.get(`/learning/quizz/list`, queryParams);
  }

  static deleteQuizz(quizzId: string) {
    return apiService.delete(`/learning/quizz/delete/${quizzId}`);
  }

  static getMyQuizzes(queryParams?: { page?: number; limit?: number; status?: string }) {
    return apiService.get("/quizz/my", queryParams);
  }

  static submitResult(quizId: string, body: SubmitQuizResultPayload) {
    return apiService.post(`/learning/quizz/${quizId}/submit`, body);
  }

  static getResults(quizId: string) {
    return apiService.get<QuizResultsListResponse>(`/learning/quizz/${quizId}/results`);
  }
}
