import { todayKey } from "@/lib/streak";

// 10-1: 주말·이달 학습일수 같은 '날짜 기반 배지'를 위한 가벼운 로컬 학습일 원장.
// study_sessions 풀 조회 없이 오프라인에서도 동작(긍정 강화·best-effort).
const KEY = "tv:study:days";
const CAP = 70;

export function readStudyDays(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export function recordStudyDay(day: string = todayKey()): string[] {
  const set = new Set(readStudyDays());
  set.add(day);
  const next = [...set].sort().slice(-CAP);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* quota or disabled — ignore */
    }
  }
  return next;
}

export function weekendBothDays(days: string[]): boolean {
  const set = new Set(days);
  for (const d of set) {
    if (new Date(`${d}T00:00:00`).getDay() === 0) {
      const sat = new Date(`${d}T00:00:00`);
      sat.setDate(sat.getDate() - 1);
      if (set.has(todayKey(sat))) return true;
    }
  }
  return false;
}

export function daysInMonth(days: string[], monthPrefix: string): number {
  return days.filter((d) => d.startsWith(monthPrefix)).length;
}
