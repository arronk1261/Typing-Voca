import {
  categoryMastery,
  dailyTrend,
  lastNDateKeys,
  studyCalendar,
  totals,
  weeklyReport,
} from "../src/lib/stats/aggregate.ts";
import type { Progress, StudySession } from "../src/types/index.ts";

const TODAY = "2026-06-04";

function session(p: Partial<StudySession>): StudySession {
  return {
    user_id: "u",
    study_date: TODAY,
    level: 1,
    categories: [],
    words_count: 10,
    correct_first_try: 7,
    avg_stars: 2,
    avg_score: 80,
    review_count: 2,
    ...p,
  };
}

function progress(p: Partial<Progress>): Progress {
  return {
    user_id: "u",
    word_id: 1,
    seen_count: 1,
    first_try_correct: true,
    shadow_stars: 2,
    pass_count: 0,
    in_review: false,
    last_seen: TODAY,
    next_due: null,
    ...p,
  };
}

const label = (k: string) => `LBL:${k}`;

interface Case {
  name: string;
  run: () => boolean;
}

const cases: Case[] = [
  {
    name: "lastNDateKeys",
    run: () => {
      const keys = lastNDateKeys(TODAY, 7);
      return (
        keys.length === 7 &&
        keys[6] === "2026-06-04" &&
        keys[0] === "2026-05-29"
      );
    },
  },
  {
    name: "studyCalendar-marks-studied",
    run: () => {
      const cal = studyCalendar(
        [session({ study_date: "2026-06-04", words_count: 10 })],
        TODAY,
        7,
      );
      const todayCell = cal.find((c) => c.date === "2026-06-04");
      const otherCell = cal.find((c) => c.date === "2026-06-01");
      return (
        todayCell?.studied === true &&
        todayCell?.words === 10 &&
        otherCell?.studied === false
      );
    },
  },
  {
    name: "dailyTrend-weighted-avg",
    run: () => {
      const trend = dailyTrend(
        [
          session({ study_date: TODAY, words_count: 10, avg_score: 90 }),
          session({ study_date: TODAY, words_count: 30, avg_score: 70 }),
        ],
        TODAY,
        3,
      );
      const todayPoint = trend.find((t) => t.date === TODAY);
      return (
        todayPoint?.words === 40 &&
        todayPoint?.avgScore === 75 &&
        todayPoint?.label === "6/4"
      );
    },
  },
  {
    name: "totals-graduated-inreview",
    run: () => {
      const rows = [
        progress({ word_id: 1, pass_count: 2, in_review: false }),
        progress({ word_id: 2, pass_count: 1, in_review: true }),
        progress({ word_id: 3, pass_count: 0, in_review: false }),
      ];
      const t = totals(rows);
      return t.studied === 3 && t.graduated === 1 && t.inReview === 1;
    },
  },
  {
    name: "categoryMastery-ratio",
    run: () => {
      const rows = [
        progress({ word_id: 1, pass_count: 2, in_review: false }),
        progress({ word_id: 2, pass_count: 0, in_review: true }),
        progress({ word_id: 3, pass_count: 2, in_review: false }),
      ];
      const cat = new Map<number, string>([
        [1, "greeting"],
        [2, "greeting"],
        [3, "travel"],
      ]);
      const m = categoryMastery(rows, cat, label);
      const greeting = m.find((c) => c.key === "greeting");
      const travel = m.find((c) => c.key === "travel");
      return (
        greeting?.studied === 2 &&
        greeting?.graduated === 1 &&
        Math.abs((greeting?.ratio ?? 0) - 0.5) < 1e-9 &&
        travel?.ratio === 1 &&
        greeting?.label === "LBL:greeting"
      );
    },
  },
  {
    name: "weeklyReport-totals-and-delta",
    run: () => {
      const sessions = [
        session({ study_date: "2026-06-02", words_count: 10, avg_score: 80 }),
        session({ study_date: "2026-06-04", words_count: 10, avg_score: 90 }),
        session({ study_date: "2026-05-28", words_count: 10, avg_score: 60 }),
      ];
      const rows = [
        progress({ word_id: 1, last_seen: "2026-06-04", pass_count: 2, in_review: false }),
        progress({ word_id: 2, last_seen: "2026-06-04", pass_count: 2, in_review: false }),
        progress({ word_id: 3, last_seen: "2026-06-02", pass_count: 0, in_review: true }),
      ];
      const cat = new Map<number, string>([
        [1, "travel"],
        [2, "travel"],
        [3, "greeting"],
      ]);
      const r = weeklyReport(sessions, rows, cat, label, TODAY);
      return (
        r.daysStudied === 2 &&
        r.totalWords === 20 &&
        r.avgScore === 85 &&
        r.deltaWords === 10 &&
        r.prevTotalWords === 10 &&
        r.bestCategory?.key === "travel" &&
        r.bestCategory?.words === 2 &&
        r.topMastered?.key === "travel" &&
        r.hasData === true
      );
    },
  },
  {
    name: "weeklyReport-empty",
    run: () => {
      const r = weeklyReport([], [], new Map(), label, TODAY);
      return r.hasData === false && r.totalWords === 0 && r.bestCategory === null;
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
