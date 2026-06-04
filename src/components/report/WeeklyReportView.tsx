"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LoadingDots } from "@/components/ui/LoadingDots";
import { WeeklyReportCard } from "@/components/report/WeeklyReportCard";
import { useStatsData } from "@/hooks/useStatsData";
import { weeklyReport } from "@/lib/stats/aggregate";
import { categoryLabel } from "@/lib/words/categories";
import { wordCategoryMap } from "@/lib/stats/categoryMap";
import { useUserStore } from "@/stores/userStore";

export function WeeklyReportView() {
  const router = useRouter();
  const { loading, sessions, progressRows } = useStatsData();
  const streak = useUserStore((s) => s.streak);

  const report = useMemo(
    () => weeklyReport(sessions, progressRows, wordCategoryMap, categoryLabel),
    [sessions, progressRows],
  );

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
        <h1 className="text-lg font-bold text-ink">주간 리포트</h1>
      </header>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <LoadingDots />
        </div>
      ) : (
        <div className="pt-2">
          <WeeklyReportCard report={report} streak={streak} />
        </div>
      )}
    </main>
  );
}
