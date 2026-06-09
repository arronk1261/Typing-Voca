import {
  computeProgressUpdate,
  crossLevelDueIds,
  isDue,
  isReviewTrigger,
  needsPronCheck,
} from "../src/lib/srs.ts";
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
    pron_pass_count: 0,
    in_review: false,
    last_seen: null,
    next_due: null,
    meaning_recall_score: null,
    spelling_score: null,
    pronunciation_score: null,
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
    describe: "9-3d: 첫 시도 정답+⭐1 → 타이핑 트랙은 +1, 발음 트랙은 약함으로 0(복습 유지)",
    run: () => {
      const r = computeProgressUpdate(undefined, result({ firstTryCorrect: true, shadowStars: 1 }), "u", 1, TODAY);
      return r.in_review === true && r.pass_count === 1 && r.pron_pass_count === 0;
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
    name: "pass-2nd-interval",
    describe: "2차 통과 → pass_count=2, 간격 +3일, 아직 졸업 아님(기본 3회)",
    run: () => {
      const existing = progress({ in_review: true, pass_count: 1 });
      const r = computeProgressUpdate(existing, result({ firstTryCorrect: true, shadowStars: 3 }), "u", 1, TODAY);
      return r.pass_count === 2 && r.in_review === true && r.next_due === "2026-06-07";
    },
  },
  {
    name: "graduate-3rd",
    describe: "3차 통과 → 졸업(in_review=false)",
    run: () => {
      const existing = progress({ in_review: true, pass_count: 2 });
      const r = computeProgressUpdate(existing, result({ firstTryCorrect: true, shadowStars: 3 }), "u", 1, TODAY);
      return r.pass_count === 3 && r.in_review === false && r.next_due === null;
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
    name: "skip-neutral",
    describe: "9-3d: full 모드 발음 건너뛰기 → 타이핑은 첫 시도 정답으로 진척, 발음 트랙은 중립(리셋 없음)",
    run: () => {
      const existing = progress({ in_review: true, pass_count: 1, pron_pass_count: 1 });
      const r = computeProgressUpdate(existing, result({ firstTryCorrect: true, shadowStars: null, shadowSkipped: true, shadowMode: "full" }), "u", 1, TODAY);
      return r.pass_count === 2 && r.pron_pass_count === 1 && r.in_review === true && r.next_due === "2026-06-07";
    },
  },
  {
    name: "typingonly-1st-pass",
    describe: "typingOnly + 타이핑 첫 시도 정답 → 발음 없이 1차 통과(pass_count=1, +1일)",
    run: () => {
      const r = computeProgressUpdate(undefined, result({ firstTryCorrect: true, shadowStars: null, shadowSkipped: true, shadowMode: "typingOnly" }), "u", 1, TODAY);
      return r.pass_count === 1 && r.in_review === true && r.next_due === TOMORROW;
    },
  },
  {
    name: "typingonly-graduate",
    describe: "typingOnly에서 누적 통과로 졸업 가능(pass_count 2→3, in_review=false)",
    run: () => {
      const existing = progress({ in_review: true, pass_count: 2 });
      const r = computeProgressUpdate(existing, result({ firstTryCorrect: true, shadowStars: null, shadowSkipped: true, shadowMode: "typingOnly" }), "u", 1, TODAY);
      return r.pass_count === 3 && r.in_review === false && r.next_due === null;
    },
  },
  {
    name: "typingonly-hearts-fail",
    describe: "typingOnly + 하트 소진 → 실패로 리셋·복습 진입",
    run: () => {
      const existing = progress({ pass_count: 2 });
      const r = computeProgressUpdate(existing, result({ firstTryCorrect: false, heartsDepleted: true, shadowMode: "typingOnly" }), "u", 1, TODAY);
      return r.pass_count === 0 && r.in_review === true;
    },
  },
  {
    name: "listening-pass",
    describe: "listening 자가체크 '잘했어요'(⭐2) + 첫 시도 정답 → 통과",
    run: () => {
      const existing = progress({ in_review: true, pass_count: 0 });
      const r = computeProgressUpdate(existing, result({ firstTryCorrect: true, shadowStars: 2, shadowMode: "listening" }), "u", 1, TODAY);
      return r.pass_count === 1 && r.in_review === true && r.next_due === TOMORROW;
    },
  },
  {
    name: "review-triggers-count",
    describe: "9-2a: 잘 맞힌 복습 단어는 트리거 아님, 실패만 신규 복습 진입으로 집계",
    run: () => {
      const sessionResults: QuestionResult[] = [
        result({ firstTryCorrect: true, shadowStars: 2 }), // 복습 통과 → 트리거 아님
        result({ firstTryCorrect: true, shadowStars: 3 }), // 통과 → 트리거 아님
        result({ firstTryCorrect: false, heartsDepleted: true }), // 실패 → 트리거
        result({ firstTryCorrect: true, shadowStars: 1 }), // 발음 약함 → 트리거
      ];
      const triggers = sessionResults.filter(isReviewTrigger).length;
      return triggers === 2;
    },
  },
  {
    name: "typing-graduates-without-pron",
    describe: "9-3d: 발음을 한 번도 안 해도 타이핑 첫 시도 정답 3회면 타이핑 졸업(발음 트랙은 0)",
    run: () => {
      let p = computeProgressUpdate(undefined, result({ firstTryCorrect: true, shadowSkipped: true, shadowMode: "typingOnly" }), "u", 1, TODAY);
      p = computeProgressUpdate(p, result({ firstTryCorrect: true, shadowSkipped: true, shadowMode: "typingOnly" }), "u", 1, TODAY);
      p = computeProgressUpdate(p, result({ firstTryCorrect: true, shadowSkipped: true, shadowMode: "typingOnly" }), "u", 1, TODAY);
      return p.pass_count === 3 && p.pron_pass_count === 0 && p.in_review === false && needsPronCheck(p) === true;
    },
  },
  {
    name: "pron-track-graduates",
    describe: "9-3d: 타이핑 졸업 후 발음 ⭐2+를 2회 쌓으면 발음 졸업 → needsPronCheck 해제",
    run: () => {
      const existing = progress({ in_review: false, pass_count: 3, pron_pass_count: 0 });
      const p1 = computeProgressUpdate(existing, result({ firstTryCorrect: true, shadowStars: 3 }), "u", 1, TODAY);
      const p2 = computeProgressUpdate(p1, result({ firstTryCorrect: true, shadowStars: 2 }), "u", 1, TODAY);
      return p1.pron_pass_count === 1 && needsPronCheck(p1) === true && p2.pron_pass_count === 2 && needsPronCheck(p2) === false;
    },
  },
  {
    name: "weak-pron-keeps-typing-graduated",
    describe: "9-3d: 타이핑 졸업 단어의 발음이 약해도 능동 복습으로 끌려가지 않음(저빈도 재확인만)",
    run: () => {
      const existing = progress({ in_review: false, pass_count: 3, pron_pass_count: 1 });
      const r = computeProgressUpdate(existing, result({ firstTryCorrect: true, shadowStars: 1 }), "u", 1, TODAY);
      return r.in_review === false && r.pron_pass_count === 0 && needsPronCheck(r) === true;
    },
  },
  {
    name: "cross-level-due",
    describe: "9-3a: 현재 레벨 풀 밖의 due 복습만 골라낸다(풀 안 단어·미래 due 제외)",
    run: () => {
      const prog: Record<number, Progress> = {
        10: progress({ word_id: 10, in_review: true, next_due: "2026-06-01" }), // 풀 밖·due → 대상
        11: progress({ word_id: 11, in_review: true, next_due: "2026-06-01" }), // 풀 안 → 제외
        12: progress({ word_id: 12, in_review: true, next_due: "2026-06-20" }), // 미래 due → 제외
        13: progress({ word_id: 13, in_review: false, next_due: "2026-06-01" }), // 졸업 → 제외
      };
      const poolIds = new Set<number>([11]);
      const ids = crossLevelDueIds(prog, poolIds, TODAY);
      return ids.length === 1 && ids[0] === 10;
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
  } catch {
    ok = false;
  }
  if (ok) pass += 1;
  console.log(`${ok ? "✅" : "❌"} ${c.name.padEnd(16)} ${c.describe}`);
}

console.log(`\n${pass}/${cases.length} passed`);
if (pass !== cases.length) process.exit(1);
