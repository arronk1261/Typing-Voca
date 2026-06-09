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

// 8-1: (참고용 보존) 초기 고정 간격. 9-4부터 복습 간격 스케줄은 SM-2가 담당한다.
export const REVIEW_INTERVALS = [1, 3, 7, 14];

// 9-4: SM-2 상수 — 초기/최소 난이도계수(EF), 빠른 응답 기준(ms), 졸업 지평선(일)
export const SM2_INITIAL_EF = 2.5;
export const SM2_MIN_EF = 1.3;
export const FAST_RESPONSE_MS = 4000;
export const GRAD_HORIZON_DAYS = 14;

// 8-1: 졸업에 필요한 통과 횟수 — 기본 3회, 가장 어려운 Lv.3 관용구는 4회
export function graduationTarget(
  level?: WordLevel,
  chunkType?: WordChunkType,
): number {
  if (level === 3 && chunkType === "idiom") return 4;
  return 3;
}

// 9-4: 풍부한 학습 신호를 SM-2 등급(q)으로 매핑 — 타이핑(회상) 신호만 사용.
// 2=Again(하트 소진) · 3=Hard(재시도·힌트로 맞힘) · 4=Good(첫 시도·힌트 0) · 5=Easy(+빠른 응답)
export function gradeFor(result: QuestionResult): number {
  if (result.heartsDepleted) return 2;
  const clean = result.firstTryCorrect && (result.hintsUsed ?? 0) === 0;
  if (!clean) return 3;
  const ms = result.responseMs;
  if (typeof ms === "number" && ms < FAST_RESPONSE_MS) return 5;
  return 4;
}

export interface Sm2State {
  n: number;
  ef: number;
  interval: number;
}

// 9-4: 표준 SM-2 한 스텝 — 통과 시 간격 1→6→round(prev×EF), 실패(q<3) 시 n·간격 리셋. EF는 q로 보정.
export function sm2Update(prev: Sm2State, q: number): Sm2State {
  let n: number;
  let interval: number;
  if (q < 3) {
    n = 0;
    interval = 1;
  } else {
    if (prev.n <= 0) interval = 1;
    else if (prev.n === 1) interval = 6;
    else interval = Math.max(1, Math.round(prev.interval * prev.ef));
    n = prev.n + 1;
  }
  const ef = Math.max(
    SM2_MIN_EF,
    prev.ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)),
  );
  return { n, ef, interval };
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
    ease_factor: SM2_INITIAL_EF,
    interval_days: 0,
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

// SRS (plan 5.5 + 9-3d + 9-4): 타이핑·발음 두 트랙. 타이핑 간격은 SM-2가 스케줄하고,
// 통과 누적이 졸업 지평선(간격 ≥ GRAD_HORIZON_DAYS)을 넘으면 능동 복습을 졸업한다.
// 발음 미완은 저빈도 '말하기 확인'(needsPronCheck)으로만 재등장한다.
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
  const outcome = shadowOutcome(result);

  // 타이핑 트랙: 풍부한 신호 → SM-2 등급 → 다음 간격·EF·연속 통과(n=pass_count)
  const q = gradeFor(result);
  const sm2 = sm2Update(
    {
      n: base.pass_count,
      ef: base.ease_factor ?? SM2_INITIAL_EF,
      interval: base.interval_days ?? 0,
    },
    q,
  );

  // 발음 트랙: 발음을 시도해 좋았으면 +1, 약하면 0으로 리셋, 미응시는 중립
  let pronPass = base.pron_pass_count ?? 0;
  if (outcome === "ok") pronPass = pronPass + 1;
  else if (outcome === "weak") pronPass = 0;

  // 졸업: 통과 누적 충족 + 간격이 졸업 지평선 이상(약한 카드는 EF가 낮아 더 오래 머문다)
  const typingGraduated =
    sm2.n >= typingTarget && sm2.interval >= GRAD_HORIZON_DAYS;
  const inReview = !typingGraduated;
  const nextDue = typingGraduated ? null : addDays(today, sm2.interval);

  const pronunciation = pronunciationScore(result);

  return {
    user_id: userId,
    word_id: wordId,
    seen_count: base.seen_count + 1,
    first_try_correct: result.firstTryCorrect,
    shadow_stars: stars,
    pass_count: sm2.n,
    pron_pass_count: pronPass,
    ease_factor: sm2.ef,
    interval_days: sm2.interval,
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
