import { todayKey } from "@/lib/streak";

// 10-4: 오늘의 학습 링 달성치(로컬 캐시). 날짜가 바뀌면 자동 리셋.
// 세션마다 누적되고, 로그인 시 daily_rings 테이블로 best-effort 미러링된다.
const KEY = "tv:ring:today";

export interface DailyRingState {
  date: string;
  learnDone: number;
  reviewDone: number;
  pronDone: number;
}

function empty(date: string): DailyRingState {
  return { date, learnDone: 0, reviewDone: 0, pronDone: 0 };
}

export function readDailyRing(today: string = todayKey()): DailyRingState {
  if (typeof window === "undefined") return empty(today);
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as DailyRingState) : null;
    if (parsed && parsed.date === today) return parsed;
  } catch {
    /* ignore */
  }
  return empty(today);
}

export function bumpDailyRing(
  delta: { learn?: number; review?: number; pron?: number },
  today: string = todayKey(),
): DailyRingState {
  const cur = readDailyRing(today);
  const next: DailyRingState = {
    date: today,
    learnDone: cur.learnDone + (delta.learn ?? 0),
    reviewDone: cur.reviewDone + (delta.review ?? 0),
    pronDone: cur.pronDone + (delta.pron ?? 0),
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* quota or disabled — ignore */
    }
  }
  return next;
}
