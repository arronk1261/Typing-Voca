import { todayKey } from "@/lib/streak";

// 10-4: 오늘의 학습 링 달성치(로컬 캐시). 날짜가 바뀌면 자동 리셋.
// 세션마다 누적되고, 로그인 시 daily_rings 테이블로 best-effort 미러링된다.
// 목표(goal)는 하루의 첫 세션에 한 번 고정해 이후 재계산으로 흔들리지 않게 한다(애플 활동 링).
const KEY = "tv:ring:today";

export interface DailyRingState {
  date: string;
  learnDone: number;
  reviewDone: number;
  pronDone: number;
  learnGoal: number | null;
  reviewGoal: number | null;
  pronGoal: number | null;
}

function empty(date: string): DailyRingState {
  return {
    date,
    learnDone: 0,
    reviewDone: 0,
    pronDone: 0,
    learnGoal: null,
    reviewGoal: null,
    pronGoal: null,
  };
}

function normalize(parsed: Partial<DailyRingState>, today: string): DailyRingState {
  return { ...empty(today), ...parsed, date: today };
}

function write(state: DailyRingState): DailyRingState {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* quota or disabled — ignore */
    }
  }
  return state;
}

export function readDailyRing(today: string = todayKey()): DailyRingState {
  if (typeof window === "undefined") return empty(today);
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<DailyRingState>) : null;
    if (parsed && parsed.date === today) return normalize(parsed, today);
  } catch {
    /* ignore */
  }
  return empty(today);
}

// 목표가 아직 정해지지 않은 날에만 한 번 고정한다(이미 있으면 유지).
export function freezeDailyRingGoals(
  goals: { learn: number; review: number; pron: number },
  today: string = todayKey(),
): DailyRingState {
  const cur = readDailyRing(today);
  if (cur.learnGoal !== null) return cur;
  return write({
    ...cur,
    learnGoal: goals.learn,
    reviewGoal: goals.review,
    pronGoal: goals.pron,
  });
}

export function bumpDailyRing(
  delta: { learn?: number; review?: number; pron?: number },
  today: string = todayKey(),
): DailyRingState {
  const cur = readDailyRing(today);
  return write({
    ...cur,
    learnDone: cur.learnDone + (delta.learn ?? 0),
    reviewDone: cur.reviewDone + (delta.review ?? 0),
    pronDone: cur.pronDone + (delta.pron ?? 0),
  });
}
