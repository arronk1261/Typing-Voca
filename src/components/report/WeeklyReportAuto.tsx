"use client";

import { useEffect, useMemo, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { WeeklyReportCard } from "@/components/report/WeeklyReportCard";
import { useStatsData } from "@/hooks/useStatsData";
import { weekStartKey, weeklyReport } from "@/lib/stats/aggregate";
import { categoryLabel } from "@/lib/words/categories";
import { wordCategoryMap } from "@/lib/stats/categoryMap";
import { useUserStore } from "@/stores/userStore";

const SEEN_KEY = "tv:report:lastSeenWeek";

function readSeenWeek(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

function markSeenWeek(week: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SEEN_KEY, week);
  } catch {
    /* disabled — ignore */
  }
}

export function WeeklyReportAuto() {
  const { loading, sessions, progressRows } = useStatsData();
  const streak = useUserStore((s) => s.streak);
  const [open, setOpen] = useState(false);

  const report = useMemo(
    () => weeklyReport(sessions, progressRows, wordCategoryMap, categoryLabel),
    [sessions, progressRows],
  );

  useEffect(() => {
    if (loading || !report.hasData) return;
    const currentWeek = weekStartKey();
    if (readSeenWeek() === currentWeek) return;
    setOpen(true);
  }, [loading, report.hasData]);

  const close = () => {
    markSeenWeek(weekStartKey());
    setOpen(false);
  };

  return (
    <BottomSheet open={open} onClose={close} title="📅 이번 주 리포트">
      <WeeklyReportCard report={report} streak={streak} />
    </BottomSheet>
  );
}
