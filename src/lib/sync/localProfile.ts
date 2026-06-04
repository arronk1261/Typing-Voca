import type { WordLevel } from "@/types";

const PROFILE_KEY = "tv:profile:guest";

export interface LocalProfile {
  level: WordLevel | null;
  streak: number;
  lastStudyDate: string | null;
  totalLearned: number;
  preferredCategories: string[];
}

export const EMPTY_PROFILE: LocalProfile = {
  level: null,
  streak: 0,
  lastStudyDate: null,
  totalLearned: 0,
  preferredCategories: [],
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
