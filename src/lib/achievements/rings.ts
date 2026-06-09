// 10-4: 학습 링 목표 계산(순수). 애플 활동처럼 '과거의 나' 기준으로 개인화하되,
// 미달 좌절을 막기 위해 바닥값/상한을 둔다. (8.6 결정: 최근 중앙값 × 1.05, 최소 1세트)
export const LEARN_FLOOR = 10;
export const LEARN_CAP = 40;
export const PRON_FLOOR = 5;
export const PRON_CAP = 20;
export const REVIEW_CAP = 10;

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function learnGoal(recentWordsPerSession: number[]): number {
  const personalized = Math.round(median(recentWordsPerSession) * 1.05);
  return clamp(personalized, LEARN_FLOOR, LEARN_CAP);
}

export function pronGoal(learn: number): number {
  return clamp(Math.round(learn / 2), PRON_FLOOR, PRON_CAP);
}

// 목표 0(예: 복습거리 없음)이면 '닫힌 상태'(1)로 본다.
export function ringFraction(done: number, goal: number): number {
  if (goal <= 0) return 1;
  return clamp(done / goal, 0, 1);
}
