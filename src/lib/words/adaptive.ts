import { addDays, isGraduated } from "@/lib/srs";
import type { Progress, Word, WordLevel } from "@/types";

const HIGH_BACKLOG = 6;
const EARLY_SEEN = 30;
const MAINTENANCE_GAP_DAYS = 30;

export interface ReviewRatioContext {
  level: WordLevel;
  seenCount: number;
  inReviewCount: number;
  streakBroken: boolean;
}

// 8-3: 고정 비율 대신 학습자 상태에 따라 복습 비율을 동적으로 조정
export function adaptiveReviewRatio(ctx: ReviewRatioContext): number {
  if (ctx.streakBroken) return 0.7; // 끊겼다 돌아온 복귀자 → 복습 위주로 재진입
  if (ctx.inReviewCount >= HIGH_BACKLOG) return 0.6; // 오답 누적 多
  if (ctx.level === 1 && ctx.seenCount < EARLY_SEEN) return 0.5; // Lv.1 초반
  return 0.3; // 안정 구간
}

// 8-3: 카테고리 학습 시 실제 상황 흐름 순서(예: 여행=공항→호텔→길찾기→식당 묶음)
const CATEGORY_FLOW_ORDER = [
  "greeting",
  "daily",
  "social",
  "emotion",
  "schedule",
  "phone_email",
  "work",
  "it",
  "shopping",
  "restaurant",
  "travel",
  "health",
];

// 9-B4: 같은 카테고리 안에서도 상황 흐름대로 출제하기 위한 use_case 순서(미니 시나리오)
const USE_CASE_FLOW = [
  "greeting",
  "introduction",
  "smalltalk",
  "conversation",
  "morning_routine",
  "schedule",
  "appointment",
  "booking",
  "airport",
  "transportation",
  "directions",
  "sightseeing",
  "hotel",
  "shopping",
  "ordering",
  "food",
  "payment",
  "office",
  "meeting",
  "task",
  "development",
  "business",
  "phone",
  "email",
  "communication",
  "device",
  "troubleshooting",
  "illness",
  "hospital",
  "wellness",
  "recovery",
  "emotion",
  "relationship",
  "friendship",
  "conflict",
  "farewell",
];

function categoryFlowIndex(category: string): number {
  const i = CATEGORY_FLOW_ORDER.indexOf(category);
  return i === -1 ? CATEGORY_FLOW_ORDER.length : i;
}

function useCaseFlowIndex(word: Word): number {
  const cases = word.use_case ?? [];
  let best = USE_CASE_FLOW.length;
  for (const c of cases) {
    const i = USE_CASE_FLOW.indexOf(c);
    if (i !== -1 && i < best) best = i;
  }
  return best;
}

// 9-B4: 카테고리 순서를 1차 키, 카테고리 내부 use_case 흐름을 2차 키로 정렬
export function orderByCategoryFlow(words: Word[]): Word[] {
  return [...words].sort((a, b) => {
    const byCategory = categoryFlowIndex(a.category) - categoryFlowIndex(b.category);
    if (byCategory !== 0) return byCategory;
    return useCaseFlowIndex(a) - useCaseFlowIndex(b);
  });
}

// 9-3f: 카테고리 세션을 하나의 상황 흐름으로 묶기 — flow 정렬된 풀에서
// 학습 가치(미학습+복습 대상)가 가장 높은 '연속 구간'을 골라 미니 시나리오 세트를 만든다.
// (예: 여행 = 공항 → 이동 → 길찾기 → 숙소 처럼 인접한 use_case가 한 세트를 이룸)
export function pickScenarioWindow(
  flowOrdered: Word[],
  isLearnable: (w: Word) => boolean,
  count: number,
): Word[] {
  if (flowOrdered.length <= count) return flowOrdered;
  let bestStart = 0;
  let bestScore = -1;
  for (let start = 0; start + count <= flowOrdered.length; start += 1) {
    let score = 0;
    for (let i = start; i < start + count; i += 1) {
      if (isLearnable(flowOrdered[i])) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestStart = start;
    }
  }
  return flowOrdered.slice(bestStart, bestStart + count);
}

// 9-C2: 커리큘럼 레이어 — 별도 재태깅 없이 기존 태그(레벨·빈도·청크·use_case)에서 파생
export type CurriculumLayer = "survival" | "daily" | "work" | "advanced";

const SURVIVAL_USE_CASES = new Set([
  "greeting",
  "introduction",
  "farewell",
  "directions",
  "airport",
  "transportation",
  "ordering",
  "payment",
  "booking",
  "hospital",
]);
const WORK_USE_CASES = new Set([
  "work",
  "office",
  "business",
  "meeting",
  "task",
  "development",
]);

export function curriculumLayer(word: Word): CurriculumLayer {
  if (word.level === 3 || word.chunk_type === "idiom" || word.frequency === "low") {
    return "advanced";
  }
  const uses = word.use_case ?? [];
  if (
    word.level === 1 &&
    word.frequency === "high" &&
    uses.some((u) => SURVIVAL_USE_CASES.has(u))
  ) {
    return "survival";
  }
  if (word.category === "work" || uses.some((u) => WORK_USE_CASES.has(u))) {
    return "work";
  }
  return "daily";
}

const LAYER_RANK: Record<CurriculumLayer, number> = {
  survival: 0,
  daily: 1,
  work: 2,
  advanced: 3,
};

// 9-C2: 초급 학습자에게 생존·일상 표현을 먼저 노출하도록 레이어 순서로 정렬
export function orderByCurriculum(words: Word[]): Word[] {
  return [...words].sort(
    (a, b) => LAYER_RANK[curriculumLayer(a)] - LAYER_RANK[curriculumLayer(b)],
  );
}

// 9-B1: 기본 세션에서 저빈도(niche) 표현이 신규 출제를 과점하지 않도록 상한 적용
export function limitLowFrequency(words: Word[], cap: number): Word[] {
  const result: Word[] = [];
  let lowUsed = 0;
  for (const w of words) {
    if (w.frequency === "low") {
      if (lowUsed >= cap) continue;
      lowUsed += 1;
    }
    result.push(w);
  }
  return result;
}

// 8-6: 졸업 단어 중 마지막 학습이 ~30일 이상 지난 것을 유지 점검 후보로 선별
export function pickMaintenanceWords(
  pool: Word[],
  progress: Record<number, Progress>,
  today: string,
  max = 1,
): Word[] {
  const cutoff = addDays(today, -MAINTENANCE_GAP_DAYS);
  return pool
    .filter((w) => {
      const p = progress[w.id];
      return p && isGraduated(p) && (p.last_seen ?? "") <= cutoff;
    })
    .sort((a, b) => {
      const la = progress[a.id].last_seen ?? "";
      const lb = progress[b.id].last_seen ?? "";
      return la.localeCompare(lb);
    })
    .slice(0, max);
}

export type LevelSuggestion = "up" | "down" | null;

export interface SessionStats {
  total: number;
  firstTryCorrect: number;
  avgStars: number | null;
  reviewCount: number;
}

// 단일 세트 기반 제안 (plan 5.4, 보조용)
export function suggestLevelAdjustment(
  stats: SessionStats,
  level: WordLevel,
): LevelSuggestion {
  if (stats.total === 0) return null;
  const correctRate = stats.firstTryCorrect / stats.total;
  const reviewRate = stats.reviewCount / stats.total;
  if (level < 3 && correctRate >= 0.8 && (stats.avgStars ?? 0) >= 2) return "up";
  if (level > 1 && reviewRate >= 0.4) return "down";
  return null;
}

export interface RollingWindow {
  sessions: number;
  questions: number;
  firstTryCorrect: number;
  reviewEntries: number;
  starsSum: number;
  starsCount: number;
  graduatedCount: number;
}

const ROLLING_MIN_QUESTIONS = 30;
const UP_CORRECT = 0.85;
const UP_REVIEW = 0.15;
const UP_STARS = 2.2;
const UP_GRADUATED = 5;
const DOWN_CORRECT = 0.5;
const DOWN_REVIEW = 0.4;

// 8-5: 단일 세트가 아닌 최근 3~5세트(≥30문항) 롤링 윈도우로 승급/하향 제안 (강제 X)
export function suggestLevelFromHistory(
  w: RollingWindow,
  level: WordLevel,
): LevelSuggestion {
  if (w.questions < ROLLING_MIN_QUESTIONS) return null;
  const correctRate = w.firstTryCorrect / w.questions;
  const reviewRate = w.reviewEntries / w.questions;
  const avgStars = w.starsCount > 0 ? w.starsSum / w.starsCount : 0;

  // 9-A3: 정답률·복습률·별점에 더해, 실제 졸업 누적이 충분할 때만 상향 제안
  if (
    level < 3 &&
    correctRate >= UP_CORRECT &&
    reviewRate <= UP_REVIEW &&
    avgStars >= UP_STARS &&
    w.graduatedCount >= UP_GRADUATED
  ) {
    return "up";
  }
  if (level > 1 && (correctRate < DOWN_CORRECT || reviewRate >= DOWN_REVIEW)) {
    return "down";
  }
  return null;
}
