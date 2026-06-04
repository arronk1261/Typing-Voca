import { todayKey } from "@/lib/streak";
import type { Progress, QuestionResult } from "@/types";

export function addDays(dateKey: string, days: number): string {
  const base = new Date(`${dateKey}T00:00:00`);
  base.setDate(base.getDate() + days);
  return todayKey(base);
}

function emptyProgress(userId: string, wordId: number): Progress {
  return {
    user_id: userId,
    word_id: wordId,
    seen_count: 0,
    first_try_correct: null,
    shadow_stars: null,
    pass_count: 0,
    in_review: false,
    last_seen: null,
    next_due: null,
  };
}

export function isPass(result: QuestionResult): boolean {
  return (
    result.firstTryCorrect &&
    typeof result.shadowStars === "number" &&
    result.shadowStars >= 2
  );
}

export function isReviewTrigger(result: QuestionResult): boolean {
  return (
    result.heartsDepleted ||
    (typeof result.shadowStars === "number" && result.shadowStars <= 1)
  );
}

// SRS-lite (plan 5.5): 통과 2회 → 졸업 / 통과 실패 → pass_count 리셋 / 트리거 → in_review 진입
export function computeProgressUpdate(
  existing: Progress | undefined,
  result: QuestionResult,
  userId: string,
  wordId: number,
  today: string = todayKey(),
): Progress {
  const base = existing ?? emptyProgress(userId, wordId);
  const stars = typeof result.shadowStars === "number" ? result.shadowStars : null;

  let passCount = base.pass_count;
  let inReview = base.in_review;
  let nextDue = base.next_due;

  if (isPass(result)) {
    passCount = base.pass_count + 1;
    if (passCount >= 2) {
      inReview = false;
      nextDue = null;
    } else {
      nextDue = addDays(today, 1);
    }
  } else {
    passCount = 0;
    if (isReviewTrigger(result)) {
      inReview = true;
      nextDue = addDays(today, 1);
    }
  }

  return {
    user_id: userId,
    word_id: wordId,
    seen_count: base.seen_count + 1,
    first_try_correct: result.firstTryCorrect,
    shadow_stars: stars,
    pass_count: passCount,
    in_review: inReview,
    last_seen: today,
    next_due: nextDue,
  };
}

export function isDue(progress: Progress, today: string = todayKey()): boolean {
  if (!progress.in_review) return false;
  if (!progress.next_due) return true;
  return progress.next_due <= today;
}
