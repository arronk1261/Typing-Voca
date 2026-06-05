import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const GEN = resolve(__dirname, "../src/data/generated");

interface Patch {
  category: string;
  answer: string;
  matchTts: string;
  sentence_en: string;
  tts_text: string;
  sentence_ko: string;
}

const PATCHES: Patch[] = [
  {
    category: "social", answer: "drop by", matchTts: "Feel free to drop by anytime.",
    sentence_en: "Why don't you ___ after work?", tts_text: "Why don't you drop by after work?",
    sentence_ko: "퇴근하고 한번 들를래요?",
  },
  {
    category: "social", answer: "miss", matchTts: "I really miss you.",
    sentence_en: "I ___ hanging out with you.", tts_text: "I miss hanging out with you.",
    sentence_ko: "너랑 노는 게 그리워.",
  },
  {
    category: "schedule", answer: "break", matchTts: "Let's take a short break.",
    sentence_en: "There's a short ___ between meetings.", tts_text: "There's a short break between meetings.",
    sentence_ko: "회의 사이에 짧은 휴식이 있어요.",
  },
  {
    category: "schedule", answer: "follow up", matchTts: "I'll follow up with you tomorrow.",
    sentence_en: "Let's ___ next week.", tts_text: "Let's follow up next week.",
    sentence_ko: "다음 주에 다시 점검해요.",
  },
  {
    category: "emotion", answer: "mind", matchTts: "Do you mind if I sit here?",
    sentence_en: "I don't ___ at all.", tts_text: "I don't mind at all.",
    sentence_ko: "전혀 신경 안 써요.",
  },
  {
    category: "restaurant", answer: "pay by card", matchTts: "Can I pay by card?",
    sentence_en: "We'd like to ___.", tts_text: "We'd like to pay by card.",
    sentence_ko: "카드로 결제하고 싶어요.",
  },
  {
    category: "it", answer: "printer", matchTts: "The printer is out of ink.",
    sentence_en: "I can't connect to the ___.", tts_text: "I can't connect to the printer.",
    sentence_ko: "프린터에 연결이 안 돼요.",
  },
  {
    category: "social", answer: "visit", matchTts: "Come visit us sometime.",
    sentence_en: "I'd love to ___ your new place.", tts_text: "I'd love to visit your new place.",
    sentence_ko: "너의 새 집에 꼭 놀러 가고 싶어.",
  },
  {
    category: "social", answer: "wear his heart on his sleeve", matchTts: "He tends to wear his heart on his sleeve.",
    sentence_en: "Among friends, he tends to ___.", tts_text: "Among friends, he tends to wear his heart on his sleeve.",
    sentence_ko: "친구들 사이에서 그는 감정을 잘 드러내는 편이에요.",
  },
];

let applied = 0;
const byFile = new Map<string, Patch[]>();
for (const p of PATCHES) {
  const arr = byFile.get(p.category) ?? [];
  arr.push(p);
  byFile.set(p.category, arr);
}

for (const [cat, patches] of byFile) {
  const file = resolve(GEN, `${cat}.json`);
  const rows = JSON.parse(readFileSync(file, "utf-8")) as Record<string, unknown>[];
  for (const p of patches) {
    const row = rows.find((r) => r.answer === p.answer && r.tts_text === p.matchTts);
    if (!row) {
      console.error(`❌ 매칭 실패: ${cat} "${p.answer}" / ${p.matchTts}`);
      process.exit(1);
    }
    const filled = p.sentence_en.replace("___", p.answer);
    if (filled.trim() !== p.tts_text.trim()) {
      console.error(`❌ 빈칸채움≠tts: ${filled} ≠ ${p.tts_text}`);
      process.exit(1);
    }
    row.sentence_en = p.sentence_en;
    row.tts_text = p.tts_text;
    row.sentence_ko = p.sentence_ko;
    if (row.display_sentence !== undefined) row.display_sentence = p.tts_text;
    applied++;
  }
  writeFileSync(file, JSON.stringify(rows, null, 2) + "\n", "utf-8");
  console.log(`✏️  ${cat}.json: ${patches.length}건 패치`);
}

console.log(`\n✅ 총 ${applied}건 적용 완료.`);
