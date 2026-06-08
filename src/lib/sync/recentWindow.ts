import type { StudySession } from "@/types";

const KEY = "tv:window:recent";
const CAP = 5;

export interface SessionWindowEntry {
  total: number;
  firstTryCorrect: number;
  // 9-2a: '세션 후 잔존 in_review'가 아니라 '이번 세션에 새로 복습 진입한 수'(승급 판단 정확도)
  reviewTriggers: number;
  starsSum: number;
  starsCount: number;
}

// 9-C1: Supabase 세션 요약을 롤링 윈도우 항목으로 변환(기기 간 일관성).
// 요약엔 별점 응시 수가 없으므로 starsCount는 words_count로 근사한다.
export function sessionToWindowEntry(s: StudySession): SessionWindowEntry {
  const hasStars = typeof s.avg_stars === "number";
  return {
    total: s.words_count,
    firstTryCorrect: s.correct_first_try,
    reviewTriggers: s.review_count,
    starsSum: hasStars ? (s.avg_stars as number) * s.words_count : 0,
    starsCount: hasStars ? s.words_count : 0,
  };
}

export function readRecentWindow(): SessionWindowEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as SessionWindowEntry[]) : [];
  } catch {
    return [];
  }
}

export function appendRecentWindow(entry: SessionWindowEntry): SessionWindowEntry[] {
  const next = [...readRecentWindow(), entry].slice(-CAP);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* quota or disabled — ignore */
    }
  }
  return next;
}
