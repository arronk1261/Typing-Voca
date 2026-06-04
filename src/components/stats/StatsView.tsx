"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BarChart3, GraduationCap, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { LoadingDots } from "@/components/ui/LoadingDots";
import { StudyCalendar } from "@/components/stats/StudyCalendar";
import { CategoryMasteryList } from "@/components/stats/CategoryMasteryList";
import { useStatsData } from "@/hooks/useStatsData";
import { totals } from "@/lib/stats/aggregate";

const TrendChart = dynamic(
  () => import("@/components/stats/TrendChart").then((m) => m.TrendChart),
  { ssr: false, loading: () => <div className="h-52" /> },
);

export function StatsView() {
  const router = useRouter();
  const { loading, sessions, progressRows } = useStatsData();
  const t = useMemo(() => totals(progressRows), [progressRows]);
  const hasData = sessions.length > 0 || progressRows.length > 0;

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
        <h1 className="text-lg font-bold text-ink">통계 히스토리</h1>
      </header>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <LoadingDots />
        </div>
      ) : !hasData ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-[var(--radius-card)] bg-brand-soft text-brand">
            <BarChart3 size={32} aria-hidden />
          </div>
          <p className="text-sm leading-relaxed text-ink-soft">
            아직 학습 기록이 없어요.
            <br />첫 세트를 끝내면 여기에 그래프가 채워져요.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard
              icon={<Sparkles size={18} aria-hidden />}
              label="학습한 단어"
              value={t.studied}
              tone="brand"
            />
            <SummaryCard
              icon={<GraduationCap size={18} aria-hidden />}
              label="졸업한 단어"
              value={t.graduated}
              tone="success"
            />
          </div>

          <Card>
            <StudyCalendar sessions={sessions} />
          </Card>

          <Card>
            <TrendChart sessions={sessions} />
          </Card>

          <Card>
            <p className="mb-3 text-sm font-semibold text-ink">카테고리별 숙련도</p>
            <CategoryMasteryList progressRows={progressRows} />
          </Card>
        </div>
      )}
    </main>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "brand" | "success";
}) {
  const color = tone === "success" ? "text-success" : "text-brand";
  return (
    <Card className="flex flex-col gap-1">
      <span className={`flex items-center gap-1.5 text-xs font-medium ${color}`}>
        {icon}
        {label}
      </span>
      <span className="text-2xl font-bold text-ink">{value}</span>
    </Card>
  );
}
