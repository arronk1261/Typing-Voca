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

// 9-3d: 발음 졸업에 필요한 통과 횟수(타이핑보다 가볍게 — 발음은 보너스 레이어)
export const PRON_TARGET = 2;

function emptyProgress(userId: string, wordId: number): Progress {
  return {
    user_id: userId,
    word_id: wordId,
    seen_count: 0,
    first_try_correct: null,
    shadow_stars: null,
    pass_count: 0,
    pron_pass_count: 0,
    in_review: false,
    last_seen: null,
    next_due: null,
    meaning_recall_score: null,
    spelling_score: null,
    pronunciation_score: null,
  };
}

// 9-A1: 발음 단계 결과를 세 상태로 구분 — 평가됨(좋음/약함) vs 발음 자체가 없음
type ShadowOutcome = "ok" | "weak" | "absent";

function shadowOutcome(result: QuestionResult): ShadowOutcome {
  if (typeof result.shadowStars === "number") {
    return result.shadowStars >= 2 ? "ok" : "weak";
  }
  return "absent";
}

// 9-A1: typingOnly는 STT가 없는 환경이므로 발음 없이 타이핑만으로 통과(학습 무중단)
export function isPass(result: QuestionResult): boolean {
  if (!result.firstTryCorrect) return false;
  const outcome = shadowOutcome(result);
  if (outcome === "ok") return true;
  if (outcome === "absent" && result.shadowMode === "typingOnly") {
    return !result.heartsDepleted;
  }
  return false;
}

// 9-A1: 실패 = 뜻/철자 실패(하트 소진) 또는 발음을 시도했으나 약함. 발음 미응시는 실패가 아님.
export function isFail(result: QuestionResult): boolean {
  return result.heartsDepleted || shadowOutcome(result) === "weak";
}

export function isReviewTrigger(result: QuestionResult): boolean {
  return isFail(result);
}

// 8-2: 한 번의 결과를 뜻 회상 / 철자 / 발음 세 점수로 분리
// 9-3c: 힌트·정답 노출·느린 응답을 반영해 '겨우 떠올린' 회상을 만점에서 분리(첫 시도 정답은 만점 유지)
const SLOW_RESPONSE_MS = 12000;

export function meaningRecallScore(result: QuestionResult): number {
  if (result.heartsDepleted) return 0;
  if (result.answerRevealed) return 30;
  const hintPenalty = (result.hintsUsed ?? 0) * 20;
  const slowPenalty =
    typeof result.responseMs === "number" && result.responseMs > SLOW_RESPONSE_MS
      ? 10
      : 0;
  return Math.max(40, 100 - hintPenalty - slowPenalty);
}

export function spellingScore(result: QuestionResult): number {
  if (result.heartsDepleted) return 0;
  const penalty = Math.max(0, result.attempts - 1) * 35;
  return Math.max(0, 100 - penalty);
}

export function pronunciationScore(result: QuestionResult): number | null {
  return typeof result.shadowScore === "number" ? result.shadowScore : null;
}

// SRS-lite (plan 5.5 + 8-1 + 9-3d): 타이핑·발음을 별도 트랙으로 누적.
// 타이핑(뜻·철자) 졸업이 능동 복습을 끝내고, 발음 미완은 저빈도 '말하기 확인'으로만 재등장한다.
export function computeProgressUpdate(
  existing: Progress | undefined,
  result: QuestionResult,
  userId: string,
  wordId: number,
  today: string = todayKey(),
): Progress {
  const base = existing ?? emptyProgress(userId, wordId);
  const stars = typeof result.shadowStars === "number" ? result.shadowStars : null;
  const typingTarget = graduationTarget(result.wordLevel, result.wordChunkType);

  const heartsFail = result.heartsDepleted;
  const typedFirstTry = result.firstTryCorrect && !heartsFail;
  const outcome = shadowOutcome(result);

  // 타이핑 트랙: 첫 시도 정답이면 +1, 하트 소진이면 0으로 리셋(발음과 무관)
  let typingPass = base.pass_count;
  if (heartsFail) typingPass = 0;
  else if (typedFirstTry) typingPass = typingPass + 1;

  // 발음 트랙: 발음을 시도해 좋았으면 +1, 약하면 0으로 리셋, 미응시는 중립
  let pronPass = base.pron_pass_count ?? 0;
  if (outcome === "ok") pronPass = pronPass + 1;
  else if (outcome === "weak") pronPass = 0;

  const typingGraduated = typingPass >= typingTarget;

  let inReview: boolean;
  let nextDue: string | null;
  if (typingGraduated) {
    // 타이핑 졸업 → 능동 복습 종료. 발음이 아직이면 needsPronCheck로 저빈도 재등장(벌점 없음)
    inReview = false;
    nextDue = null;
  } else {
    inReview = true;
    if (heartsFail || outcome === "weak") {
      nextDue = addDays(today, REVIEW_INTERVALS[0]);
    } else if (typedFirstTry) {
      nextDue = addDays(today, intervalForPass(typingPass));
    } else {
      nextDue = base.next_due ?? addDays(today, REVIEW_INTERVALS[0]);
    }
  }

  const pronunciation = pronunciationScore(result);

  return {
    user_id: userId,
    word_id: wordId,
    seen_count: base.seen_count + 1,
    first_try_correct: result.firstTryCorrect,
    shadow_stars: stars,
    pass_count: typingPass,
    pron_pass_count: pronPass,
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

// 9-3a: 현재 레벨 풀 밖에 있는(이전 레벨에서 올라온) due 복습 단어 id —
// 레벨이 오른 뒤에도 이전 레벨 복습이 '오늘의 세션'에 자연히 섞이도록 끌어올 대상.
export function crossLevelDueIds(
  progress: Record<number, Progress>,
  poolIds: Set<number>,
  today: string = todayKey(),
): number[] {
  return Object.values(progress)
    .filter((p) => isDue(p, today) && !poolIds.has(p.word_id))
    .map((p) => p.word_id);
}

// 8-6: 졸업(통과 완료) 단어 — 복습 대상은 아니지만 장기 유지 점검 후보
export function isGraduated(progress: Progress): boolean {
  return !progress.in_review && progress.pass_count >= 3;
}

// 9-3d: 타이핑은 졸업했지만 발음 트랙은 미완 — full/listening 모드에서 저빈도 '말하기 확인'으로 재등장.
// (typingOnly 환경에서 타이핑만으로 졸업한 단어가 나중에 발음 가능 환경에서 확인되게 함)
export function needsPronCheck(progress: Progress): boolean {
  return (
    !progress.in_review &&
    progress.pass_count >= 3 &&
    (progress.pron_pass_count ?? 0) < PRON_TARGET
  );
}
