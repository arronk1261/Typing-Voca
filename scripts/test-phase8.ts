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
  curriculumLayer,
  limitLowFrequency,
  orderByCategoryFlow,
  orderByCurriculum,
  pickMaintenanceWords,
  suggestLevelFromHistory,
  type RollingWindow,
} from "../src/lib/words/adaptive.ts";
import { scoreLevelTest } from "../src/lib/words/levelScore.ts";
import {
  focusWords,
  pronunciationDifficulty,
  pronunciationFeatures,
  rankWeakWords,
  topPhonemeFeatures,
} from "../src/lib/shadowing/pronunciation.ts";
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

  // ---- 9-B1 저빈도 출제 상한 ----
  {
    name: "9-B1 limitLowFrequency caps low-frequency words",
    run: () => {
      const list = [
        word({ id: 1, frequency: "low" }),
        word({ id: 2, frequency: "high" }),
        word({ id: 3, frequency: "low" }),
        word({ id: 4, frequency: "low" }),
        word({ id: 5, frequency: "mid" }),
      ];
      const capped = limitLowFrequency(list, 1);
      const lows = capped.filter((w) => w.frequency === "low").length;
      return lows === 1 && capped.length === 3 && capped.some((w) => w.id === 2);
    },
  },
  {
    name: "9-B1 cap 0 removes all low-frequency",
    run: () => {
      const list = [word({ id: 1, frequency: "low" }), word({ id: 2, frequency: "high" })];
      return limitLowFrequency(list, 0).every((w) => w.frequency !== "low");
    },
  },

  // ---- 9-B4 카테고리 내부 use_case 흐름 정렬 ----
  {
    name: "9-B4 orderByCategoryFlow sorts by category then use_case flow",
    run: () => {
      const list = [
        word({ id: 1, category: "travel", use_case: ["directions"] }),
        word({ id: 2, category: "travel", use_case: ["airport"] }),
        word({ id: 3, category: "greeting", use_case: ["greeting"] }),
      ];
      const ordered = orderByCategoryFlow(list);
      // greeting 카테고리가 먼저, travel 내부에서는 airport(흐름 앞) → directions
      return ordered[0].id === 3 && ordered[1].id === 2 && ordered[2].id === 1;
    },
  },

  // ---- 9-B3 레벨테스트 다축 점수·피드백 ----
  {
    name: "9-B3 chunk scores computed per chunk type",
    run: () => {
      const o = scoreLevelTest([
        { questionLevel: 1, correct: true, hintsUsed: 0, retries: 0, responseMs: 3000, multiWord: false, chunkType: "single_word" },
        { questionLevel: 2, correct: false, hintsUsed: 0, retries: 0, responseMs: 3000, multiWord: true, chunkType: "idiom" },
      ]);
      return (o.chunkScores.single_word ?? 0) === 1 && (o.chunkScores.idiom ?? -1) === 0;
    },
  },
  {
    name: "9-B3 strong words + weak chunks → 덩어리 연습 피드백",
    run: () => {
      const o = scoreLevelTest([
        { questionLevel: 1, correct: true, hintsUsed: 0, retries: 0, responseMs: 3000, multiWord: false, chunkType: "single_word" },
        { questionLevel: 2, correct: false, hintsUsed: 0, retries: 0, responseMs: 3000, multiWord: true, chunkType: "collocation" },
        { questionLevel: 3, correct: false, hintsUsed: 0, retries: 0, responseMs: 3000, multiWord: true, chunkType: "idiom" },
      ]);
      return o.feedback.includes("덩어리 표현") && o.levelRatios[1] === 1 && o.levelRatios[3] === 0;
    },
  },

  // ---- 9-C2 커리큘럼 레이어 ----
  {
    name: "9-C2 curriculumLayer derives survival/advanced/work",
    run: () => {
      const survival = curriculumLayer(word({ level: 1, frequency: "high", use_case: ["airport"] }));
      const advanced = curriculumLayer(word({ level: 3, chunk_type: "idiom" }));
      const work = curriculumLayer(word({ level: 2, frequency: "high", category: "work", use_case: ["meeting"] }));
      const daily = curriculumLayer(word({ level: 2, frequency: "high", category: "daily", use_case: ["morning_routine"] }));
      return survival === "survival" && advanced === "advanced" && work === "work" && daily === "daily";
    },
  },
  {
    name: "9-C2 orderByCurriculum puts survival before advanced",
    run: () => {
      const list = [
        word({ id: 1, level: 3, chunk_type: "idiom" }),
        word({ id: 2, level: 1, frequency: "high", use_case: ["greeting"] }),
      ];
      const ordered = orderByCurriculum(list);
      return ordered[0].id === 2 && ordered[1].id === 1;
    },
  },

  // ---- 9-C3 발음 난이도·포커스 ----
  {
    name: "9-C3 pronunciationDifficulty flags th/r-l/clusters",
    run: () => {
      return (
        pronunciationDifficulty("the") >= 1 &&
        pronunciationDifficulty("really") >= 1 &&
        pronunciationDifficulty("cat") === 0
      );
    },
  },
  {
    name: "9-C3 focusWords dedupes and ranks by difficulty",
    run: () => {
      const focus = focusWords(["cat", "Cat", "thrill", "really"], 2);
      return focus.length === 2 && focus[0] === "thrill" && !focus.includes("Cat");
    },
  },

  // ---- 9-1b 발음 음소 feature ----
  {
    name: "9-1b pronunciationFeatures detects th/r_l/v_f/cluster",
    run: () => {
      const th = pronunciationFeatures("think").includes("th");
      const rl = pronunciationFeatures("really").includes("r_l");
      const vf = pronunciationFeatures("five").includes("v_f");
      const cluster = pronunciationFeatures("street").includes("cluster");
      const none = pronunciationFeatures("cat").length === 0;
      return th && rl && vf && cluster && none;
    },
  },

  // ---- 9-1a 약점 단어 랭킹·feature 집계 ----
  {
    name: "9-1a rankWeakWords sorts by frequency then difficulty",
    run: () => {
      const ranked = rankWeakWords(["the", "the", "the", "world", "cat"], 5);
      return ranked[0].word === "the" && ranked[0].count === 3 && ranked.length === 3;
    },
  },
  {
    name: "9-1a topPhonemeFeatures ranks dominant phoneme",
    run: () => {
      const feats = topPhonemeFeatures(["think", "the", "three", "five"]);
      return feats[0] === "th";
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
  console.log(`${ok ? "✅" : "❌"} ${c.name}`);
}

console.log(`\n${pass}/${cases.length} passed`);
if (pass !== cases.length) process.exit(1);
