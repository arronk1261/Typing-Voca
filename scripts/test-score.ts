import { scoreShadowing } from "../src/lib/shadowing/score.ts";

interface Case {
  name: string;
  original: string;
  spoken: string;
  confidence?: number;
  expect: (r: ReturnType<typeof scoreShadowing>) => boolean;
  describe: string;
}

const cases: Case[] = [
  {
    name: "perfect",
    original: "How are you doing today?",
    spoken: "How are you doing today",
    expect: (r) => r.status === "scored" && r.score === 100 && r.stars === 3,
    describe: "완전 일치 → 100점 / ⭐⭐⭐",
  },
  {
    name: "contraction",
    original: "I do not know.",
    spoken: "I don't know",
    expect: (r) => r.status === "scored" && r.score! >= 85 && r.stars === 3,
    describe: "축약형(don't=do not) → 고득점",
  },
  {
    name: "homophone",
    original: "I want to see the sea.",
    spoken: "I want too sea the see",
    expect: (r) => r.status === "scored" && r.score! >= 80,
    describe: "동음 오인식(to/too, see/sea) → 0점 아님",
  },
  {
    name: "partial",
    original: "Could you do me a favor?",
    spoken: "Could you do",
    expect: (r) =>
      r.status === "scored" && r.score! > 20 && r.score! < 80 && r.weakWords.length > 0,
    describe: "부분 발화 → 중간 점수 + weakWords",
  },
  {
    name: "empty",
    original: "Nice to meet you.",
    spoken: "",
    expect: (r) => r.status === "retry" && r.score === null,
    describe: "빈 결과 → retry",
  },
  {
    name: "low-confidence",
    original: "Nice to meet you.",
    spoken: "something",
    confidence: 0.1,
    expect: (r) => r.status === "retry",
    describe: "저신뢰도 → retry",
  },
];

let pass = 0;
for (const c of cases) {
  const r = scoreShadowing(c.original, c.spoken, c.confidence ?? 1);
  const ok = c.expect(r);
  if (ok) pass += 1;
  console.log(
    `${ok ? "✅" : "❌"} ${c.name.padEnd(16)} ${c.describe}  → ${JSON.stringify(r)}`,
  );
}

console.log(`\n${pass}/${cases.length} passed`);
if (pass !== cases.length) process.exit(1);
