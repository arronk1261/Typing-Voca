export function todayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function diffInDays(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00`).getTime();
  const b = new Date(`${to}T00:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}

export interface StreakUpdate {
  streak: number;
  lastStudyDate: string;
  changed: boolean;
}

export function computeStreakOnComplete(
  lastStudyDate: string | null,
  currentStreak: number,
  today: string = todayKey(),
): StreakUpdate {
  if (lastStudyDate === today) {
    return { streak: currentStreak, lastStudyDate: today, changed: false };
  }
  if (lastStudyDate && diffInDays(lastStudyDate, today) === 1) {
    return { streak: currentStreak + 1, lastStudyDate: today, changed: true };
  }
  return { streak: 1, lastStudyDate: today, changed: true };
}

export interface StreakWithFreeze extends StreakUpdate {
  freezesUsed: number;
  freezesEarned: number;
}

// 10-7: 스트릭 동결권 적용 버전. 하루(정확히 1일)만 빠졌고 동결권이 있으면 연속을 지킨다(이탈 차단).
// 동결권은 연속이 7의 배수에 도달할 때 1개 적립(상한은 호출부에서 처리). 긍정 강화만 — 끊겨도 벌점 없음.
export function applyStreak(
  lastStudyDate: string | null,
  currentStreak: number,
  freezes: number,
  today: string = todayKey(),
): StreakWithFreeze {
  if (lastStudyDate === today) {
    return {
      streak: currentStreak,
      lastStudyDate: today,
      changed: false,
      freezesUsed: 0,
      freezesEarned: 0,
    };
  }
  const gap = lastStudyDate ? diffInDays(lastStudyDate, today) : null;
  let streak: number;
  let freezesUsed = 0;
  if (gap === null || gap === 1) {
    streak = (gap === 1 ? currentStreak : 0) + 1;
  } else if (gap === 2 && freezes > 0) {
    freezesUsed = 1;
    streak = currentStreak + 1;
  } else {
    streak = 1;
  }
  const freezesEarned = streak > 0 && streak % 7 === 0 ? 1 : 0;
  return { streak, lastStudyDate: today, changed: true, freezesUsed, freezesEarned };
}

// 8-3: 마지막 학습이 어제보다 더 오래전이면 "끊겼다 돌아온 복귀자"로 판단
export function isStreakBroken(
  lastStudyDate: string | null,
  today: string = todayKey(),
): boolean {
  if (!lastStudyDate) return false;
  return diffInDays(lastStudyDate, today) > 1;
}

export type FlameTier = "spark" | "small" | "medium" | "large" | "blaze";

export function flameTier(streak: number): FlameTier {
  if (streak >= 30) return "blaze";
  if (streak >= 14) return "large";
  if (streak >= 7) return "medium";
  if (streak >= 3) return "small";
  return "spark";
}
