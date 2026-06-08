import { todayKey } from "@/lib/streak";
import type {
  Progress,
  QuestionResult,
  WordChunkType,
  WordLevel,
} from "@/types";

export function addDays(dateKey: string, days: number): string {
  const base = new Date(`${dateKey}T00:00:00`);
  base.setDate(base.getDate() + days);
  return todayKey(base);
}

// 8-1: 간격 장기화 — 통과할수록 복습 간격을 1→3→7→14일로 늘림
export const REVIEW_INTERVALS = [1, 3, 7, 14];

// 8-1: 졸업에 필요한 통과 횟수 — 기본 3회, 가장 어려운 Lv.3 관용구는 4회
export function graduationTarget(
  level?: WordLevel,
  chunkType?: WordChunkType,
): number {
  if (level === 3 && chunkType === "idiom") return 4;
  return 3;
}

function intervalForPass(passCount: number): number {
  return REVIEW_INTERVALS[Math.min(passCount - 1, REVIEW_INTERVALS.length - 1)];
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
    meaning_recall_score: null,
    spelling_score: null,
    pronunciation_score: null,
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

// 8-2: 한 번의 결과를 뜻 회상 / 철자 / 발음 세 점수로 분리
export function meaningRecallScore(result: QuestionResult): number {
  if (result.heartsDepleted) return 0;
  return 100;
}

export function spellingScore(result: QuestionResult): number {
  if (result.heartsDepleted) return 0;
  const penalty = Math.max(0, result.attempts - 1) * 35;
  return Math.max(0, 100 - penalty);
}

export function pronunciationScore(result: QuestionResult): number | null {
  return typeof result.shadowScore === "number" ? result.shadowScore : null;
}

// SRS-lite (plan 5.5 + 8-1): 통과 누적 → 간격 확장 → 졸업 / 실패 → pass_count 리셋
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
    const target = graduationTarget(result.wordLevel, result.wordChunkType);
    if (passCount >= target) {
      inReview = false;
      nextDue = null;
    } else {
      inReview = true;
      nextDue = addDays(today, intervalForPass(passCount));
    }
  } else {
    passCount = 0;
    if (isReviewTrigger(result)) {
      inReview = true;
      nextDue = addDays(today, REVIEW_INTERVALS[0]);
    }
  }

  const pronunciation = pronunciationScore(result);

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
    meaning_recall_score: meaningRecallScore(result),
    spelling_score: spellingScore(result),
    pronunciation_score: pronunciation ?? base.pronunciation_score ?? null,
  };
}

export function isDue(progress: Progress, today: string = todayKey()): boolean {
  if (!progress.in_review) return false;
  if (!progress.next_due) return true;
  return progress.next_due <= today;
}

// 8-6: 졸업(통과 완료) 단어 — 복습 대상은 아니지만 장기 유지 점검 후보
export function isGraduated(progress: Progress): boolean {
  return !progress.in_review && progress.pass_count >= 3;
}
