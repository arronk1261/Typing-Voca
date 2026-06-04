"use client";

import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { dailyTrend } from "@/lib/stats/aggregate";
import type { StudySession } from "@/types";

export function TrendChart({ sessions }: { sessions: StudySession[] }) {
  const data = useMemo(
    () => dailyTrend(sessions, undefined, 14),
    [sessions],
  );

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-ink">학습량 · 점수 추이 (14일)</p>
      <div className="h-52 w-full" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
            <CartesianGrid stroke="var(--color-line)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--color-ink-soft)" }}
              interval={2}
              tickLine={false}
              axisLine={{ stroke: "var(--color-line)" }}
            />
            <YAxis
              yAxisId="words"
              tick={{ fontSize: 10, fill: "var(--color-ink-soft)" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <YAxis
              yAxisId="score"
              orientation="right"
              domain={[0, 100]}
              hide
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-line)",
                borderRadius: 12,
                fontSize: 12,
                color: "var(--color-ink)",
              }}
              labelStyle={{ color: "var(--color-ink-soft)" }}
              formatter={(value, name) => [
                value,
                name === "words" ? "학습 단어" : "평균 점수",
              ]}
            />
            <Bar
              yAxisId="words"
              dataKey="words"
              name="words"
              fill="var(--color-brand)"
              radius={[4, 4, 0, 0]}
              maxBarSize={18}
              isAnimationActive={false}
            />
            <Line
              yAxisId="score"
              dataKey="avgScore"
              name="avgScore"
              stroke="var(--color-star)"
              strokeWidth={2.5}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex items-center justify-center gap-4 text-[11px] text-ink-soft">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-brand" /> 학습 단어
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-star" /> 평균 점수
        </span>
      </div>
    </div>
  );
}
