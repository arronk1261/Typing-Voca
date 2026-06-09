import { achievementProgress, evaluate } from "../src/lib/achievements/engine.ts";
import type {
  AchievementContext,
  SessionFacts,
} from "../src/lib/achievements/catalog.ts";
import {
  learnGoal,
  pronGoal,
  ringFraction,
  median,
} from "../src/lib/achievements/rings.ts";
import {
  daysInMonth,
  weekendBothDays,
} from "../src/lib/sync/studyDays.ts";
import { applyStreak } from "../src/lib/streak.ts";

function session(p: Partial<SessionFacts> = {}): SessionFacts {
  return {
    learnedCount: 10,
    firstTryCorrect: 0,
    avgStars: null,
    allFast: false,
    lapsedGraduated: 0,
    hour: 14,
    ...p,
  };
}

function ctx(p: Partial<AchievementContext> = {}): AchievementContext {
  return {
    today: "2026-06-09",
    season: "2026-06",
    earnedKeys: new Set<string>(),
    streak: 0,
    bestStreak: 0,
    everBrokeStreak: false,
    totalLearned: 0,
    graduatedCount: 0,
    categoriesExplored: 0,
    masteredCategories: 0,
    weekendBothDays: false,
    daysStudiedThisMonth: 0,
    session: null,
    ...p,
  };
}

const keys = (c: AchievementContext) => new Set(evaluate(c).map((e) => e.key));

interface Case {
  name: string;
  run: () => boolean;
}

const cases: Case[] = [
  {
    name: "streak_7 earned at bestStreak 7",
    run: () => keys(ctx({ bestStreak: 7 })).has("streak_7"),
  },
  {
    name: "streak_7 not earned at 6",
    run: () => !keys(ctx({ bestStreak: 6 })).has("streak_7"),
  },
  {
    name: "streak_3 earned at 7 (lower tiers included)",
    run: () => keys(ctx({ bestStreak: 7 })).has("streak_3"),
  },
  {
    name: "already-earned key excluded",
    run: () =>
      !keys(ctx({ bestStreak: 7, earnedKeys: new Set(["streak_7"]) })).has(
        "streak_7",
      ),
  },
  {
    name: "perfect_set when all first-try",
    run: () =>
      keys(
        ctx({ session: session({ learnedCount: 10, firstTryCorrect: 10 }) }),
      ).has("perfect_set"),
  },
  {
    name: "perfect_set not without session",
    run: () => !keys(ctx({})).has("perfect_set"),
  },
  {
    name: "perfect_set not with one miss",
    run: () =>
      !keys(
        ctx({ session: session({ learnedCount: 10, firstTryCorrect: 9 }) }),
      ).has("perfect_set"),
  },
  {
    name: "golden_voice at avgStars 2.8",
    run: () => keys(ctx({ session: session({ avgStars: 2.8 }) })).has("golden_voice"),
  },
  {
    name: "speedrunner when allFast",
    run: () => keys(ctx({ session: session({ allFast: true }) })).has("speedrunner"),
  },
  {
    name: "review_cleaner when a lapsed word graduates",
    run: () =>
      keys(ctx({ session: session({ lapsedGraduated: 1 }) })).has("review_cleaner"),
  },
  {
    name: "monthly_days key is month-scoped and earned at 15",
    run: () => keys(ctx({ daysStudiedThisMonth: 15 })).has("monthly_days_2026-06"),
  },
  {
    name: "monthly_days not earned at 14",
    run: () =>
      !keys(ctx({ daysStudiedThisMonth: 14 })).has("monthly_days_2026-06"),
  },
  {
    name: "learned_100 at totalLearned 100",
    run: () => keys(ctx({ totalLearned: 120 })).has("learned_100"),
  },
  {
    name: "graduated_10 at graduatedCount 10",
    run: () => keys(ctx({ graduatedCount: 10 })).has("graduated_10"),
  },
  {
    name: "category_explorer at 5 categories",
    run: () => keys(ctx({ categoriesExplored: 5 })).has("category_explorer"),
  },
  {
    name: "category_master at 1 mastered",
    run: () => keys(ctx({ masteredCategories: 1 })).has("category_master"),
  },
  {
    name: "night_owl at 23h",
    run: () => keys(ctx({ session: session({ hour: 23 }) })).has("night_owl"),
  },
  {
    name: "early_bird at 6h",
    run: () => keys(ctx({ session: session({ hour: 6 }) })).has("early_bird"),
  },
  {
    name: "phoenix when broke then rebuilt to 7",
    run: () =>
      keys(ctx({ streak: 7, bestStreak: 7, everBrokeStreak: true })).has(
        "phoenix",
      ),
  },
  {
    name: "phoenix not on first-ever 7",
    run: () =>
      !keys(ctx({ streak: 7, bestStreak: 7, everBrokeStreak: false })).has(
        "phoenix",
      ),
  },
  {
    name: "weekend_warrior when both weekend days",
    run: () => keys(ctx({ weekendBothDays: true })).has("weekend_warrior"),
  },
  {
    name: "achievementProgress clamps current and marks earned",
    run: () => {
      const row = achievementProgress(ctx({ totalLearned: 999 })).find(
        (r) => r.baseKey === "learned_100",
      );
      return !!row && row.earned && row.current === 100 && row.target === 100;
    },
  },
  {
    name: "achievementProgress shows partial progress unearned",
    run: () => {
      const row = achievementProgress(ctx({ totalLearned: 40 })).find(
        (r) => r.baseKey === "learned_100",
      );
      return !!row && !row.earned && row.current === 40;
    },
  },

  // ── 링 목표 계산 ──
  { name: "median odd", run: () => median([3, 1, 2]) === 2 },
  { name: "median even", run: () => median([1, 2, 3, 4]) === 2.5 },
  { name: "learnGoal floors at 10", run: () => learnGoal([4, 5]) === 10 },
  { name: "learnGoal personalizes above floor", run: () => learnGoal([20, 20, 20]) === 21 },
  { name: "learnGoal caps at 40", run: () => learnGoal([200]) === 40 },
  { name: "pronGoal floors at 5", run: () => pronGoal(10) === 5 },
  { name: "ringFraction goal 0 is closed", run: () => ringFraction(0, 0) === 1 },
  { name: "ringFraction caps at 1", run: () => ringFraction(15, 10) === 1 },

  // ── 학습일 원장 ──
  {
    name: "weekendBothDays true for adjacent Sat+Sun",
    run: () => weekendBothDays(["2026-06-06", "2026-06-07"]) === true,
  },
  {
    name: "weekendBothDays false for Sat only",
    run: () => weekendBothDays(["2026-06-06"]) === false,
  },
  {
    name: "daysInMonth counts only matching month",
    run: () => daysInMonth(["2026-06-01", "2026-05-31", "2026-06-09"], "2026-06") === 2,
  },

  // ── 스트릭 동결권 ──
  {
    name: "applyStreak consecutive +1",
    run: () => applyStreak("2026-06-08", 4, 0, "2026-06-09").streak === 5,
  },
  {
    name: "applyStreak same day no change",
    run: () => applyStreak("2026-06-09", 4, 0, "2026-06-09").changed === false,
  },
  {
    name: "applyStreak gap of 1 missed day saved by freeze",
    run: () => {
      const r = applyStreak("2026-06-07", 4, 1, "2026-06-09");
      return r.streak === 5 && r.freezesUsed === 1;
    },
  },
  {
    name: "applyStreak gap without freeze resets",
    run: () => applyStreak("2026-06-07", 4, 0, "2026-06-09").streak === 1,
  },
  {
    name: "applyStreak big gap resets even with freeze",
    run: () => applyStreak("2026-06-04", 4, 2, "2026-06-09").streak === 1,
  },
  {
    name: "applyStreak earns a freeze at multiple of 7",
    run: () => applyStreak("2026-06-08", 6, 0, "2026-06-09").freezesEarned === 1,
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
