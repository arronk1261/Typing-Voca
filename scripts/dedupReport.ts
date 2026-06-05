import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface Row {
  id: number;
  category: string;
  level: number;
  answer: string;
  sentence_en: string;
  tts_text: string;
  use_case?: string[];
}

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

interface DupGroup {
  answer: string;
  count: number;
  categories: string[];
  occurrences: { id: number; category: string; level: number; tts_text: string }[];
  kind: "within_category" | "cross_category";
  verdict: "intentional_reexposure" | "contamination";
  reason: string;
}

function analyze(rows: Row[]): { groups: DupGroup[]; contamination: DupGroup[] } {
  const byAnswer = new Map<string, Row[]>();
  for (const r of rows) {
    const key = normalize(r.answer);
    const arr = byAnswer.get(key) ?? [];
    arr.push(r);
    byAnswer.set(key, arr);
  }

  const groups: DupGroup[] = [];
  for (const [key, arr] of byAnswer) {
    if (arr.length < 2) continue;
    const categories = [...new Set(arr.map((r) => r.category))];
    const withinCategory = categories.length < arr.length;

    const sentences = new Set(arr.map((r) => normalize(r.tts_text)));
    const identicalSentence = sentences.size < arr.length;

    let verdict: DupGroup["verdict"];
    let reason: string;

    if (withinCategory) {
      verdict = "contamination";
      reason = "동일 카테고리 내 중복 — 6-1 검수기가 차단(0건이어야 정상)";
    } else if (identicalSentence) {
      verdict = "contamination";
      reason = "서로 다른 카테고리지만 동일 예문 단순 복제 — 맥락 차별화 없음";
    } else {
      verdict = "intentional_reexposure";
      reason = `${categories.length}개 카테고리에서 서로 다른 맥락의 예문으로 재노출 — 간격 반복(spaced exposure)에 유익`;
    }

    groups.push({
      answer: key,
      count: arr.length,
      categories,
      occurrences: arr.map((r) => ({
        id: r.id,
        category: r.category,
        level: r.level,
        tts_text: r.tts_text,
      })),
      kind: withinCategory ? "within_category" : "cross_category",
      verdict,
      reason,
    });
  }

  groups.sort((a, b) => b.count - a.count || a.answer.localeCompare(b.answer));
  const contamination = groups.filter((g) => g.verdict === "contamination");
  return { groups, contamination };
}

function main() {
  const path = process.argv[2] ?? resolve(__dirname, "../src/data/words.json");
  const rows = JSON.parse(readFileSync(path, "utf-8")) as Row[];
  const { groups, contamination } = analyze(rows);

  const cross = groups.filter((g) => g.kind === "cross_category");
  const within = groups.filter((g) => g.kind === "within_category");

  console.log(`🔎 중복 answer 분석: ${path} (${rows.length}행)`);
  console.log(`\n총 중복 그룹: ${groups.length}종`);
  console.log(`  • 카테고리 내 중복(오염, 차단 대상): ${within.length}종`);
  console.log(`  • 카테고리 간 중복(맥락 재노출 후보): ${cross.length}종`);
  console.log(`  • 오염성(교체/제거 권고): ${contamination.length}종`);

  if (contamination.length) {
    console.log(`\n❌ 오염성 중복 ${contamination.length}종 (검토 필요):`);
    for (const g of contamination.slice(0, 40)) {
      console.log(`  - "${g.answer}" ×${g.count} [${g.categories.join(", ")}] — ${g.reason}`);
      for (const o of g.occurrences) console.log(`      id ${o.id} ${o.category}/L${o.level}: ${o.tts_text}`);
    }
  } else {
    console.log(`\n✅ 오염성 중복 0종 — 모든 중복이 서로 다른 카테고리·맥락의 의도적 재노출.`);
  }

  const reportPath = resolve(__dirname, "../docs/duplicate-answer-report.md");
  const lines: string[] = [];
  lines.push("# 중복 answer 검수 로그 (Phase 6-3)");
  lines.push("");
  lines.push(`> 생성: \`npm run dedup:report\` · 대상 ${rows.length}행 · plan.md 6-3`);
  lines.push("");
  lines.push("## 요약");
  lines.push("");
  lines.push(`- 총 중복 그룹: **${groups.length}종**`);
  lines.push(`- 카테고리 내 중복(오염): **${within.length}종** (6-1 검수기가 차단 — 0이어야 정상)`);
  lines.push(`- 카테고리 간 중복(맥락 재노출): **${cross.length}종**`);
  lines.push(`- 오염성(교체/제거 권고): **${contamination.length}종**`);
  lines.push("");
  lines.push("## 판정 기준");
  lines.push("");
  lines.push("- **의도적 재노출(유지):** 서로 다른 카테고리에서 *서로 다른 예문*으로 등장 → 간격 반복으로 장기 기억에 유익.");
  lines.push("- **오염(교체/제거):** ①같은 카테고리 내 중복(검수기 차단) 또는 ②다른 카테고리지만 *동일 예문* 단순 복제(맥락 차별화 없음).");
  lines.push("");
  if (contamination.length) {
    lines.push("## ❌ 오염성 중복 (조치 필요)");
    lines.push("");
    for (const g of contamination) {
      lines.push(`### \`${g.answer}\` ×${g.count} — ${g.reason}`);
      for (const o of g.occurrences) lines.push(`- id ${o.id} · ${o.category}/L${o.level} · ${o.tts_text}`);
      lines.push("");
    }
  } else {
    lines.push("## ✅ 오염성 중복 0종");
    lines.push("");
    lines.push("모든 중복이 서로 다른 카테고리에서 서로 다른 예문으로 재노출되어 학습상 유익합니다. 교체/제거 대상 없음.");
    lines.push("");
  }
  lines.push("## 카테고리 간 재노출 전체 목록 (유지)");
  lines.push("");
  lines.push("| answer | 횟수 | 카테고리 |");
  lines.push("| --- | --- | --- |");
  for (const g of cross.filter((g) => g.verdict === "intentional_reexposure"))
    lines.push(`| ${g.answer} | ${g.count} | ${g.categories.join(", ")} |`);
  lines.push("");

  writeFileSync(reportPath, lines.join("\n"), "utf-8");
  console.log(`\n📝 리포트 저장: ${reportPath}`);

  if (contamination.length) process.exit(1);
  console.log(`\n✅ 6-3 통과: 오염성 중복 0종, 재노출 사유 기록 완료.`);
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) main();
