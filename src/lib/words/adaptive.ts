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

function categoryFlowIndex(category: string): number {
  const i = CATEGORY_FLOW_ORDER.indexOf(category);
  return i === -1 ? CATEGORY_FLOW_ORDER.length : i;
}

export function orderByCategoryFlow(words: Word[]): Word[] {
  return [...words].sort(
    (a, b) => categoryFlowIndex(a.category) - categoryFlowIndex(b.category),
  );
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

  if (
    level < 3 &&
    correctRate >= UP_CORRECT &&
    reviewRate <= UP_REVIEW &&
    avgStars >= UP_STARS
  ) {
    return "up";
  }
  if (level > 1 && (correctRate < DOWN_CORRECT || reviewRate >= DOWN_REVIEW)) {
    return "down";
  }
  return null;
}
