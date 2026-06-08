import {
  scoreLevelTest,
  type LevelTestSignal,
} from "../src/lib/words/levelScore.ts";
import {
  applyCalibration,
  CALIBRATION_TARGET,
  type CalibrationState,
} from "../src/lib/words/calibration.ts";
import { canonicalAnswer, isAnswerCorrect } from "../src/lib/typing/answerCheck.ts";
import { stagedHint } from "../src/lib/typing/hints.ts";
import type { WordLevel } from "../src/types/index.ts";

function signal(p: Partial<LevelTestSignal>): LevelTestSignal {
  return {
    questionLevel: 1,
    correct: true,
    hintsUsed: 0,
    retries: 0,
    responseMs: 3000,
    multiWord: false,
    ...p,
  };
}

const anchorPattern: LevelTestSignal[] = [
  ...Array.from({ length: 4 }, () => signal({ questionLevel: 1 as WordLevel })),
  ...Array.from({ length: 4 }, () => signal({ questionLevel: 2 as WordLevel })),
  ...Array.from({ length: 4 }, () => signal({ questionLevel: 3 as WordLevel })),
];

function calib(p: Partial<CalibrationState>): CalibrationState {
  return {
    level: 2,
    levelProvisional: true,
    calibrationQuestions: 0,
    calibrationCorrect: 0,
    ...p,
  };
}

interface Case {
  name: string;
  run: () => boolean;
}

const cases: Case[] = [
  // ---- 7-2 다요소 채점 ----
  {
    name: "7-2 all-correct-clean → Lv.3",
    run: () => scoreLevelTest(anchorPattern).level === 3,
  },
  {
    name: "7-2 all-wrong → Lv.1",
    run: () =>
      scoreLevelTest(anchorPattern.map((s) => ({ ...s, correct: false })))
        .level === 1,
  },
  {
    name: "7-2 same correct count, heavy hints → lower score",
    run: () => {
      const clean = scoreLevelTest(anchorPattern);
      const hinted = scoreLevelTest(
        anchorPattern.map((s) => ({ ...s, hintsUsed: 1, retries: 1 })),
      );
      return hinted.score < clean.score && hinted.level < clean.level;
    },
  },
  {
    name: "7-2 slow responses reduce score",
    run: () => {
      const fast = scoreLevelTest(anchorPattern);
      const slow = scoreLevelTest(
        anchorPattern.map((s) => ({ ...s, responseMs: 25000 })),
      );
      return slow.score < fast.score;
    },
  },
  {
    name: "7-2 multiword clean answer earns bonus",
    run: () => {
      const plain = scoreLevelTest([signal({ questionLevel: 3 })]);
      const multi = scoreLevelTest([
        signal({ questionLevel: 3, multiWord: true }),
      ]);
      return multi.score >= plain.score;
    },
  },

  // ---- 7-3 임시 레벨 자동 보정 ----
  {
    name: "7-3 below target stays provisional",
    run: () => {
      const r = applyCalibration(calib({}), { questions: 10, correct: 9 });
      return (
        r.levelProvisional === true &&
        r.calibrationQuestions === 10 &&
        r.calibrationCorrect === 9
      );
    },
  },
  {
    name: "7-3 reaching 30 confirms (high rate → up)",
    run: () => {
      const r = applyCalibration(
        calib({ calibrationQuestions: 20, calibrationCorrect: 18 }),
        { questions: 10, correct: 9 },
      );
      return r.levelProvisional === false && r.level === 3;
    },
  },
  {
    name: "7-3 reaching 30 with low rate → down",
    run: () => {
      const r = applyCalibration(
        calib({ level: 2, calibrationQuestions: 20, calibrationCorrect: 4 }),
        { questions: 10, correct: 2 },
      );
      return r.levelProvisional === false && r.level === 1;
    },
  },
  {
    name: "7-3 reaching 30 with mid rate → keep level",
    run: () => {
      const r = applyCalibration(
        calib({ level: 2, calibrationQuestions: 25, calibrationCorrect: 15 }),
        { questions: 5, correct: 3 },
      );
      return r.levelProvisional === false && r.level === 2;
    },
  },
  {
    name: "7-3 already confirmed is untouched",
    run: () => {
      const r = applyCalibration(
        calib({ levelProvisional: false, calibrationQuestions: 30 }),
        { questions: 10, correct: 10 },
      );
      return r.levelProvisional === false && r.calibrationQuestions === 30;
    },
  },
  {
    name: "7-3 CALIBRATION_TARGET is 30",
    run: () => CALIBRATION_TARGET === 30,
  },

  // ---- 7-4 정답 허용범위 확대 ----
  {
    name: "7-4 contraction: I will == I'll",
    run: () => isAnswerCorrect("I will", "I'll") && isAnswerCorrect("I'll", "I will"),
  },
  {
    name: "7-4 don't == do not",
    run: () => isAnswerCorrect("don't", "do not") && isAnswerCorrect("do not", "don't"),
  },
  {
    name: "7-4 hyphen/space: well known == well-known",
    run: () => isAnswerCorrect("well known", "well-known"),
  },
  {
    name: "7-4 case + curly apostrophe insensitive",
    run: () => isAnswerCorrect("LET'S", "let’s"),
  },
  {
    name: "7-4 article a == an",
    run: () => isAnswerCorrect("a apple", "an apple"),
  },
  {
    name: "7-4 accepted_answers variant passes",
    run: () => isAnswerCorrect("reserve", "book", ["reserve", "make a reservation"]),
  },
  {
    name: "7-4 core mismatch still blocked",
    run: () =>
      !isAnswerCorrect("expensive", "overpriced") &&
      !isAnswerCorrect("", "menu") &&
      !isAnswerCorrect("recommended", "recommend"),
  },
  {
    name: "7-4 canonical form is stable",
    run: () => canonicalAnswer("  Can't  ") === "can not",
  },

  // ---- 7-5 멀티워드 단계 힌트 ----
  {
    name: "7-5 stage1 → first letter",
    run: () => stagedHint("make small talk", 1).text === "M",
  },
  {
    name: "7-5 stage2 multiword → word count + initials",
    run: () => {
      const h = stagedHint("make small talk", 2);
      return h.label === "단어 수" && h.text.includes("3개 단어") && h.text.includes("M S T");
    },
  },
  {
    name: "7-5 stage2 single word → char count",
    run: () => stagedHint("scalable", 2).label === "글자 수",
  },
  {
    name: "7-5 stage3 multiword → chunk reveal",
    run: () => {
      const h = stagedHint("make small talk", 3);
      return h.label === "청크" && h.text.startsWith("make ") && h.text.includes("_");
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
