import { todayKey } from "@/lib/streak";
import { addDays } from "@/lib/srs";
import type { Progress, StudySession } from "@/types";

export interface CalendarCell {
  date: string;
  words: number;
  studied: boolean;
}

export interface TrendPoint {
  date: string;
  label: string;
  words: number;
  avgScore: number | null;
}

export interface CategoryMastery {
  key: string;
  label: string;
  studied: number;
  graduated: number;
  ratio: number;
}

export interface Totals {
  studied: number;
  graduated: number;
  inReview: number;
}

export interface DayBucket {
  words: number;
  scoreSum: number;
  scoreCount: number;
  starSum: number;
  starCount: number;
  sessions: number;
}

export function weekStartKey(today: string = todayKey()): string {
  const day = new Date(`${today}T00:00:00`).getDay();
  const offset = (day + 6) % 7;
  return addDays(today, -offset);
}

export function lastNDateKeys(today: string, n: number): string[] {
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) keys.push(addDays(today, -i));
  return keys;
}

export function bucketByDate(sessions: StudySession[]): Map<string, DayBucket> {
  const map = new Map<string, DayBucket>();
  for (const s of sessions) {
    const bucket = map.get(s.study_date) ?? {
      words: 0,
      scoreSum: 0,
      scoreCount: 0,
      starSum: 0,
      starCount: 0,
      sessions: 0,
    };
    bucket.words += s.words_count;
    bucket.sessions += 1;
    if (typeof s.avg_score === "number") {
      bucket.scoreSum += s.avg_score * s.words_count;
      bucket.scoreCount += s.words_count;
    }
    if (typeof s.avg_stars === "number") {
      bucket.starSum += s.avg_stars * s.words_count;
      bucket.starCount += s.words_count;
    }
    map.set(s.study_date, bucket);
  }
  return map;
}

export function studyCalendar(
  sessions: StudySession[],
  today: string = todayKey(),
  days = 70,
): CalendarCell[] {
  const buckets = bucketByDate(sessions);
  return lastNDateKeys(today, days).map((date) => {
    const words = buckets.get(date)?.words ?? 0;
    return { date, words, studied: words > 0 };
  });
}

function shortLabel(dateKey: string): string {
  const [, m, d] = dateKey.split("-");
  return `${Number(m)}/${Number(d)}`;
}

export function dailyTrend(
  sessions: StudySession[],
  today: string = todayKey(),
  days = 14,
): TrendPoint[] {
  const buckets = bucketByDate(sessions);
  return lastNDateKeys(today, days).map((date) => {
    const bucket = buckets.get(date);
    const avgScore =
      bucket && bucket.scoreCount > 0
        ? Math.round(bucket.scoreSum / bucket.scoreCount)
        : null;
    return { date, label: shortLabel(date), words: bucket?.words ?? 0, avgScore };
  });
}

export function totals(progressRows: Progress[]): Totals {
  let graduated = 0;
  let inReview = 0;
  for (const p of progressRows) {
    if (p.pass_count >= 2 && !p.in_review) graduated += 1;
    if (p.in_review) inReview += 1;
  }
  return { studied: progressRows.length, graduated, inReview };
}

export function categoryMastery(
  progressRows: Progress[],
  wordCategory: Map<number, string>,
  labelOf: (key: string) => string,
): CategoryMastery[] {
  const studied = new Map<string, number>();
  const graduated = new Map<string, number>();
  for (const p of progressRows) {
    const key = wordCategory.get(p.word_id);
    if (!key) continue;
    studied.set(key, (studied.get(key) ?? 0) + 1);
    if (p.pass_count >= 2 && !p.in_review) {
      graduated.set(key, (graduated.get(key) ?? 0) + 1);
    }
  }
  return [...studied.entries()]
    .map(([key, count]) => {
      const grad = graduated.get(key) ?? 0;
      return {
        key,
        label: labelOf(key),
        studied: count,
        graduated: grad,
        ratio: count > 0 ? grad / count : 0,
      };
    })
    .sort((a, b) => b.studied - a.studied);
}

export interface WeeklyReport {
  daysStudied: number;
  totalWords: number;
  avgScore: number | null;
  avgStars: number | null;
  bestCategory: { key: string; label: string; words: number } | null;
  topMastered: { key: string; label: string; ratio: number } | null;
  deltaWords: number;
  deltaDays: number;
  prevTotalWords: number;
  hasData: boolean;
}

function weekWindow(sessions: StudySession[], from: string, to: string) {
  const inRange = sessions.filter(
    (s) => s.study_date >= from && s.study_date <= to,
  );
  const dates = new Set(inRange.map((s) => s.study_date));
  const words = inRange.reduce((sum, s) => sum + s.words_count, 0);
  let scoreSum = 0;
  let scoreCount = 0;
  let starSum = 0;
  let starCount = 0;
  for (const s of inRange) {
    if (typeof s.avg_score === "number") {
      scoreSum += s.avg_score * s.words_count;
      scoreCount += s.words_count;
    }
    if (typeof s.avg_stars === "number") {
      starSum += s.avg_stars * s.words_count;
      starCount += s.words_count;
    }
  }
  return {
    daysStudied: dates.size,
    words,
    avgScore: scoreCount > 0 ? Math.round(scoreSum / scoreCount) : null,
    avgStars: starCount > 0 ? starSum / starCount : null,
  };
}

export function weeklyReport(
  sessions: StudySession[],
  progressRows: Progress[],
  wordCategory: Map<number, string>,
  labelOf: (key: string) => string,
  today: string = todayKey(),
): WeeklyReport {
  const thisFrom = addDays(today, -6);
  const lastFrom = addDays(today, -13);
  const lastTo = addDays(today, -7);

  const cur = weekWindow(sessions, thisFrom, today);
  const prev = weekWindow(sessions, lastFrom, lastTo);

  const recentSeen = new Set(
    progressRows.filter((p) => p.last_seen && p.last_seen >= thisFrom).map((p) => p.word_id),
  );
  const catWords = new Map<string, number>();
  for (const wordId of recentSeen) {
    const key = wordCategory.get(wordId);
    if (!key) continue;
    catWords.set(key, (catWords.get(key) ?? 0) + 1);
  }
  let bestCategory: WeeklyReport["bestCategory"] = null;
  for (const [key, words] of catWords) {
    if (!bestCategory || words > bestCategory.words) {
      bestCategory = { key, label: labelOf(key), words };
    }
  }

  const mastery = categoryMastery(progressRows, wordCategory, labelOf).filter(
    (c) => c.studied >= 1 && c.graduated > 0,
  );
  const top = [...mastery].sort(
    (a, b) => b.ratio - a.ratio || b.graduated - a.graduated || b.studied - a.studied,
  )[0];
  const topMastered = top
    ? { key: top.key, label: top.label, ratio: top.ratio }
    : null;

  return {
    daysStudied: cur.daysStudied,
    totalWords: cur.words,
    avgScore: cur.avgScore,
    avgStars: cur.avgStars,
    bestCategory,
    topMastered,
    deltaWords: cur.words - prev.words,
    deltaDays: cur.daysStudied - prev.daysStudied,
    prevTotalWords: prev.words,
    hasData: cur.words > 0 || cur.daysStudied > 0,
  };
}
