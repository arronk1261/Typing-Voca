import type { AchievementCategory } from "@/types";

// 10-2: 배지 판정의 단일 소스. 순수 함수만 — words.json 등 무거운 의존 없음(node 단위 테스트 가능).
// 각 배지는 progress(ctx)로 "현재치/목표치"를 반환하고, current >= target이면 획득이다.
// (획득 판정과 컬렉션 화면의 진행바를 한 함수로 통일)

// 세션 종료 시점에만 채워지는 사실(컬렉션 화면 등 세션 밖 평가에서는 null)
export interface SessionFacts {
  learnedCount: number;
  firstTryCorrect: number;
  avgStars: number | null;
  allFast: boolean;
  lapsedGraduated: number;
  hour: number;
}

export interface AchievementContext {
  today: string;
  season: string; // "YYYY-MM"
  earnedKeys: ReadonlySet<string>;
  streak: number;
  bestStreak: number;
  everBrokeStreak: boolean;
  totalLearned: number;
  graduatedCount: number;
  categoriesExplored: number;
  masteredCategories: number;
  weekendBothDays: boolean;
  daysStudiedThisMonth: number;
  session: SessionFacts | null;
}

export interface Achievement {
  key: string;
  category: AchievementCategory;
  tier: number;
  title: string;
  description: string;
  icon: string;
  // null = 상시, "*" = 매월(키가 월별로 분기됨), "YYYY-MM" = 특정 시즌에만 획득 가능
  season: string | null;
  progress: (ctx: AchievementContext) => { current: number; target: number };
}

const flag = (ok: boolean) => ({ current: ok ? 1 : 0, target: 1 });

function streakBadge(
  days: number,
  title: string,
  icon: string,
  tier: number,
): Achievement {
  return {
    key: `streak_${days}`,
    category: "streak",
    tier,
    title,
    description: `${days}일 연속 학습 달성`,
    icon,
    season: null,
    progress: (ctx) => ({ current: ctx.bestStreak, target: days }),
  };
}

function learnedBadge(
  n: number,
  title: string,
  icon: string,
  tier: number,
): Achievement {
  return {
    key: `learned_${n}`,
    category: "milestone",
    tier,
    title,
    description: `누적 ${n}단어 학습`,
    icon,
    season: null,
    progress: (ctx) => ({ current: ctx.totalLearned, target: n }),
  };
}

function graduatedBadge(
  n: number,
  title: string,
  icon: string,
  tier: number,
): Achievement {
  return {
    key: `graduated_${n}`,
    category: "milestone",
    tier,
    title,
    description: `${n}개 단어 졸업(장기 기억 완성)`,
    icon,
    season: null,
    progress: (ctx) => ({ current: ctx.graduatedCount, target: n }),
  };
}

export const ACHIEVEMENTS: Achievement[] = [
  // ── 연속(Streak) ──
  streakBadge(3, "첫 불씨", "🔥", 1),
  streakBadge(7, "일주일 연속", "🔥", 2),
  streakBadge(14, "2주 연속", "🔥", 3),
  streakBadge(30, "한 달 연속", "🔥", 4),
  streakBadge(60, "두 달 연속", "⚡", 5),
  streakBadge(100, "100일의 약속", "💯", 6),
  streakBadge(365, "1년 개근", "👑", 7),
  {
    key: "weekend_warrior",
    category: "streak",
    tier: 2,
    title: "주말 전사",
    description: "토·일 이틀 모두 학습",
    icon: "🗓️",
    season: null,
    progress: (ctx) => flag(ctx.weekendBothDays),
  },
  {
    key: "phoenix",
    category: "streak",
    tier: 4,
    title: "불사조",
    description: "끊겼던 연속을 7일까지 다시 쌓기",
    icon: "🐦‍🔥",
    season: null,
    progress: (ctx) => flag(ctx.everBrokeStreak && ctx.streak >= 7),
  },

  // ── 마일스톤(누적) ──
  learnedBadge(50, "씨앗 50", "🌱", 1),
  learnedBadge(100, "새싹 100", "📚", 2),
  learnedBadge(250, "나무 250", "🌳", 3),
  learnedBadge(500, "숲 500", "🌲", 4),
  learnedBadge(1000, "단어 마스터 1000", "🏔️", 5),
  graduatedBadge(10, "졸업생 10", "🎓", 1),
  graduatedBadge(50, "졸업생 50", "🎓", 2),
  graduatedBadge(100, "졸업생 100", "🎓", 3),
  {
    key: "category_master",
    category: "milestone",
    tier: 4,
    title: "카테고리 마스터",
    description: "한 카테고리를 80% 이상 졸업",
    icon: "🗂️",
    season: null,
    progress: (ctx) => ({ current: ctx.masteredCategories, target: 1 }),
  },

  // ── 완벽·기량(세션) ──
  {
    key: "perfect_set",
    category: "skill",
    tier: 2,
    title: "퍼펙트 세트",
    description: "한 세트 전 문항 첫 시도 정답",
    icon: "💯",
    season: null,
    progress: (ctx) =>
      flag(
        !!ctx.session &&
          ctx.session.learnedCount > 0 &&
          ctx.session.firstTryCorrect === ctx.session.learnedCount,
      ),
  },
  {
    key: "golden_voice",
    category: "skill",
    tier: 3,
    title: "골든 보이스",
    description: "한 세션 평균 별점 ⭐⭐⭐에 근접",
    icon: "⭐",
    season: null,
    progress: (ctx) =>
      flag(!!ctx.session && (ctx.session.avgStars ?? 0) >= 2.8),
  },
  {
    key: "speedrunner",
    category: "skill",
    tier: 2,
    title: "스피드러너",
    description: "한 세트 전 문항을 빠르게 정답",
    icon: "⚡",
    season: null,
    progress: (ctx) =>
      flag(!!ctx.session && ctx.session.learnedCount > 0 && ctx.session.allFast),
  },
  {
    key: "review_cleaner",
    category: "skill",
    tier: 2,
    title: "오답 정복",
    description: "오답 노트의 단어를 졸업시키기",
    icon: "🧹",
    season: null,
    progress: (ctx) => flag(!!ctx.session && ctx.session.lapsedGraduated >= 1),
  },

  // ── 시즌(이달의 챌린지) ──
  {
    key: "monthly_days",
    category: "season",
    tier: 3,
    title: "이달의 챌린지",
    description: "이번 달 15일 학습",
    icon: "📅",
    season: "*",
    progress: (ctx) => ({ current: ctx.daysStudiedThisMonth, target: 15 }),
  },

  // ── 탐험 ──
  {
    key: "category_explorer",
    category: "explore",
    tier: 2,
    title: "탐험가",
    description: "5개 카테고리 경험",
    icon: "🧭",
    season: null,
    progress: (ctx) => ({ current: ctx.categoriesExplored, target: 5 }),
  },
  {
    key: "night_owl",
    category: "explore",
    tier: 1,
    title: "올빼미",
    description: "한밤중(22시~새벽4시) 학습",
    icon: "🌙",
    season: null,
    progress: (ctx) =>
      flag(!!ctx.session && (ctx.session.hour >= 22 || ctx.session.hour < 4)),
  },
  {
    key: "early_bird",
    category: "explore",
    tier: 1,
    title: "아침형 학습자",
    description: "이른 아침(5시~9시) 학습",
    icon: "🌅",
    season: null,
    progress: (ctx) =>
      flag(!!ctx.session && ctx.session.hour >= 5 && ctx.session.hour < 9),
  },
];

// 시즌(매월) 배지는 키를 월별로 분기해 매달 새로 도전하게 한다.
export function effectiveKey(a: Achievement, ctx: AchievementContext): string {
  return a.season === "*" ? `${a.key}_${ctx.season}` : a.key;
}

export function isActive(a: Achievement, ctx: AchievementContext): boolean {
  if (a.season === null || a.season === "*") return true;
  return a.season === ctx.season;
}
