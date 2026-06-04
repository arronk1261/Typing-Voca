import { create } from "zustand";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  loadUserData,
  saveProgress,
  saveStudySession,
  saveUserState,
} from "@/lib/sync/userData";
import { readLocalProfile, writeLocalProfile } from "@/lib/sync/localProfile";
import { appendLocalSession } from "@/lib/sync/localStats";
import { computeStreakOnComplete, todayKey } from "@/lib/streak";
import { computeProgressUpdate } from "@/lib/srs";
import type {
  Progress,
  QuestionResult,
  StudySession,
  WordLevel,
} from "@/types";

export interface SessionCommitInput {
  results: QuestionResult[];
  level: WordLevel;
  categories: string[];
}

export interface SessionCommitOutcome {
  learnedCount: number;
  correctFirstTry: number;
  avgStars: number | null;
  avgScore: number | null;
  reviewCount: number;
}

interface UserStoreState {
  userId: string | null;
  configured: boolean;
  hydrated: boolean;
  onboarded: boolean;
  level: WordLevel;
  streak: number;
  lastStudyDate: string | null;
  totalLearned: number;
  preferredCategories: string[];
  progress: Record<number, Progress>;

  hydrate: (userId: string | null) => Promise<void>;
  setLevel: (level: WordLevel) => void;
  setPreferredCategories: (categories: string[]) => void;
  markStudiedToday: (learnedCount: number) => void;
  commitSession: (input: SessionCommitInput) => SessionCommitOutcome;
  reviewWordIds: () => number[];
  reset: () => void;
}

const initialState = {
  userId: null as string | null,
  configured: isSupabaseConfigured,
  hydrated: false,
  onboarded: false,
  level: 1 as WordLevel,
  streak: 0,
  lastStudyDate: null as string | null,
  totalLearned: 0,
  preferredCategories: [] as string[],
  progress: {} as Record<number, Progress>,
};

export const useUserStore = create<UserStoreState>((set, get) => ({
  ...initialState,

  hydrate: async (userId) => {
    if (isSupabaseConfigured && userId) {
      const { userState, progress } = await loadUserData(userId);
      const progressMap: Record<number, Progress> = {};
      for (const row of progress) progressMap[row.word_id] = row;
      set({
        userId,
        configured: true,
        hydrated: true,
        onboarded: userState?.onboarded ?? false,
        level: (userState?.level ?? 1) as WordLevel,
        streak: userState?.streak ?? 0,
        lastStudyDate: userState?.last_study_date ?? null,
        totalLearned: userState?.total_learned ?? 0,
        preferredCategories: userState?.preferred_categories ?? [],
        progress: progressMap,
      });
      return;
    }

    const profile = readLocalProfile();
    set({
      userId: null,
      configured: isSupabaseConfigured,
      hydrated: true,
      onboarded: profile.level !== null,
      level: (profile.level ?? 1) as WordLevel,
      streak: profile.streak,
      lastStudyDate: profile.lastStudyDate,
      totalLearned: profile.totalLearned,
      preferredCategories: profile.preferredCategories,
      progress: {},
    });
  },

  setLevel: (level) => {
    set({ level, onboarded: true });
    persist(get, { level, onboarded: true });
  },

  setPreferredCategories: (categories) => {
    set({ preferredCategories: categories });
    persist(get, { preferred_categories: categories });
  },

  markStudiedToday: (learnedCount) => {
    const { lastStudyDate, streak, totalLearned } = get();
    const update = computeStreakOnComplete(lastStudyDate, streak);
    const nextTotal = totalLearned + Math.max(0, learnedCount);
    set({
      streak: update.streak,
      lastStudyDate: update.lastStudyDate,
      totalLearned: nextTotal,
    });
    persist(get, {
      streak: update.streak,
      last_study_date: update.lastStudyDate,
      total_learned: nextTotal,
    });
  },

  commitSession: ({ results, level, categories }) => {
    const today = todayKey();
    const state = get();

    const updatedRows: Progress[] = [];
    const nextProgress = { ...state.progress };
    for (const result of results) {
      const ownerId = state.userId ?? "guest";
      const row = computeProgressUpdate(
        state.progress[result.wordId],
        result,
        ownerId,
        result.wordId,
        today,
      );
      nextProgress[result.wordId] = row;
      updatedRows.push(row);
    }

    const learnedCount = results.length;
    const correctFirstTry = results.filter((r) => r.firstTryCorrect).length;
    const scored = results.filter((r) => typeof r.shadowStars === "number");
    const avgStars =
      scored.length > 0
        ? scored.reduce((sum, r) => sum + (r.shadowStars ?? 0), 0) /
          scored.length
        : null;
    const scoredPoints = results.filter((r) => typeof r.shadowScore === "number");
    const avgScore =
      scoredPoints.length > 0
        ? scoredPoints.reduce((sum, r) => sum + (r.shadowScore ?? 0), 0) /
          scoredPoints.length
        : null;
    const reviewCount = updatedRows.filter((r) => r.in_review).length;

    const streakUpdate = computeStreakOnComplete(
      state.lastStudyDate,
      state.streak,
      today,
    );
    const nextTotal = state.totalLearned + learnedCount;

    set({
      progress: nextProgress,
      streak: streakUpdate.streak,
      lastStudyDate: streakUpdate.lastStudyDate,
      totalLearned: nextTotal,
    });

    persist(get, {
      streak: streakUpdate.streak,
      last_study_date: streakUpdate.lastStudyDate,
      total_learned: nextTotal,
    });

    const summary: StudySession = {
      user_id: state.userId ?? "guest",
      study_date: today,
      level,
      categories,
      words_count: learnedCount,
      correct_first_try: correctFirstTry,
      avg_stars: avgStars,
      avg_score: avgScore,
      review_count: reviewCount,
    };

    if (state.configured && state.userId) {
      void saveProgress(updatedRows);
      void saveStudySession(summary);
    } else {
      appendLocalSession(summary);
    }

    return { learnedCount, correctFirstTry, avgStars, avgScore, reviewCount };
  },

  reviewWordIds: () =>
    Object.values(get().progress)
      .filter((p) => p.in_review)
      .map((p) => p.word_id),

  reset: () => set({ ...initialState, hydrated: true }),
}));

type PersistPatch = {
  level?: WordLevel;
  onboarded?: boolean;
  streak?: number;
  last_study_date?: string | null;
  total_learned?: number;
  preferred_categories?: string[];
};

function persist(get: () => UserStoreState, patch: PersistPatch): void {
  const { configured, userId } = get();
  if (configured && userId) {
    void saveUserState({ user_id: userId, ...patch });
    return;
  }
  writeLocalProfile({
    level: patch.level,
    streak: patch.streak,
    lastStudyDate: patch.last_study_date,
    totalLearned: patch.total_learned,
    preferredCategories: patch.preferred_categories,
  });
}
