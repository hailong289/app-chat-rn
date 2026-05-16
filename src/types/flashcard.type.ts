export interface Flashcard {
  _id?: string;
  id?: string;
  card_userId: string;
  card_deckId?: string;
  card_front: string;
  card_back: string;
  card_hint?: string;
  card_tags?: string[];
  card_image?: string;
  card_audio?: string;
  card_difficulty?: number;
  card_isPublic?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateFlashcardPayload {
  card_id?: string;
  card_deckId?: string;
  card_front: string;
  card_back: string;
  card_hint?: string;
  card_tags?: string[];
  card_image?: string;
  card_audio?: string;
  card_difficulty?: number;
  card_isPublic?: boolean;
}

export interface UpdateFlashcardPayload {
  card_deckId?: string;
  card_front?: string;
  card_back?: string;
  card_hint?: string;
  card_tags?: string[];
  card_image?: string;
  card_audio?: string;
  card_difficulty?: number;
  card_isPublic?: boolean;
}

export type DeckLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface FlashcardDeck {
  _id?: string;
  id?: string;
  deck_id: string;
  deck_userId: string;
  deck_name: string;
  deck_description?: string;
  deck_image?: string;
  deck_tags?: string[];
  deck_isPublic?: boolean;
  deck_level?: DeckLevel;
  deck_language?: string;
  total_cards?: number;
  progress?: {
    new_cards: number;
    learning_cards: number;
    review_cards: number;
    mastered_cards: number;
    total_cards: number;
  };
  flashcards?: Flashcard[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateFlashcardDeckPayload {
  deck_userId?: string;
  deck_name: string;
  deck_description?: string;
  deck_image?: string;
  deck_tags?: string[];
  deck_isPublic?: boolean;
  deck_level?: DeckLevel;
  deck_language?: string;
  flashcards?: CreateFlashcardPayload[];
}

export interface UpdateFlashcardDeckPayload {
  deck_name?: string;
  deck_description?: string;
  deck_image?: string;
  deck_tags?: string[];
  deck_isPublic?: boolean;
  deck_level?: DeckLevel;
  deck_language?: string;
}

export interface FlashcardProgressPayload {
  mastery_level?: number;
  review_count?: number;
  correct_count?: number;
  incorrect_count?: number;
  is_mastered?: boolean;
  is_favorite?: boolean;
  status?: 'new' | 'learning' | 'review' | 'mastered';
  next_review?: string;
}
