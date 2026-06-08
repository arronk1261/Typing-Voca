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

// 9-B2: "쉬운 대표 단어"가 아니라 진단 블루프린트로 앵커 구성.
// 레벨별로 실전 회화력이 드러나는 chunk_type을 슬롯으로 지정하고,
// 카테고리는 12문항 안에서 최대한 분산(≥8 목표)시킨다.
const LEVEL_BLUEPRINT: Record<1 | 2 | 3, string[]> = {
  1: ["single_word", "single_word", "single_word", "single_word"],
  2: ["collocation", "phrasal_verb", "collocation", "sentence_frame"],
  3: ["collocation", "phrasal_verb", "sentence_frame", "idiom"],
};

function freqRank(word: RawWord): number {
  return word.frequency === "high" ? 0 : word.frequency === "mid" ? 1 : 2;
}

function pickForSlot(
  pool: RawWord[],
  chunkType: string,
  usedIds: Set<number>,
  usedCategories: Set<string>,
): RawWord | null {
  const candidates = pool
    .filter((w) => !usedIds.has(w.id) && w.chunk_type === chunkType)
    .sort(
      (a, b) =>
        freqRank(a) - freqRank(b) ||
        (usedCategories.has(a.category) ? 1 : 0) -
          (usedCategories.has(b.category) ? 1 : 0) ||
        a.id - b.id,
    );
  // 카테고리 미사용 우선, 없으면 빈도순 차선
  const fresh = candidates.find((w) => !usedCategories.has(w.category));
  return fresh ?? candidates[0] ?? null;
}

function pickAnchors(pool: RawWord[], blueprint: string[], usedCategories: Set<string>): RawWord[] {
  const usedIds = new Set<number>();
  const chosen: RawWord[] = [];
  for (const chunkType of blueprint) {
    let picked = pickForSlot(pool, chunkType, usedIds, usedCategories);
    if (!picked) {
      // 해당 chunk_type이 부족하면 어떤 유형이든 카테고리 다양성 우선으로 충원
      picked = pickForSlot(pool, pool.find((w) => !usedIds.has(w.id))?.chunk_type ?? "", usedIds, usedCategories)
        ?? pool.filter((w) => !usedIds.has(w.id)).sort((a, b) => freqRank(a) - freqRank(b) || a.id - b.id)[0]
        ?? null;
    }
    if (!picked) continue;
    usedIds.add(picked.id);
    usedCategories.add(picked.category);
    chosen.push(picked);
  }
  return chosen.sort((a, b) => a.id - b.id);
}

function main(): void {
  const wordsPath = new URL("../src/data/words.json", import.meta.url);
  const words = JSON.parse(readFileSync(wordsPath, "utf8")) as RawWord[];

  const anchors: RawWord[] = [];
  const usedCategories = new Set<string>();
  for (const level of [1, 2, 3] as const) {
    const pool = words.filter((w) => w.level === level);
    const picked = pickAnchors(pool, LEVEL_BLUEPRINT[level], usedCategories);
    if (picked.length < LEVEL_BLUEPRINT[level].length) {
      throw new Error(`레벨 ${level} 앵커 부족: ${picked.length}`);
    }
    anchors.push(...picked);
  }

  const distinctCategories = new Set(anchors.map((w) => w.category)).size;
  if (distinctCategories < 8) {
    console.warn(`⚠️ 카테고리 분산 부족: ${distinctCategories}/12 (목표 ≥8)`);
  }

  const outPath = new URL("../src/data/anchorTest.json", import.meta.url);
  writeFileSync(outPath, `${JSON.stringify(anchors, null, 2)}\n`, "utf8");

  const summary = anchors.map((w) => `L${w.level} ${w.category}: "${w.answer}" (${w.frequency}/${w.chunk_type})`);
  console.log(`앵커 ${anchors.length}문항 생성:\n${summary.join("\n")}`);
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) main();
