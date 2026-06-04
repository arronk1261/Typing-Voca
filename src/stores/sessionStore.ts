import { create } from "zustand";
import type { QuestionResult, StudyStage, Word, WordLevel } from "@/types";

export const SET_SIZE = 10;
export const MAX_HEARTS = 3;

export type SessionStatus = "idle" | "active" | "finished";
export type SessionMode = "default" | "category" | "review";

export interface SessionConfig {
  mode: SessionMode;
  level: WordLevel;
  categories: string[];
}

const DEFAULT_CONFIG: SessionConfig = {
  mode: "default",
  level: 1,
  categories: [],
};

interface SessionState {
  words: Word[];
  currentIndex: number;
  stage: StudyStage;
  hearts: number;
  attempts: number;
  results: QuestionResult[];
  status: SessionStatus;
  config: SessionConfig;
  committed: boolean;

  startSession: (words: Word[], config?: SessionConfig) => void;
  markCommitted: () => void;
  loseHeart: () => void;
  registerAttempt: () => void;
  completeTyping: (firstTryCorrect: boolean, heartsDepleted: boolean) => void;
  completeShadowing: (stars: number | null, score: number | null, skipped: boolean) => void;
  advance: () => void;
  reset: () => void;
}

const initialState = {
  words: [] as Word[],
  currentIndex: 0,
  stage: "typing" as StudyStage,
  hearts: MAX_HEARTS,
  attempts: 0,
  results: [] as QuestionResult[],
  status: "idle" as SessionStatus,
  config: DEFAULT_CONFIG,
  committed: false,
};

export const useSessionStore = create<SessionState>((set, get) => ({
  ...initialState,

  startSession: (words, config = DEFAULT_CONFIG) =>
    set({
      ...initialState,
      words,
      config,
      status: words.length > 0 ? "active" : "finished",
    }),

  markCommitted: () => set({ committed: true }),

  loseHeart: () => set((s) => ({ hearts: Math.max(0, s.hearts - 1) })),

  registerAttempt: () => set((s) => ({ attempts: s.attempts + 1 })),

  completeTyping: (firstTryCorrect, heartsDepleted) => {
    const { words, currentIndex, attempts, results } = get();
    const word = words[currentIndex];
    if (!word) return;
    const result: QuestionResult = {
      wordId: word.id,
      firstTryCorrect,
      heartsDepleted,
      attempts: attempts + 1,
      shadowStars: null,
      shadowScore: null,
      shadowSkipped: false,
    };
    set({ results: [...results, result], stage: "shadowing" });
  },

  completeShadowing: (stars, score, skipped) => {
    const { results } = get();
    if (results.length === 0) return;
    const last = results[results.length - 1];
    const updated: QuestionResult = {
      ...last,
      shadowStars: stars,
      shadowScore: score,
      shadowSkipped: skipped,
    };
    set({ results: [...results.slice(0, -1), updated] });
  },

  advance: () => {
    const { currentIndex, words } = get();
    const nextIndex = currentIndex + 1;
    if (nextIndex >= words.length) {
      set({ status: "finished" });
      return;
    }
    set({
      currentIndex: nextIndex,
      stage: "typing",
      hearts: MAX_HEARTS,
      attempts: 0,
    });
  },

  reset: () => set({ ...initialState }),
}));
