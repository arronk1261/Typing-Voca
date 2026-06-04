import { computeProgressUpdate, isDue } from "../src/lib/srs.ts";
import type { Progress, QuestionResult } from "../src/types/index.ts";

const TODAY = "2026-06-04";
const TOMORROW = "2026-06-05";

function result(p: Partial<QuestionResult>): QuestionResult {
  return {
    wordId: 1,
    firstTryCorrect: false,
    heartsDepleted: false,
    attempts: 1,
    shadowStars: null,
    shadowScore: null,
    shadowSkipped: false,
    ...p,
  };
}

function progress(p: Partial<Progress>): Progress {
  return {
    user_id: "u",
    word_id: 1,
    seen_count: 1,
    first_try_correct: null,
    shadow_stars: null,
    pass_count: 0,
    in_review: false,
    last_seen: null,
    next_due: null,
    ...p,
  };
}

interface Case {
  name: string;
  run: () => boolean;
  describe: string;
}

const cases: Case[] = [
  {
    name: "enter-hearts",
    describe: "하트 소진 → in_review 진입",
    run: () => {
      const r = computeProgressUpdate(undefined, result({ heartsDepleted: true }), "u", 1, TODAY);
      return r.in_review === true && r.pass_count === 0 && r.next_due === TOMORROW;
    },
  },
  {
    name: "enter-star1",
    describe: "섀도잉 ⭐1 → in_review 진입",
    run: () => {
      const r = computeProgressUpdate(undefined, result({ firstTryCorrect: true, shadowStars: 1 }), "u", 1, TODAY);
      return r.in_review === true && r.pass_count === 0;
    },
  },
  {
    name: "pass-1st",
    describe: "1차 통과 → pass_count=1, next_due=+1일, 졸업 아님",
    run: () => {
      const existing = progress({ in_review: true, pass_count: 0 });
      const r = computeProgressUpdate(existing, result({ firstTryCorrect: true, shadowStars: 2 }), "u", 1, TODAY);
      return r.pass_count === 1 && r.in_review === true && r.next_due === TOMORROW;
    },
  },
  {
    name: "graduate-2nd",
    describe: "2차 통과 → 졸업(in_review=false)",
    run: () => {
      const existing = progress({ in_review: true, pass_count: 1 });
      const r = computeProgressUpdate(existing, result({ firstTryCorrect: true, shadowStars: 3 }), "u", 1, TODAY);
      return r.pass_count === 2 && r.in_review === false && r.next_due === null;
    },
  },
  {
    name: "reset-on-fail",
    describe: "통과 실패 → pass_count 리셋(행 유지)",
    run: () => {
      const existing = progress({ in_review: true, pass_count: 1 });
      const r = computeProgressUpdate(existing, result({ firstTryCorrect: false, heartsDepleted: true }), "u", 1, TODAY);
      return r.pass_count === 0 && r.in_review === true;
    },
  },
  {
    name: "skip-no-pass",
    describe: "타이핑 정답+섀도잉 스킵(별점 없음) → 통과 아님, pass_count 리셋, 복습 진입 안 함",
    run: () => {
      const existing = progress({ pass_count: 1 });
      const r = computeProgressUpdate(existing, result({ firstTryCorrect: true, shadowStars: null, shadowSkipped: true }), "u", 1, TODAY);
      return r.pass_count === 0 && r.in_review === false;
    },
  },
  {
    name: "isDue",
    describe: "in_review + next_due 지남 → isDue true / 미래면 false",
    run: () => {
      const due = isDue(progress({ in_review: true, next_due: "2026-06-01" }), TODAY);
      const notDue = isDue(progress({ in_review: true, next_due: "2026-06-10" }), TODAY);
      const notReview = isDue(progress({ in_review: false, next_due: "2026-06-01" }), TODAY);
      return due === true && notDue === false && notReview === false;
    },
  },
];

let pass = 0;
for (const c of cases) {
  let ok = false;
  try {
    ok = c.run();
  } catch (e) {
    ok = false;
  }
  if (ok) pass += 1;
  console.log(`${ok ? "✅" : "❌"} ${c.name.padEnd(16)} ${c.describe}`);
}

console.log(`\n${pass}/${cases.length} passed`);
if (pass !== cases.length) process.exit(1);
