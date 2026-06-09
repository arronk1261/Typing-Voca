import type { AchievementContext, SessionFacts } from "@/lib/achievements/catalog";
import { FAST_RESPONSE_MS, isGraduated, isLapsed } from "@/lib/srs";
import { wordCategoryMap } from "@/lib/stats/categoryMap";
import {
  daysInMonth,
  weekendBothDays as weekendBoth,
} from "@/lib/sync/studyDays";
import type { Progress, QuestionResult } from "@/types";

const MASTERY_MIN_STUDIED = 5;
const MASTERY_RATIO = 0.8;

export interface SnapshotInput {
  today: string;
  hour: number;
  streak: number;
  bestStreak: number;
  prevBestStreak: number;
  totalLearned: number;
  earnedKeys: ReadonlySet<string>;
  progressAfter: Record<number, Progress>;
  prevProgress: Record<number, Progress>;
  results: QuestionResult[];
  studyDays: string[];
}

function sessionFacts(input: SnapshotInput): SessionFacts {
  const { results, prevProgress, progressAfter, hour } = input;
  const learnedCount = results.length;
  const firstTryCorrect = results.filter((r) => r.firstTryCorrect).length;
  const starred = results.filter((r) => typeof r.shadowStars === "number");
  const avgStars =
    starred.length > 0
      ? starred.reduce((s, r) => s + (r.shadowStars ?? 0), 0) / starred.length
      : null;
  const allFast =
    learnedCount > 0 &&
    results.every(
      (r) =>
        r.firstTryCorrect &&
        typeof r.responseMs === "number" &&
        r.responseMs < FAST_RESPONSE_MS,
    );
  let lapsedGraduated = 0;
  for (const r of results) {
    const before = prevProgress[r.wordId];
    const after = progressAfter[r.wordId];
    if (before && isLapsed(before) && after && isGraduated(after)) {
      lapsedGraduated += 1;
    }
  }
  return { learnedCount, firstTryCorrect, avgStars, allFast, lapsedGraduated, hour };
}

function masteredCategoryCount(progress: Record<number, Progress>): number {
  const studied = new Map<string, number>();
  const graduated = new Map<string, number>();
  for (const p of Object.values(progress)) {
    const cat = wordCategoryMap.get(p.word_id);
    if (!cat) continue;
    studied.set(cat, (studied.get(cat) ?? 0) + 1);
    if (isGraduated(p)) graduated.set(cat, (graduated.get(cat) ?? 0) + 1);
  }
  let mastered = 0;
  for (const [cat, count] of studied) {
    if (count < MASTERY_MIN_STUDIED) continue;
    if ((graduated.get(cat) ?? 0) / count >= MASTERY_RATIO) mastered += 1;
  }
  return mastered;
}

// 10-3: 세션 종료 시점의 상태로 배지 판정 컨텍스트를 만든다(클라이언트 — 단어 카테고리 매핑 사용).
export function buildSnapshot(input: SnapshotInput): AchievementContext {
  const rows = Object.values(input.progressAfter);
  const graduatedCount = rows.filter(isGraduated).length;
  const categoriesExplored = new Set(
    rows.map((p) => wordCategoryMap.get(p.word_id)).filter(Boolean),
  ).size;
  const season = input.today.slice(0, 7);

  return {
    today: input.today,
    season,
    earnedKeys: input.earnedKeys,
    streak: input.streak,
    bestStreak: input.bestStreak,
    everBrokeStreak: input.prevBestStreak > input.streak,
    totalLearned: input.totalLearned,
    graduatedCount,
    categoriesExplored,
    masteredCategories: masteredCategoryCount(input.progressAfter),
    weekendBothDays: weekendBoth(input.studyDays),
    daysStudiedThisMonth: daysInMonth(input.studyDays, season),
    session: sessionFacts(input),
  };
}
