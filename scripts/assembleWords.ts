import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { validate } from "./validateWords.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const GEN = resolve(__dirname, "../src/data/generated");
const OUT = resolve(__dirname, "../src/data/words.json");

const CATEGORIES = [
  "greeting", "shopping", "restaurant", "travel", "work", "phone_email",
  "emotion", "schedule", "health", "daily", "social", "it",
];

function main() {
  const all: Record<string, unknown>[] = [];
  const missing: string[] = [];
  for (const cat of CATEGORIES) {
    const p = resolve(GEN, `${cat}.json`);
    if (!existsSync(p)) {
      missing.push(cat);
      continue;
    }
    const rows = JSON.parse(readFileSync(p, "utf-8")) as Record<string, unknown>[];
    rows.sort((a, b) => (a.level as number) - (b.level as number));
    all.push(...rows);
    console.log(`  ${cat}: ${rows.length}개`);
  }
  if (missing.length) {
    console.error(`❌ 생성 파일 누락: ${missing.join(", ")}`);
    process.exit(1);
  }

  const { errors, warnings } = validate(all);
  if (warnings.length) {
    console.log(`\n⚠️  경고 ${warnings.length}건:`);
    warnings.slice(0, 40).forEach((w) => console.log("  - " + w));
  }
  if (errors.length) {
    console.log(`\n❌ 오류 ${errors.length}건 — 조립 중단:`);
    errors.slice(0, 80).forEach((e) => console.log("  - " + e));
    process.exit(1);
  }

  const withId = all.map((w, i) => ({ id: i + 1, ...w }));
  writeFileSync(OUT, JSON.stringify(withId, null, 2) + "\n", "utf-8");
  console.log(`\n✅ ${OUT} 작성 완료 — 총 ${withId.length}행.`);
}

main();
