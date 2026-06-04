import { loadLevelPool } from "@/lib/words/getWords";
import type { Word, WordLevel } from "@/types";

function pickRandom(pool: Word[], n: number): Word[] {
  const copy = [...pool];
  const out: Word[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

export async function pickLevelTest(): Promise<Word[]> {
  const [l1, l2, l3] = await Promise.all([
    loadLevelPool(1),
    loadLevelPool(2),
    loadLevelPool(3),
  ]);
  return [...pickRandom(l1, 1), ...pickRandom(l2, 2), ...pickRandom(l3, 2)];
}

export function levelFromScore(correct: number): WordLevel {
  if (correct >= 4) return 3;
  if (correct >= 2) return 2;
  return 1;
}
