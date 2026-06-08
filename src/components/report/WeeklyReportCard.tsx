"use client";

import { Flame, Mic, Star, TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { WeeklyReport } from "@/lib/stats/aggregate";
import { PHONEME_LABEL } from "@/lib/shadowing/pronunciation";

function DeltaTag({ delta, unit }: { delta: number; unit: string }) {
  if (delta === 0) {
    return <span className="text-xs text-ink-soft">전주와 같아요</span>;
  }
  const up = delta > 0;
  return (
    <span
      className={`flex items-center gap-0.5 text-xs font-medium ${up ? "text-success" : "text-ink-soft"}`}
    >
      {up ? <TrendingUp size={12} aria-hidden /> : <TrendingDown size={12} aria-hidden />}
      전주 대비 {up ? "+" : ""}
      {delta}
      {unit}
    </span>
  );
}

export function WeeklyReportCard({
  report,
  streak,
}: {
  report: WeeklyReport;
  streak: number;
}) {
  if (!report.hasData) {
    return (
      <Card className="text-center">
        <p className="text-sm leading-relaxed text-ink-soft">
          이번 주 학습 기록이 아직 없어요.
          <br />한 세트만 끝내도 리포트가 채워져요. 💪
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Card className="flex flex-col items-center gap-1 text-center">
        <p className="text-sm font-medium text-ink-soft">이번 주 학습</p>
        <p className="text-3xl font-bold text-brand">
          {report.daysStudied}
          <span className="text-lg text-ink-soft"> / 7일</span>
        </p>
        <DeltaTag delta={report.deltaDays} unit="일" />
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="학습 단어" value={`${report.totalWords}`} />
        <MiniStat
          label="평균 점수"
          value={report.avgScore !== null ? `${report.avgScore}` : "—"}
        />
        <MiniStat
          label="평균 별점"
          value={report.avgStars !== null ? `⭐${report.avgStars.toFixed(1)}` : "—"}
        />
      </div>

      <Card className="flex items-center justify-between">
        <span className="text-sm text-ink-soft">총 학습 단어</span>
        <DeltaTag delta={report.deltaWords} unit="단어" />
      </Card>

      {report.bestCategory && (
        <Card className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Star size={18} aria-hidden />
          </div>
          <div>
            <p className="text-xs text-ink-soft">이번 주 집중한 분야</p>
            <p className="text-sm font-semibold text-ink">
              {report.bestCategory.label}
            </p>
          </div>
        </Card>
      )}

      {report.topMastered && (
        <Card className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-soft text-success">
            <Flame size={18} aria-hidden />
          </div>
          <div>
            <p className="text-xs text-ink-soft">가장 잘 외운 분야</p>
            <p className="text-sm font-semibold text-ink">
              {report.topMastered.label} · {Math.round(report.topMastered.ratio * 100)}%
            </p>
          </div>
        </Card>
      )}

      {report.pronunciationFocus.length > 0 && (
        <Card className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Mic size={16} className="text-brand" aria-hidden />
            <p className="text-sm font-semibold text-ink">이번 주 발음 약점</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {report.pronunciationFocus.map((w) => (
              <span
                key={w.word}
                className="flex items-center gap-1 rounded-full bg-brand-soft px-3 py-1 font-en text-sm font-medium text-brand-strong dark:text-white"
              >
                {w.word}
                {w.count > 1 && (
                  <b className="font-sans text-[11px] text-brand">×{w.count}</b>
                )}
              </span>
            ))}
          </div>
          {report.pronunciationFeatures.length > 0 && (
            <p className="text-xs leading-relaxed text-ink-soft">
              특히{" "}
              <b className="text-ink">
                {report.pronunciationFeatures
                  .slice(0, 2)
                  .map((f) => PHONEME_LABEL[f])
                  .join(", ")}
              </b>{" "}
              발음을 또렷하게 연습해 보세요 🎤
            </p>
          )}
        </Card>
      )}

      <Card className="flex items-center justify-center gap-2 text-sm">
        <Flame size={18} className="text-accent" aria-hidden />
        <span className="text-ink">
          연속 학습 <b className="text-accent">{streak}</b>일째 — 이 페이스 좋아요!
        </span>
      </Card>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="flex flex-col items-center gap-0.5 p-4">
      <span className="text-xl font-bold text-ink">{value}</span>
      <span className="text-[11px] text-ink-soft">{label}</span>
    </Card>
  );
}
