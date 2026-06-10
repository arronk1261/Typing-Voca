"use client";

import { useMemo } from "react";
import { CalendarClock, RefreshCw, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Reveal } from "@/components/landing/Reveal";
import { SectionHeading } from "@/components/landing/SectionHeading";

const REVIEW_DAYS = new Set([1, 3, 7, 14]);
const DAYS = 21;

interface Point {
  day: number;
  label: string;
  forget: number;
  review: number;
}

function buildCurve(): Point[] {
  const points: Point[] = [];
  let base = 100;
  let lastReview = 0;
  let halfLife = 1.9;

  for (let day = 0; day <= DAYS; day++) {
    const forget = Math.round(100 * Math.exp(-day / 2.6));
    let review = Math.round(base * Math.exp(-(day - lastReview) / halfLife));
    if (REVIEW_DAYS.has(day)) {
      review = 100;
      base = 100;
      lastReview = day;
      halfLife *= 2.1;
    }
    points.push({
      day,
      label: `${day}일`,
      forget,
      review: Math.min(100, review),
    });
  }
  return points;
}

export function ForgettingCurve() {
  const data = useMemo(buildCurve, []);

  return (
    <section className="bg-surface px-5 py-14">
      <SectionHeading
        eyebrow="The science"
        title="잊어버릴 때쯤, 다시 묻습니다"
        description="에빙하우스의 망각 곡선처럼 기억은 시간이 지나면 빠르게 흐려집니다. Typing-Voca는 기억이 옅어지는 타이밍에 맞춰 그 단어를 다시 꺼내 물어요."
      />

      <Reveal className="mx-auto max-w-md">
        <div className="rounded-[var(--radius-card)] border border-line bg-surface-muted p-4">
          <div className="h-56 w-full" aria-hidden>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="reviewFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="forgetFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-attention)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--color-attention)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-line)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "var(--color-ink-soft)" }}
                  interval={2}
                  tickLine={false}
                  axisLine={{ stroke: "var(--color-line)" }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: "var(--color-ink-soft)" }}
                  tickLine={false}
                  axisLine={false}
                  unit="%"
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
                    `${value}%`,
                    name === "review" ? "복습할 때" : "복습 안 할 때",
                  ]}
                />
                <Legend
                  formatter={(value) =>
                    value === "review" ? "Typing-Voca 복습" : "그냥 외우기"
                  }
                  wrapperStyle={{ fontSize: 11, color: "var(--color-ink-soft)" }}
                />
                <Area
                  type="monotone"
                  dataKey="forget"
                  name="forget"
                  stroke="var(--color-attention)"
                  strokeWidth={2}
                  fill="url(#forgetFill)"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="review"
                  name="review"
                  stroke="var(--color-brand)"
                  strokeWidth={2.5}
                  fill="url(#reviewFill)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Reveal>

      <div className="mx-auto mt-6 flex max-w-md flex-col gap-3">
        {[
          {
            icon: RefreshCw,
            title: "SM-2 간격 반복",
            body: "맞힌 단어는 1일 → 3일 → 1주처럼 간격을 늘려가며 다시 등장해요.",
          },
          {
            icon: CalendarClock,
            title: "복습 우선 출제",
            body: "복습할 때가 된 단어를 먼저 꺼내고, 매 세션은 신규 70% + 복습 30%로 구성됩니다.",
          },
          {
            icon: TrendingUp,
            title: "두 번 통과해야 졸업",
            body: "타이핑 정답 + 발음 통과를 서로 다른 날 2번 해내야 '아는 단어'로 졸업해요.",
          },
        ].map((item, i) => (
          <Reveal key={item.title} delay={i * 0.06}>
            <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4">
              <item.icon size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden />
              <div>
                <p className="text-sm font-bold text-ink">{item.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">
                  {item.body}
                </p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
