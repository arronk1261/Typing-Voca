import type { WordLevel } from "@/types";

const PROFILE_KEY = "tv:profile:guest";

export interface LocalProfile {
  level: WordLevel | null;
  levelProvisional: boolean;
  calibrationQuestions: number;
  calibrationCorrect: number;
  streak: number;
  lastStudyDate: string | null;
  totalLearned: number;
  preferredCategories: string[];
  // 10-3: 게스트의 동기부여 상태(로그인하면 클라우드로 대체됨)
  streakFreezes: number;
  xp: number;
  bestStreak: number;
  achievements: string[];
}

export const EMPTY_PROFILE: LocalProfile = {
  level: null,
  levelProvisional: true,
  calibrationQuestions: 0,
  calibrationCorrect: 0,
  streak: 0,
  lastStudyDate: null,
  totalLearned: 0,
  preferredCategories: [],
  streakFreezes: 0,
  xp: 0,
  bestStreak: 0,
  achievements: [],
};

export function readLocalProfile(): LocalProfile {
  if (typeof window === "undefined") return { ...EMPTY_PROFILE };
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return { ...EMPTY_PROFILE };
    const parsed = JSON.parse(raw) as Partial<LocalProfile>;
    return { ...EMPTY_PROFILE, ...parsed };
  } catch {
    return { ...EMPTY_PROFILE };
  }
}

export function writeLocalProfile(patch: Partial<LocalProfile>): void {
  if (typeof window === "undefined") return;
  try {
    const defined = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined),
    );
    const next = { ...readLocalProfile(), ...defined };
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  } catch {
    /* quota or disabled — ignore */
  }
}
