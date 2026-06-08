import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

interface RawWord {
  id: number;
  category: string;
  level: 1 | 2 | 3;
  answer: string;
  frequency?: string;
  chunk_type?: string;
  [key: string]: unknown;
}

const ANCHORS_PER_LEVEL = 4;
const CHUNK_PRIORITY: Record<string, number> = {
  single_word: 0,
  collocation: 1,
  phrasal_verb: 2,
  sentence_frame: 3,
  idiom: 4,
};

function score(word: RawWord): number {
  const freq = word.frequency === "high" ? 0 : word.frequency === "mid" ? 1 : 2;
  const chunk = CHUNK_PRIORITY[word.chunk_type ?? ""] ?? 5;
  return freq * 10 + chunk;
}

function pickAnchors(pool: RawWord[]): RawWord[] {
  const ranked = [...pool].sort((a, b) => score(a) - score(b) || a.id - b.id);
  const chosen: RawWord[] = [];
  const usedCategories = new Set<string>();
  for (const word of ranked) {
    if (chosen.length >= ANCHORS_PER_LEVEL) break;
    if (usedCategories.has(word.category)) continue;
    chosen.push(word);
    usedCategories.add(word.category);
  }
  return chosen.sort((a, b) => a.id - b.id);
}

function main(): void {
  const wordsPath = new URL("../src/data/words.json", import.meta.url);
  const words = JSON.parse(readFileSync(wordsPath, "utf8")) as RawWord[];

  const anchors: RawWord[] = [];
  for (const level of [1, 2, 3] as const) {
    const pool = words.filter((w) => w.level === level);
    const picked = pickAnchors(pool);
    if (picked.length < ANCHORS_PER_LEVEL) {
      throw new Error(`레벨 ${level} 앵커 부족: ${picked.length}`);
    }
    anchors.push(...picked);
  }

  const outPath = new URL("../src/data/anchorTest.json", import.meta.url);
  writeFileSync(outPath, `${JSON.stringify(anchors, null, 2)}\n`, "utf8");

  const summary = anchors.map((w) => `L${w.level} ${w.category}: "${w.answer}" (${w.frequency}/${w.chunk_type})`);
  console.log(`앵커 ${anchors.length}문항 생성:\n${summary.join("\n")}`);
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) main();
