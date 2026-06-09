import {
  ACHIEVEMENTS,
  effectiveKey,
  isActive,
  type Achievement,
  type AchievementContext,
} from "@/lib/achievements/catalog";
import type { AchievementCategory } from "@/types";

export interface EarnedAchievement {
  key: string; // 시즌 배지는 월이 붙은 실제 키(예: monthly_days_2026-06)
  baseKey: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  tier: number;
}

export interface AchievementProgress extends EarnedAchievement {
  current: number;
  target: number;
  earned: boolean;
  seasonal: boolean;
}

function meta(a: Achievement, key: string): EarnedAchievement {
  return {
    key,
    baseKey: a.key,
    title: a.title,
    description: a.description,
    icon: a.icon,
    category: a.category,
    tier: a.tier,
  };
}

// 10-2: 이번 컨텍스트에서 "새로 달성한" 배지만 반환(이미 가진 것·비활성 시즌 제외).
export function evaluate(ctx: AchievementContext): EarnedAchievement[] {
  const out: EarnedAchievement[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!isActive(a, ctx)) continue;
    const key = effectiveKey(a, ctx);
    if (ctx.earnedKeys.has(key)) continue;
    const { current, target } = a.progress(ctx);
    if (target > 0 && current >= target) out.push(meta(a, key));
  }
  return out;
}

// 10-6: 컬렉션 화면용 — 활성 배지 전체의 진행도(획득/미획득·진행바).
export function achievementProgress(
  ctx: AchievementContext,
): AchievementProgress[] {
  return ACHIEVEMENTS.filter((a) => isActive(a, ctx)).map((a) => {
    const key = effectiveKey(a, ctx);
    const { current, target } = a.progress(ctx);
    const earned = ctx.earnedKeys.has(key) || (target > 0 && current >= target);
    return {
      ...meta(a, key),
      current: Math.max(0, Math.min(current, target)),
      target,
      earned,
      seasonal: a.season !== null,
    };
  });
}
