import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const CATEGORIES = [
  "greeting", "shopping", "restaurant", "travel", "work", "phone_email",
  "emotion", "schedule", "health", "daily", "social", "it",
];
const CEFR_BY_LEVEL: Record<number, string> = { 1: "A1-A2", 2: "B1", 3: "B2-C1" };
const FREQUENCY = ["high", "mid", "low"];
const CHUNK_TYPE = ["single_word", "collocation", "phrasal_verb", "idiom", "sentence_frame"];
const DIFFICULTY = ["spelling", "meaning", "usage", "pronunciation"];
const BLANK = "___";
const PLACEHOLDER = /\b(someone|somebody|something)\b/i;

interface Row {
  category: string; level: number; cefr: string; answer: string;
  sentence_en: string; sentence_ko: string; meaning: string; tts_text: string;
  display_sentence: string; frequency: string; chunk_type: string;
  difficulty_axis: string; use_case: string[];
}

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

function validateRow(w: Partial<Row>, where: string, errors: string[], warnings: string[]) {
  const need = ["category", "level", "cefr", "answer", "sentence_en", "sentence_ko",
    "meaning", "tts_text", "display_sentence", "frequency", "chunk_type", "difficulty_axis"];
  for (const f of need) {
    if (w[f as keyof Row] === undefined || w[f as keyof Row] === null || w[f as keyof Row] === "")
      errors.push(`${where}: 필드 누락 '${f}'`);
  }
  if (!Array.isArray(w.use_case) || w.use_case.length === 0)
    errors.push(`${where}: use_case 배열 필요`);
  if (typeof w.category !== "string" || !CATEGORIES.includes(w.category))
    errors.push(`${where}: 잘못된 category '${w.category}'`);
  if (![1, 2, 3].includes(w.level as number))
    errors.push(`${where}: 잘못된 level '${w.level}'`);
  else if (w.cefr !== CEFR_BY_LEVEL[w.level as number])
    errors.push(`${where}: cefr '${w.cefr}' ≠ level ${w.level}(${CEFR_BY_LEVEL[w.level as number]})`);
  if (w.frequency && !FREQUENCY.includes(w.frequency)) errors.push(`${where}: frequency '${w.frequency}'`);
  if (w.chunk_type && !CHUNK_TYPE.includes(w.chunk_type)) errors.push(`${where}: chunk_type '${w.chunk_type}'`);
  if (w.difficulty_axis && !DIFFICULTY.includes(w.difficulty_axis)) errors.push(`${where}: difficulty_axis '${w.difficulty_axis}'`);

  const sen = w.sentence_en ?? "";
  const blanks = sen.split(BLANK).length - 1;
  if (blanks !== 1) errors.push(`${where}: 빈칸(___)이 ${blanks}개 (정확히 1개여야 함) | ${sen}`);
  else if (w.answer && w.tts_text) {
    const filled = sen.replace(BLANK, w.answer);
    if (filled.trim() !== w.tts_text.trim())
      errors.push(`${where}: 빈칸채움≠tts\n     채움: ${filled}\n     tts : ${w.tts_text}`);
  }
  if (w.answer && PLACEHOLDER.test(w.answer))
    errors.push(`${where}: answer에 placeholder '${w.answer}'`);
  if (w.tts_text && PLACEHOLDER.test(w.tts_text))
    warnings.push(`${where}: tts_text에 someone/something 포함(검토) | ${w.tts_text}`);
}

export function validate(rows: Partial<Row>[]): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  rows.forEach((w, i) => validateRow(w, `[${i}] ${w.category}/L${w.level} "${w.answer}"`, errors, warnings));

  // 카테고리 내 answer 중복
  const byCat = new Map<string, Map<string, number>>();
  rows.forEach((w) => {
    if (!w.category || !w.answer) return;
    const m = byCat.get(w.category) ?? new Map();
    const key = normalize(w.answer);
    m.set(key, (m.get(key) ?? 0) + 1);
    byCat.set(w.category, m);
  });
  for (const [cat, m] of byCat)
    for (const [ans, n] of m)
      if (n > 1) errors.push(`중복 answer: ${cat} '${ans}' ×${n}`);

  // 셀당 개수
  const cell = new Map<string, number>();
  rows.forEach((w) => {
    const k = `${w.category}/L${w.level}`;
    cell.set(k, (cell.get(k) ?? 0) + 1);
  });
  for (const cat of CATEGORIES)
    for (const lv of [1, 2, 3]) {
      const k = `${cat}/L${lv}`;
      const n = cell.get(k) ?? 0;
      if (n !== 70) warnings.push(`셀 개수: ${k} = ${n}개 (목표 70)`);
    }

  return { errors, warnings };
}

function main() {
  const path = process.argv[2] ?? resolve(__dirname, "../src/data/words.json");
  const rows = JSON.parse(readFileSync(path, "utf-8")) as Partial<Row>[];
  console.log(`🔎 검수: ${path} (${rows.length}행)`);
  const { errors, warnings } = validate(rows);
  if (warnings.length) {
    console.log(`\n⚠️  경고 ${warnings.length}건:`);
    warnings.slice(0, 60).forEach((w) => console.log("  - " + w));
    if (warnings.length > 60) console.log(`  ... +${warnings.length - 60}건`);
  }
  if (errors.length) {
    console.log(`\n❌ 오류 ${errors.length}건:`);
    errors.slice(0, 80).forEach((e) => console.log("  - " + e));
    if (errors.length > 80) console.log(`  ... +${errors.length - 80}건`);
    process.exit(1);
  }
  console.log(`\n✅ 오류 0건. 총 ${rows.length}행 검수 통과.`);
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) main();
