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
