import { create } from "zustand";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  loadAchievements,
  loadRecentSessions,
  loadUserData,
  saveAchievements,
  saveDailyRing,
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
import { bumpDailyRing } from "@/lib/sync/dailyRing";
import { recordStudyDay } from "@/lib/sync/studyDays";
import { applyStreak, computeStreakOnComplete, todayKey } from "@/lib/streak";
import { computeProgressUpdate, gradeFor, isLapsed, isReviewTrigger } from "@/lib/srs";
import { buildSnapshot } from "@/lib/achievements/snapshot";
import { evaluate, type EarnedAchievement } from "@/lib/achievements/engine";
import { learnGoal, pronGoal } from "@/lib/achievements/rings";
import { applyCalibration } from "@/lib/words/calibration";
import type { LevelTestOutcome } from "@/lib/words/levelScore";
import type {
  DailyRing,
  Progress,
  QuestionResult,
  ReviewLog,
  StudySession,
  UserAchievement,
  WordLevel,
} from "@/types";

const FREEZE_CAP = 3;

export interface PersonalRecords {
  streak: boolean;
  accuracy: boolean;
  stars: boolean;
}

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
  // 10-3/10-7: 동기부여 — 이번 세션 신규 배지·경험치·개인 기록 경신·동결권 적립
  newAchievements: EarnedAchievement[];
  xpGained: number;
  records: PersonalRecords;
  freezesEarned: number;
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
  // 10-3: 동기부여 상태
  streakFreezes: number;
  xp: number;
  bestStreak: number;
  achievements: string[];

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
  streakFreezes: 0,
  xp: 0,
  bestStreak: 0,
  achievements: [] as string[],
};

export const useUserStore = create<UserStoreState>((set, get) => ({
  ...initialState,

  hydrate: async (userId) => {
    if (isSupabaseConfigured && userId) {
      const [{ userState, progress }, recent, achievements] = await Promise.all([
        loadUserData(userId),
        loadRecentSessions(userId, 5),
        loadAchievements(userId),
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
        streakFreezes: userState?.streak_freezes ?? 0,
        xp: userState?.xp ?? 0,
        bestStreak: userState?.best_streak ?? userState?.streak ?? 0,
        achievements,
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
      streakFreezes: profile.streakFreezes,
      xp: profile.xp,
      bestStreak: profile.bestStreak,
      achievements: profile.achievements,
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

    // 10-7: 동결권을 적용한 스트릭 — 하루 빠져도 동결권이 있으면 연속 보존
    const streakUpdate = applyStreak(
      state.lastStudyDate,
      state.streak,
      state.streakFreezes,
      today,
    );
    const nextBestStreak = Math.max(state.bestStreak, streakUpdate.streak);
    const nextFreezes = Math.min(
      FREEZE_CAP,
      state.streakFreezes - streakUpdate.freezesUsed + streakUpdate.freezesEarned,
    );
    const nextTotal = state.totalLearned + learnedCount;

    // 10-7: 개인 기록 경신 판단(과거의 나와 비교 — 충분한 표본이 쌓였을 때만)
    const thisAccuracy = learnedCount > 0 ? correctFirstTry / learnedCount : 0;
    const prevAccuracies = state.recentSessions
      .filter((e) => e.total > 0)
      .map((e) => e.firstTryCorrect / e.total);
    const accuracyRecord =
      prevAccuracies.length >= 3 &&
      thisAccuracy > 0 &&
      thisAccuracy > Math.max(...prevAccuracies);
    const prevStars = state.recentSessions
      .filter((e) => e.starsCount > 0)
      .map((e) => e.starsSum / e.starsCount);
    const starsRecord =
      avgStars !== null &&
      prevStars.length >= 2 &&
      avgStars > Math.max(...prevStars);
    const records: PersonalRecords = {
      streak: streakUpdate.changed && streakUpdate.streak > state.bestStreak,
      accuracy: accuracyRecord,
      stars: starsRecord,
    };

    // 10-4: 오늘의 학습 링 누적(학습/복습/발음) + 학습일 원장 적재
    const reviewDone = results.filter(
      (r) => state.progress[r.wordId]?.in_review,
    ).length;
    const pronDone = results.filter(
      (r) => typeof r.shadowStars === "number" && (r.shadowStars ?? 0) >= 2,
    ).length;
    const ring = bumpDailyRing(
      { learn: learnedCount, review: reviewDone, pron: pronDone },
      today,
    );
    const studyDays = recordStudyDay(today);

    // 10-3: 배지 판정 — 세션 종료 상태로 컨텍스트를 만들어 새로 달성한 배지만 산출
    const ctx = buildSnapshot({
      today,
      hour: new Date().getHours(),
      streak: streakUpdate.streak,
      bestStreak: nextBestStreak,
      prevBestStreak: state.bestStreak,
      totalLearned: nextTotal,
      earnedKeys: new Set(state.achievements),
      progressAfter: nextProgress,
      prevProgress: state.progress,
      results,
      studyDays,
    });
    const newAchievements = evaluate(ctx);
    const xpGained =
      learnedCount * 10 +
      correctFirstTry * 5 +
      Math.round((avgStars ?? 0) * scored.length * 2) +
      newAchievements.length * 50;
    const nextXp = state.xp + xpGained;
    const nextAchievements = [
      ...state.achievements,
      ...newAchievements.map((a) => a.key),
    ];

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
      streakFreezes: nextFreezes,
      xp: nextXp,
      bestStreak: nextBestStreak,
      achievements: nextAchievements,
    });

    persist(get, {
      streak: streakUpdate.streak,
      last_study_date: streakUpdate.lastStudyDate,
      total_learned: nextTotal,
      level: calibrated.level,
      level_provisional: calibrated.levelProvisional,
      calibration_questions: calibrated.calibrationQuestions,
      calibration_correct: calibrated.calibrationCorrect,
      streak_freezes: nextFreezes,
      xp: nextXp,
      best_streak: nextBestStreak,
      achievements: nextAchievements,
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
      const owner = state.userId;
      void saveProgress(updatedRows);
      void saveStudySession(summary);
      void saveReviewLogs(reviewLogs);
      if (newAchievements.length > 0) {
        const earnedAt = new Date().toISOString();
        const rows: UserAchievement[] = newAchievements.map((a) => ({
          user_id: owner,
          achievement_key: a.key,
          earned_at: earnedAt,
        }));
        void saveAchievements(rows);
      }
      const lGoal = learnGoal(state.recentSessions.map((e) => e.total));
      const ringRow: DailyRing = {
        user_id: owner,
        date: today,
        learn_goal: lGoal,
        learn_done: ring.learnDone,
        review_goal: Math.max(ring.reviewDone, reviewTriggers),
        review_done: ring.reviewDone,
        pron_goal: pronGoal(lGoal),
        pron_done: ring.pronDone,
      };
      void saveDailyRing(ringRow);
    } else {
      appendLocalSession(summary);
    }

    return {
      learnedCount,
      correctFirstTry,
      avgStars,
      avgScore,
      reviewTriggers,
      newAchievements,
      xpGained,
      records,
      freezesEarned: streakUpdate.freezesEarned,
    };
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
  streak_freezes?: number;
  xp?: number;
  best_streak?: number;
  achievements?: string[];
};

function persist(get: () => UserStoreState, patch: PersistPatch): void {
  const { configured, userId } = get();
  if (configured && userId) {
    // achievements는 user_achievements 테이블로 별도 저장되므로 user_state upsert에선 제외
    const { achievements: _a, ...statePatch } = patch;
    void _a;
    void saveUserState({ user_id: userId, ...statePatch });
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
    streakFreezes: patch.streak_freezes,
    xp: patch.xp,
    bestStreak: patch.best_streak,
    achievements: patch.achievements,
  });
}
