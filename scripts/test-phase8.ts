import {
  computeProgressUpdate,
  graduationTarget,
  isGraduated,
  meaningRecallScore,
  spellingScore,
  pronunciationScore,
  REVIEW_INTERVALS,
} from "../src/lib/srs.ts";
import {
  adaptiveReviewRatio,
  pickMaintenanceWords,
  suggestLevelFromHistory,
  type RollingWindow,
} from "../src/lib/words/adaptive.ts";
import { isStreakBroken } from "../src/lib/streak.ts";
import type { Progress, QuestionResult, Word, WordLevel } from "../src/types/index.ts";

const TODAY = "2026-06-04";

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
    meaning_recall_score: null,
    spelling_score: null,
    pronunciation_score: null,
    ...p,
  };
}

function word(p: Partial<Word>): Word {
  return {
    id: 1,
    category: "greeting",
    level: 1,
    cefr: "A1-A2",
    answer: "hello",
    sentence_en: "___ there",
    sentence_ko: "안녕",
    meaning: "안녕",
    tts_text: "hello there",
    ...p,
  };
}

function win(p: Partial<RollingWindow>): RollingWindow {
  return {
    sessions: 4,
    questions: 40,
    firstTryCorrect: 36,
    reviewEntries: 4,
    starsSum: 96,
    starsCount: 40,
    graduatedCount: 35,
    ...p,
  };
}

interface Case {
  name: string;
  run: () => boolean;
}

const cases: Case[] = [
  // ---- 8-1 SRS 간격 장기화 ----
  {
    name: "8-1 intervals are 1→3→7→14",
    run: () => REVIEW_INTERVALS.join(",") === "1,3,7,14",
  },
  {
    name: "8-1 default graduates at 3 passes",
    run: () => graduationTarget(1, "single_word") === 3 && graduationTarget(2, "idiom") === 3,
  },
  {
    name: "8-1 Lv.3 idiom graduates at 4 passes",
    run: () => graduationTarget(3, "idiom") === 4,
  },
  {
    name: "8-1 pass1 → +1d, pass2 → +3d",
    run: () => {
      const p1 = computeProgressUpdate(progress({ in_review: true, pass_count: 0 }), result({ firstTryCorrect: true, shadowStars: 3, wordLevel: 1 }), "u", 1, TODAY);
      const p2 = computeProgressUpdate(progress({ in_review: true, pass_count: 1 }), result({ firstTryCorrect: true, shadowStars: 3, wordLevel: 1 }), "u", 1, TODAY);
      return p1.next_due === "2026-06-05" && p2.next_due === "2026-06-07" && p2.in_review === true;
    },
  },
  {
    name: "8-1 default 3rd pass graduates",
    run: () => {
      const r = computeProgressUpdate(progress({ in_review: true, pass_count: 2 }), result({ firstTryCorrect: true, shadowStars: 3, wordLevel: 2 }), "u", 1, TODAY);
      return r.pass_count === 3 && r.in_review === false && r.next_due === null;
    },
  },
  {
    name: "8-1 Lv.3 idiom 3rd pass NOT graduate (needs 4)",
    run: () => {
      const r = computeProgressUpdate(progress({ in_review: true, pass_count: 2 }), result({ firstTryCorrect: true, shadowStars: 3, wordLevel: 3, wordChunkType: "idiom" }), "u", 1, TODAY);
      return r.pass_count === 3 && r.in_review === true && r.next_due === "2026-06-11";
    },
  },

  // ---- 8-2 3요소 분리 기록 ----
  {
    name: "8-2 first-try clean → meaning100/spelling100",
    run: () => {
      const r = result({ firstTryCorrect: true, attempts: 1, shadowScore: 90 });
      return meaningRecallScore(r) === 100 && spellingScore(r) === 100 && pronunciationScore(r) === 90;
    },
  },
  {
    name: "8-2 correct after retries → spelling penalized, meaning kept",
    run: () => {
      const r = result({ firstTryCorrect: false, attempts: 2 });
      return meaningRecallScore(r) === 100 && spellingScore(r) === 65;
    },
  },
  {
    name: "8-2 hearts depleted → meaning0/spelling0",
    run: () => {
      const r = result({ heartsDepleted: true, attempts: 3 });
      return meaningRecallScore(r) === 0 && spellingScore(r) === 0;
    },
  },
  {
    name: "8-2 scores persisted on progress row",
    run: () => {
      const r = computeProgressUpdate(undefined, result({ firstTryCorrect: true, attempts: 1, shadowStars: 3, shadowScore: 88 }), "u", 1, TODAY);
      return r.meaning_recall_score === 100 && r.spelling_score === 100 && r.pronunciation_score === 88;
    },
  },
  {
    name: "8-2 skipped shadow keeps prior pronunciation score",
    run: () => {
      const r = computeProgressUpdate(progress({ pronunciation_score: 70 }), result({ firstTryCorrect: true, shadowScore: null, shadowSkipped: true }), "u", 1, TODAY);
      return r.pronunciation_score === 70;
    },
  },

  // ---- 8-3 적응형 출제 비율 ----
  {
    name: "8-3 streak-broken returner → 0.7",
    run: () => adaptiveReviewRatio({ level: 2, seenCount: 100, inReviewCount: 0, streakBroken: true }) === 0.7,
  },
  {
    name: "8-3 heavy review backlog → 0.6",
    run: () => adaptiveReviewRatio({ level: 2, seenCount: 100, inReviewCount: 8, streakBroken: false }) === 0.6,
  },
  {
    name: "8-3 early Lv.1 → 0.5",
    run: () => adaptiveReviewRatio({ level: 1, seenCount: 10, inReviewCount: 0, streakBroken: false }) === 0.5,
  },
  {
    name: "8-3 stable → 0.3",
    run: () => adaptiveReviewRatio({ level: 2, seenCount: 100, inReviewCount: 1, streakBroken: false }) === 0.3,
  },
  {
    name: "8-3 streakBroken takes priority over backlog",
    run: () => adaptiveReviewRatio({ level: 1, seenCount: 5, inReviewCount: 10, streakBroken: true }) === 0.7,
  },

  // ---- 8-5 누적 기반 승급 ----
  {
    name: "8-5 too few questions → null",
    run: () => suggestLevelFromHistory(win({ questions: 20 }), 1) === null,
  },
  {
    name: "8-5 strong rolling window → up",
    run: () => suggestLevelFromHistory(win({}), 1) === "up",
  },
  {
    name: "8-5 strong but already Lv.3 → null",
    run: () => suggestLevelFromHistory(win({}), 3) === null,
  },
  {
    name: "8-5 single weak session can't drag up-eligible window",
    run: () => suggestLevelFromHistory(win({ questions: 50, firstTryCorrect: 40, reviewEntries: 9 }), 1) === null,
  },
  {
    name: "8-5 sustained struggle → down",
    run: () => suggestLevelFromHistory(win({ questions: 40, firstTryCorrect: 16, reviewEntries: 18, starsSum: 60, starsCount: 40 }), 2) === "down",
  },

  // ---- 8-6 졸업 후 유지 점검 ----
  {
    name: "8-6 isGraduated true only when passed & not in review",
    run: () => isGraduated(progress({ in_review: false, pass_count: 3 })) === true && isGraduated(progress({ in_review: true, pass_count: 3 })) === false && isGraduated(progress({ in_review: false, pass_count: 1 })) === false,
  },
  {
    name: "8-6 maintenance picks graduated word last seen >30d ago",
    run: () => {
      const pool = [word({ id: 1 }), word({ id: 2 }), word({ id: 3 })];
      const prog: Record<number, Progress> = {
        1: progress({ word_id: 1, in_review: false, pass_count: 3, last_seen: "2026-04-01" }),
        2: progress({ word_id: 2, in_review: false, pass_count: 3, last_seen: TODAY }),
        3: progress({ word_id: 3, in_review: true, pass_count: 1, last_seen: "2026-04-01" }),
      };
      const picked = pickMaintenanceWords(pool, prog, TODAY, 1);
      return picked.length === 1 && picked[0].id === 1;
    },
  },
  {
    name: "8-6 no stale graduates → empty",
    run: () => {
      const pool = [word({ id: 2 })];
      const prog: Record<number, Progress> = {
        2: progress({ word_id: 2, in_review: false, pass_count: 3, last_seen: TODAY }),
      };
      return pickMaintenanceWords(pool, prog, TODAY, 1).length === 0;
    },
  },

  // ---- 8-3/8-4 보조: streak broken 판정 ----
  {
    name: "streak broken: 2+일 공백이면 true, 어제면 false",
    run: () => isStreakBroken("2026-06-01", TODAY) === true && isStreakBroken("2026-06-03", TODAY) === false && isStreakBroken(null, TODAY) === false,
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
  console.log(`${ok ? "✅" : "❌"} ${c.name}`);
}

console.log(`\n${pass}/${cases.length} passed`);
if (pass !== cases.length) process.exit(1);
