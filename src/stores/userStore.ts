import { create } from "zustand";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  loadRecentSessions,
  loadUserData,
  saveProgress,
  saveReviewLogs,
  saveStudySession,
  saveUserState,
} from "@/lib/sync/userData";
import { readLocalProfile, writeLocalProfile } from "@/lib/sync/localProfile";
import { appendLocalSession } from "@/lib/sync/localStats";
import {
  appendRecentWindow,
  readRecentWindow,
  sessionToWindowEntry,
  type SessionWindowEntry,
} from "@/lib/sync/recentWindow";
import { computeStreakOnComplete, todayKey } from "@/lib/streak";
import { computeProgressUpdate, gradeFor, isLapsed, isReviewTrigger } from "@/lib/srs";
import { applyCalibration } from "@/lib/words/calibration";
import type { LevelTestOutcome } from "@/lib/words/levelScore";
import type {
  Progress,
  QuestionResult,
  ReviewLog,
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
  reviewTriggers: number;
}

interface UserStoreState {
  userId: string | null;
  configured: boolean;
  hydrated: boolean;
  onboarded: boolean;
  level: WordLevel;
  levelProvisional: boolean;
  calibrationQuestions: number;
  calibrationCorrect: number;
  streak: number;
  lastStudyDate: string | null;
  totalLearned: number;
  preferredCategories: string[];
  progress: Record<number, Progress>;
  recentSessions: SessionWindowEntry[];

  hydrate: (userId: string | null) => Promise<void>;
  setLevel: (level: WordLevel) => void;
  completeOnboarding: (outcome: LevelTestOutcome) => void;
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
  levelProvisional: true,
  calibrationQuestions: 0,
  calibrationCorrect: 0,
  streak: 0,
  lastStudyDate: null as string | null,
  totalLearned: 0,
  preferredCategories: [] as string[],
  progress: {} as Record<number, Progress>,
  recentSessions: [] as SessionWindowEntry[],
};

export const useUserStore = create<UserStoreState>((set, get) => ({
  ...initialState,

  hydrate: async (userId) => {
    if (isSupabaseConfigured && userId) {
      const [{ userState, progress }, recent] = await Promise.all([
        loadUserData(userId),
        loadRecentSessions(userId, 5),
      ]);
      const progressMap: Record<number, Progress> = {};
      for (const row of progress) progressMap[row.word_id] = row;
      const recentSessions =
        recent.length > 0 ? recent.map(sessionToWindowEntry) : readRecentWindow();
      set({
        userId,
        configured: true,
        hydrated: true,
        onboarded: userState?.onboarded ?? false,
        level: (userState?.level ?? 1) as WordLevel,
        levelProvisional: userState?.level_provisional ?? true,
        calibrationQuestions: userState?.calibration_questions ?? 0,
        calibrationCorrect: userState?.calibration_correct ?? 0,
        streak: userState?.streak ?? 0,
        lastStudyDate: userState?.last_study_date ?? null,
        totalLearned: userState?.total_learned ?? 0,
        preferredCategories: userState?.preferred_categories ?? [],
        progress: progressMap,
        recentSessions,
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
      levelProvisional: profile.levelProvisional,
      calibrationQuestions: profile.calibrationQuestions,
      calibrationCorrect: profile.calibrationCorrect,
      streak: profile.streak,
      lastStudyDate: profile.lastStudyDate,
      totalLearned: profile.totalLearned,
      preferredCategories: profile.preferredCategories,
      progress: {},
      recentSessions: readRecentWindow(),
    });
  },

  setLevel: (level) => {
    set({ level, onboarded: true });
    persist(get, { level, onboarded: true });
  },

  completeOnboarding: (outcome) => {
    set({
      level: outcome.level,
      onboarded: true,
      levelProvisional: true,
      calibrationQuestions: 0,
      calibrationCorrect: 0,
    });
    persist(get, {
      level: outcome.level,
      onboarded: true,
      level_provisional: true,
      calibration_questions: 0,
      calibration_correct: 0,
    });
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
    const reviewLogs: ReviewLog[] = [];
    const nextProgress = { ...state.progress };
    for (const result of results) {
      const ownerId = state.userId ?? "guest";
      const prev = state.progress[result.wordId];
      const row = computeProgressUpdate(prev, result, ownerId, result.wordId, today);
      nextProgress[result.wordId] = row;
      updatedRows.push(row);
      // 9-4: per-review 로그(SM-2 등급·경과일·EF·간격) — 향후 FSRS 학습 원천
      reviewLogs.push({
        user_id: ownerId,
        word_id: result.wordId,
        grade: gradeFor(result),
        elapsed_days: prev?.last_seen ? daysBetween(prev.last_seen, today) : 0,
        ease_factor: row.ease_factor,
        interval_days: row.interval_days,
        reps: row.pass_count,
        shadow_stars: result.shadowStars,
        reviewed_at: new Date().toISOString(),
      });
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
    // 9-2a: 승급 판단·세션 기록 모두 '이번 세션 신규 복습 진입(실패) 수'를 쓴다.
    // (잔존 in_review 수는 이미 잘 맞히고 있는 복습 단어까지 포함돼 복습률을 부풀린다)
    const reviewTriggers = results.filter(isReviewTrigger).length;

    const windowEntry: SessionWindowEntry = {
      total: learnedCount,
      firstTryCorrect: correctFirstTry,
      reviewTriggers,
      starsSum: scored.reduce((sum, r) => sum + (r.shadowStars ?? 0), 0),
      starsCount: scored.length,
    };
    // 9-C1: 메모리 윈도우(로그인 시 클라우드로 시드됨)에 이어붙이고, 로컬 캐시도 갱신
    appendRecentWindow(windowEntry);
    const recentSessions = [...state.recentSessions, windowEntry].slice(-5);

    const streakUpdate = computeStreakOnComplete(
      state.lastStudyDate,
      state.streak,
      today,
    );
    const nextTotal = state.totalLearned + learnedCount;

    const calibrated = applyCalibration(
      {
        level: state.level,
        levelProvisional: state.levelProvisional,
        calibrationQuestions: state.calibrationQuestions,
        calibrationCorrect: state.calibrationCorrect,
      },
      { questions: learnedCount, correct: correctFirstTry },
    );

    set({
      progress: nextProgress,
      streak: streakUpdate.streak,
      lastStudyDate: streakUpdate.lastStudyDate,
      totalLearned: nextTotal,
      level: calibrated.level,
      levelProvisional: calibrated.levelProvisional,
      calibrationQuestions: calibrated.calibrationQuestions,
      calibrationCorrect: calibrated.calibrationCorrect,
      recentSessions,
    });

    persist(get, {
      streak: streakUpdate.streak,
      last_study_date: streakUpdate.lastStudyDate,
      total_learned: nextTotal,
      level: calibrated.level,
      level_provisional: calibrated.levelProvisional,
      calibration_questions: calibrated.calibrationQuestions,
      calibration_correct: calibrated.calibrationCorrect,
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
      review_count: reviewTriggers,
      weak_words: results.flatMap((r) => r.weakWords ?? []),
    };

    if (state.configured && state.userId) {
      void saveProgress(updatedRows);
      void saveStudySession(summary);
      void saveReviewLogs(reviewLogs);
    } else {
      appendLocalSession(summary);
    }

    return { learnedCount, correctFirstTry, avgStars, avgScore, reviewTriggers };
  },

  reviewWordIds: () =>
    Object.values(get().progress)
      .filter(isLapsed)
      .map((p) => p.word_id),

  reset: () => set({ ...initialState, hydrated: true }),
}));

function daysBetween(fromKey: string, toKey: string): number {
  const from = new Date(`${fromKey}T00:00:00`).getTime();
  const to = new Date(`${toKey}T00:00:00`).getTime();
  return Math.max(0, Math.round((to - from) / 86_400_000));
}

type PersistPatch = {
  level?: WordLevel;
  onboarded?: boolean;
  level_provisional?: boolean;
  calibration_questions?: number;
  calibration_correct?: number;
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
    levelProvisional: patch.level_provisional,
    calibrationQuestions: patch.calibration_questions,
    calibrationCorrect: patch.calibration_correct,
    streak: patch.streak,
    lastStudyDate: patch.last_study_date,
    totalLearned: patch.total_learned,
    preferredCategories: patch.preferred_categories,
  });
}
