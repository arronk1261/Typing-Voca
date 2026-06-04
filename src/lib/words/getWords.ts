import rawWords from "@/data/words.json";
import { getSupabase } from "@/lib/supabase/client";
import { isDue } from "@/lib/srs";
import { isWord, type Progress, type Word, type WordLevel } from "@/types";

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

const REVIEW_RATIO = 0.3;

export interface BuildSessionInput {
  level: WordLevel;
  progress: Record<number, Progress>;
  categories?: string[];
  count?: number;
}

// 출제 로직 (plan 5.4): 신규 70% + 복습 30%, 신규는 미학습 우선, 복습은 next_due 지난 것 오래된 순
export async function buildSession({
  level,
  progress,
  categories,
  count = 10,
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

  const unseen = shuffle(pool.filter((w) => !progress[w.id]));
  const dueReview = pool
    .filter((w) => progress[w.id] && isDue(progress[w.id]))
    .sort((a, b) => {
      const da = progress[a.id].next_due ?? "";
      const db = progress[b.id].next_due ?? "";
      return da.localeCompare(db);
    });
  const seenNotDue = shuffle(
    pool.filter((w) => progress[w.id] && !isDue(progress[w.id])),
  ).sort((a, b) => {
    const la = progress[a.id].last_seen ?? "";
    const lb = progress[b.id].last_seen ?? "";
    return la.localeCompare(lb);
  });

  const reviewTarget = Math.round(count * REVIEW_RATIO);
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

  take(dueReview, reviewTarget);
  take(unseen, count - chosen.length);
  take(seenNotDue, count - chosen.length);
  take(dueReview, count - chosen.length);

  return shuffle(chosen).slice(0, count);
}

export type LevelSuggestion = "up" | "down" | null;

export interface SessionStats {
  total: number;
  firstTryCorrect: number;
  avgStars: number | null;
  reviewCount: number;
}

// 적응형 레벨 제안 (plan 5.4, 강제 X): 잘하면 상향 / 자주 막히면 하향
export function suggestLevelAdjustment(
  stats: SessionStats,
  level: WordLevel,
): LevelSuggestion {
  if (stats.total === 0) return null;
  const correctRate = stats.firstTryCorrect / stats.total;
  const reviewRate = stats.reviewCount / stats.total;

  if (level < 3 && correctRate >= 0.8 && (stats.avgStars ?? 0) >= 2) {
    return "up";
  }
  if (level > 1 && reviewRate >= 0.4) {
    return "down";
  }
  return null;
}
