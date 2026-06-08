import { readFileSync, writeFileSync } from "node:fs";
import {
  PHONEME_LABEL,
  pronunciationDifficulty,
  pronunciationFeatures,
  type PhonemeFeature,
} from "../src/lib/shadowing/pronunciation.ts";

interface RawWord {
  id: number;
  level: 1 | 2 | 3;
  answer: string;
  difficulty_axis?: string;
  [key: string]: unknown;
}

function main(): void {
  const wordsPath = new URL("../src/data/words.json", import.meta.url);
  const words = JSON.parse(readFileSync(wordsPath, "utf8")) as RawWord[];

  const featureTally = new Map<PhonemeFeature, number>();
  const diffTally = new Map<number, number>();
  let withFeature = 0;
  let legacyPronTag = 0;

  for (const w of words) {
    const features = pronunciationFeatures(w.answer);
    const diff = pronunciationDifficulty(w.answer);
    diffTally.set(diff, (diffTally.get(diff) ?? 0) + 1);
    if (features.length > 0) withFeature += 1;
    for (const f of features) featureTally.set(f, (featureTally.get(f) ?? 0) + 1);
    if (w.difficulty_axis === "pronunciation") legacyPronTag += 1;
  }

  const lines: string[] = [];
  lines.push("# 발음 난이도 전수 분석 (Phase 9-1b)\n");
  lines.push(
    "> `scripts/tagPronunciation.ts`가 표면형에서 파생 추정한 결과. 런타임은 `pronunciationDifficulty`/`pronunciationFeatures`로 동일하게 계산하므로 별도 DB 컬럼·시드 없이 동작한다.\n",
  );
  lines.push(`- 총 단어: **${words.length}**`);
  lines.push(
    `- 발음 난이 요소 1개 이상 포함: **${withFeature}** (${Math.round((withFeature / words.length) * 100)}%)`,
  );
  lines.push(
    `- (참고) 기존 \`difficulty_axis=pronunciation\` 태그: ${legacyPronTag}개 → 파생 분석으로 커버리지 대폭 확대\n`,
  );

  lines.push("## 음소 요소별 분포");
  for (const [f, n] of [...featureTally.entries()].sort((a, b) => b[1] - a[1])) {
    lines.push(`- ${PHONEME_LABEL[f]}: ${n}`);
  }
  lines.push("\n## 난이도(요소 개수)별 분포");
  for (const d of [...diffTally.keys()].sort((a, b) => a - b)) {
    lines.push(`- ${d}개 요소: ${diffTally.get(d)}`);
  }
  lines.push("");

  const outPath = new URL("../docs/pronunciation-coverage.md", import.meta.url);
  writeFileSync(outPath, lines.join("\n"), "utf8");
  console.log(lines.join("\n"));
  console.log(`\n✅ docs/pronunciation-coverage.md 생성`);
}

main();
