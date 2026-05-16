import apiService from "./api.service";
import { consumeAiSse } from "./ai-stream.service";
import {
  FlashcardDeck,
  Flashcard,
  CreateFlashcardDeckPayload,
  CreateFlashcardPayload,
  UpdateFlashcardPayload,
  FlashcardProgressPayload,
} from "../types/flashcard.type";

export interface GenerateFlashcardResponse {
  deck_name: string;
  deck_description: string;
  deck_level: string;
  deck_language: string;
  deck_tags: string[];
  flashcards: Array<{
    card_front: string;
    card_back: string;
    card_hint: string;
    card_tags: string[];
    card_difficulty: number;
  }>;
}

export const flashcardService = {
  createDeck: async (payload: CreateFlashcardDeckPayload): Promise<FlashcardDeck> => {
    const response = await apiService.post("/learning/flashcard/deck/create", payload);
    return (response.data as any)?.metadata;
  },

  getListDeck: async (): Promise<FlashcardDeck[]> => {
    const response = await apiService.get("/learning/flashcard/deck/list");
    return (response.data as any)?.metadata || [];
  },

  getListFlashcard: async (params: { page?: number; limit?: number; userId?: string; deckId?: string }): Promise<any> => {
    const response = await apiService.get("/learning/flashcard/list", params);
    return (response.data as any)?.metadata;
  },

  deleteDeck: async (id: string): Promise<any> => {
    const response = await apiService.delete(`/learning/flashcard/deck/delete/${id}`);
    return response.data;
  },

  cloneDeck: async (deckId: string): Promise<FlashcardDeck> => {
    const response = await apiService.post(`/learning/flashcard/deck/clone`, { deck_id: deckId });
    return (response.data as any)?.metadata;
  },

  updateDeck: async (id: string, payload: Partial<CreateFlashcardDeckPayload>): Promise<FlashcardDeck> => {
    const response = await apiService.patch(`/learning/flashcard/deck/update/${id}`, payload);
    return (response.data as any)?.metadata;
  },

  createCard: async (payload: CreateFlashcardPayload): Promise<Flashcard> => {
    const response = await apiService.post("/learning/flashcard/create", payload);
    return (response.data as any)?.metadata;
  },

  updateCard: async (cardId: string, payload: UpdateFlashcardPayload): Promise<Flashcard> => {
    const response = await apiService.patch(`/learning/flashcard/update/${cardId}`, payload);
    return (response.data as any)?.metadata;
  },

  deleteCard: async (cardId: string): Promise<any> => {
    const response = await apiService.delete(`/learning/flashcard/delete/${cardId}`);
    return response.data;
  },

  generateFlashcard: async (
    payload: FormData | Record<string, unknown>,
    options?: { onChunk?: (chunk: string) => void },
  ): Promise<GenerateFlashcardResponse> => {
    const requestBody = payload instanceof FormData ? payload : JSON.stringify(payload);
    const { metadata, chunks } = await consumeAiSse("/ai/stream/generate-flashcard", {
      method: "POST",
      body: requestBody,
      onChunk: options?.onChunk,
    });
    if (metadata) return metadata as GenerateFlashcardResponse;

    if (chunks.length > 0) {
      try {
        return JSON.parse(chunks.join("")) as GenerateFlashcardResponse;
      } catch {
        // fall through
      }
    }

    return {
      deck_name: "",
      deck_description: "",
      deck_level: "beginner",
      deck_language: "vi",
      deck_tags: [],
      flashcards: [],
    };
  },

  updateProgress: async (cardId: string, payload: FlashcardProgressPayload): Promise<any> => {
    const response = await apiService.patch(`/learning/flashcard/progress/${cardId}`, payload);
    return response.data;
  },
};
