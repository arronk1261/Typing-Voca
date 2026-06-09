"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LoadingDots } from "@/components/ui/LoadingDots";
import { useStatsData } from "@/hooks/useStatsData";
import { useUserStore } from "@/stores/userStore";
import { achievementProgress, type AchievementProgress } from "@/lib/achievements/engine";
import { buildSnapshot } from "@/lib/achievements/snapshot";
import { readStudyDays } from "@/lib/sync/studyDays";
import { todayKey } from "@/lib/streak";
import type { AchievementCategory, Progress } from "@/types";

const SECTIONS: { key: AchievementCategory; label: string }[] = [
  { key: "streak", label: "연속 학습 🔥" },
  { key: "milestone", label: "누적 성취 📚" },
  { key: "skill", label: "기량 ⭐" },
  { key: "season", label: "이달의 챌린지 📅" },
  { key: "explore", label: "탐험 🧭" },
];

export function AchievementCollection() {
  const router = useRouter();
  const { loading, progressRows } = useStatsData();
  const streak = useUserStore((s) => s.streak);
  const bestStreak = useUserStore((s) => s.bestStreak);
  const totalLearned = useUserStore((s) => s.totalLearned);
  const xp = useUserStore((s) => s.xp);
  const streakFreezes = useUserStore((s) => s.streakFreezes);
  const achievements = useUserStore((s) => s.achievements);

  const rows = useMemo<AchievementProgress[]>(() => {
    const progressAfter: Record<number, Progress> = {};
    for (const p of progressRows) progressAfter[p.word_id] = p;
    const ctx = buildSnapshot({
      today: todayKey(),
      hour: 12,
      streak,
      bestStreak: Math.max(bestStreak, streak),
      prevBestStreak: bestStreak,
      totalLearned,
      earnedKeys: new Set(achievements),
      progressAfter,
      prevProgress: {},
      results: [],
      studyDays: readStudyDays(),
    });
    return achievementProgress(ctx);
  }, [progressRows, streak, bestStreak, totalLearned, achievements]);

  const earnedCount = rows.filter((r) => r.earned).length;

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-5 pb-10">
      <header
        className="flex items-center gap-2 pb-2"
        style={{ paddingTop: "calc(1rem + var(--safe-top))" }}
      >
        <button
          type="button"
          onClick={() => router.push("/")}
          aria-label="대시보드로"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <ArrowLeft size={18} aria-hidden />
        </button>
        <h1 className="text-lg font-bold text-ink">배지 컬렉션</h1>
      </header>

      <div className="mb-4 flex items-center justify-around rounded-[var(--radius-card)] border border-line bg-surface p-3 text-center">
        <Stat label="획득 배지" value={`${earnedCount}/${rows.length}`} />
        <Stat label="경험치" value={`${xp} XP`} />
        <Stat label="동결권" value={`🧊 ${streakFreezes}`} />
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <LoadingDots />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {SECTIONS.map((section) => {
            const items = rows.filter((r) => r.category === section.key);
            if (items.length === 0) return null;
            return (
              <section key={section.key}>
                <h2 className="mb-2 text-sm font-semibold text-ink-soft">
                  {section.label}
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  {items.map((item) => (
                    <BadgeCell key={item.key} item={item} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}

function BadgeCell({ item }: { item: AchievementProgress }) {
  const pct = item.target > 0 ? Math.round((item.current / item.target) * 100) : 100;
  const remaining = Math.max(0, item.target - item.current);
  return (
    <div
      className={`flex flex-col items-center gap-1 rounded-2xl border p-3 text-center ${
        item.earned
          ? "border-brand/40 bg-brand-soft"
          : "border-line bg-surface"
      }`}
      aria-label={`${item.title} — ${
        item.earned ? "획득함" : `진행 ${item.current}/${item.target}`
      }`}
    >
      <span
        className={`text-3xl ${item.earned ? "" : "opacity-30 grayscale"}`}
        aria-hidden
      >
        {item.icon}
      </span>
      <span
        className={`text-[11px] font-semibold leading-tight ${
          item.earned ? "text-brand-strong dark:text-white" : "text-ink-soft"
        }`}
      >
        {item.title}
      </span>
      {item.earned ? (
        <span className="text-[10px] font-medium text-success">✓ 달성</span>
      ) : (
        <div className="w-full">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-brand/50"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="mt-0.5 block text-[10px] text-ink-soft">
            앞으로 {remaining}
          </span>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-base font-bold text-ink">{value}</span>
      <span className="text-xs text-ink-soft">{label}</span>
    </div>
  );
}
