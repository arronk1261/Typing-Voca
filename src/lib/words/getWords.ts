import rawWords from "@/data/words.json";
import { getSupabase } from "@/lib/supabase/client";
import { isDue } from "@/lib/srs";
import { todayKey } from "@/lib/streak";
import {
  adaptiveReviewRatio,
  limitLowFrequency,
  orderByCategoryFlow,
  orderByCurriculum,
  pickMaintenanceWords,
} from "@/lib/words/adaptive";
import { isWord, type Progress, type Word, type WordLevel } from "@/types";

export {
  adaptiveReviewRatio,
  curriculumLayer,
  limitLowFrequency,
  orderByCurriculum,
  pickMaintenanceWords,
  orderByCategoryFlow,
  suggestLevelAdjustment,
  suggestLevelFromHistory,
} from "@/lib/words/adaptive";
export type { CurriculumLayer } from "@/lib/words/adaptive";
export type {
  ReviewRatioContext,
  LevelSuggestion,
  SessionStats,
  RollingWindow,
} from "@/lib/words/adaptive";

const BUNDLED: Word[] = (rawWords as unknown[]).filter(isWord);
const LEVELS: WordLevel[] = [1, 2, 3];

const cacheKey = (level: WordLevel) => `tv:words:level:${level}`;

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function readCache(level: WordLevel): Word[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(cacheKey(level));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isWord) : null;
  } catch {
    return null;
  }
}

function writeCache(level: WordLevel, words: Word[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(cacheKey(level), JSON.stringify(words));
  } catch {
    /* quota or disabled — ignore */
  }
}

export async function loadLevelPool(level: WordLevel): Promise<Word[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("words")
        .select("*")
        .eq("level", level);
      if (!error && Array.isArray(data) && data.length > 0) {
        const words = (data as unknown[]).filter(isWord);
        writeCache(level, words);
        return words;
      }
    } catch {
      /* network failure — fall through to cache/bundle */
    }
  }

  const cached = readCache(level);
  if (cached && cached.length > 0) return cached;

  return BUNDLED.filter((w) => w.level === level);
}

function adjacentLevels(level: WordLevel): WordLevel[] {
  return LEVELS.filter((l) => l !== level).sort(
    (a, b) => Math.abs(a - level) - Math.abs(b - level),
  );
}

function dedupeById(words: Word[]): Word[] {
  const seen = new Set<number>();
  const result: Word[] = [];
  for (const w of words) {
    if (seen.has(w.id)) continue;
    seen.add(w.id);
    result.push(w);
  }
  return result;
}

export interface GetWordsOptions {
  level: WordLevel;
  categories?: string[];
  count?: number;
}

export async function getWords({
  level,
  categories,
  count = 10,
}: GetWordsOptions): Promise<Word[]> {
  let pool = await loadLevelPool(level);
  if (categories && categories.length > 0) {
    pool = pool.filter((w) => categories.includes(w.category));
  }
  return shuffle(pool).slice(0, count);
}

export async function buildDefaultSession(
  level: WordLevel,
  count = 10,
): Promise<Word[]> {
  const pool = await loadLevelPool(level);
  return shuffle(pool).slice(0, count);
}

export async function buildCategorySession(
  level: WordLevel,
  categories: string[],
  count = 10,
): Promise<Word[]> {
  if (categories.length === 0) return buildDefaultSession(level, count);

  const inCategories = (w: Word) => categories.includes(w.category);
  let pool = (await loadLevelPool(level)).filter(inCategories);

  for (const adj of adjacentLevels(level)) {
    if (pool.length >= count) break;
    const more = (await loadLevelPool(adj)).filter(inCategories);
    pool = dedupeById([...pool, ...more]);
  }

  return shuffle(pool).slice(0, count);
}

export async function buildReviewSession(
  reviewIds: number[],
  count = 10,
): Promise<Word[]> {
  if (reviewIds.length === 0) return [];
  const wanted = new Set(reviewIds);
  const pools = await Promise.all(LEVELS.map((l) => loadLevelPool(l)));
  const matched = dedupeById(pools.flat()).filter((w) => wanted.has(w.id));
  return shuffle(matched).slice(0, count);
}

export interface BuildSessionInput {
  level: WordLevel;
  progress: Record<number, Progress>;
  categories?: string[];
  count?: number;
  streakBroken?: boolean;
  today?: string;
}

// 출제 로직 (plan 5.4 + 8-3/8-6): 적응형 신규/복습 비율 + 졸업 단어 유지 점검 소량 혼입
export async function buildSession({
  level,
  progress,
  categories,
  count = 10,
  streakBroken = false,
  today = todayKey(),
}: BuildSessionInput): Promise<Word[]> {
  const hasCategories = !!categories && categories.length > 0;
  let pool = await loadLevelPool(level);
  if (hasCategories) {
    const inCategories = (w: Word) => categories!.includes(w.category);
    pool = pool.filter(inCategories);
    for (const adj of adjacentLevels(level)) {
      if (pool.length >= count) break;
      const more = (await loadLevelPool(adj)).filter(inCategories);
      pool = dedupeById([...pool, ...more]);
    }
  }

  const seenCount = Object.keys(progress).length;
  const inReviewCount = Object.values(progress).filter((p) => p.in_review).length;
  const reviewRatio = adaptiveReviewRatio({
    level,
    seenCount,
    inReviewCount,
    streakBroken,
  });

  const LOW_FREQ_CAP = Math.max(0, Math.floor(count * 0.1));
  const isEarlyLearner = level === 1 && seenCount < 30;
  const unseenShuffled = shuffle(pool.filter((w) => !progress[w.id]));
  // 9-C2: 초급 학습자에겐 생존·일상 표현을 먼저 노출
  const unseenAll = isEarlyLearner ? orderByCurriculum(unseenShuffled) : unseenShuffled;
  const unseen = hasCategories
    ? unseenAll
    : limitLowFrequency(unseenAll, LOW_FREQ_CAP);
  const dueReview = pool
    .filter((w) => progress[w.id] && isDue(progress[w.id], today))
    .sort((a, b) => {
      const da = progress[a.id].next_due ?? "";
      const db = progress[b.id].next_due ?? "";
      return da.localeCompare(db);
    });
  const seenNotDue = shuffle(
    pool.filter((w) => progress[w.id] && !isDue(progress[w.id], today)),
  ).sort((a, b) => {
    const la = progress[a.id].last_seen ?? "";
    const lb = progress[b.id].last_seen ?? "";
    return la.localeCompare(lb);
  });

  const maintenance = pickMaintenanceWords(pool, progress, today, 1);
  const reviewTarget = Math.round(count * reviewRatio);
  const chosen: Word[] = [];
  const take = (list: Word[], n: number) => {
    for (const w of list) {
      if (chosen.length >= count) break;
      if (n <= 0) break;
      if (chosen.some((c) => c.id === w.id)) continue;
      chosen.push(w);
      n -= 1;
    }
  };

  take(maintenance, 1);
  take(dueReview, reviewTarget);
  take(unseen, count - chosen.length);
  take(seenNotDue, count - chosen.length);
  take(dueReview, count - chosen.length);

  const result = chosen.slice(0, count);
  return hasCategories ? orderByCategoryFlow(result) : shuffle(result);
}
