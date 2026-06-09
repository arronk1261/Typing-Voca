"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef } from "react";
import {
  clamp,
  learnGoal,
  pronGoal,
  REVIEW_CAP,
  ringFraction,
} from "@/lib/achievements/rings";
import { readDailyRing } from "@/lib/sync/dailyRing";
import { isDue, isLapsed } from "@/lib/srs";
import { todayKey } from "@/lib/streak";
import { burstConfetti } from "@/lib/confetti";
import { useUserStore } from "@/stores/userStore";

const SIZE = 136;
const CENTER = SIZE / 2;
const STROKE = 12;

interface RingSpec {
  key: string;
  label: string;
  color: string;
  radius: number;
  done: number;
  goal: number;
}

const CELEBRATED_KEY = "tv:ring:celebrated";

export function LearningRings() {
  const progress = useUserStore((s) => s.progress);
  const recentSessions = useUserStore((s) => s.recentSessions);
  const reduce = useReducedMotion();
  const celebrated = useRef(false);

  const rings = useMemo<RingSpec[]>(() => {
    const today = todayKey();
    const ring = readDailyRing(today);
    const lGoal = learnGoal(recentSessions.map((e) => e.total));
    const reviewAvailable = Object.values(progress).filter(
      (p) => isDue(p, today) || isLapsed(p),
    ).length;
    const rGoal = clamp(reviewAvailable, 0, REVIEW_CAP);
    return [
      { key: "learn", label: "학습", color: "#6366F1", radius: 56, done: ring.learnDone, goal: lGoal },
      { key: "review", label: "복습", color: "#F59E0B", radius: 43, done: ring.reviewDone, goal: rGoal },
      { key: "pron", label: "발음", color: "#FBBF24", radius: 30, done: ring.pronDone, goal: pronGoal(lGoal) },
    ];
  }, [progress, recentSessions]);

  const allClosed = rings.every((r) => ringFraction(r.done, r.goal) >= 1);

  useEffect(() => {
    if (!allClosed || celebrated.current) return;
    celebrated.current = true;
    if (typeof window === "undefined") return;
    try {
      if (window.localStorage.getItem(CELEBRATED_KEY) === todayKey()) return;
      window.localStorage.setItem(CELEBRATED_KEY, todayKey());
    } catch {
      /* ignore */
    }
    void burstConfetti();
  }, [allClosed]);

  const summary = rings
    .map((r) => `${r.label} ${r.done}/${r.goal || r.done}`)
    .join(", ");

  return (
    <div
      className="flex items-center gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-4"
      role="group"
      aria-label={`오늘의 학습 링 — ${summary}${allClosed ? ", 모두 달성" : ""}`}
    >
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden>
        {rings.map((r) => {
          const circ = 2 * Math.PI * r.radius;
          const frac = ringFraction(r.done, r.goal);
          return (
            <g key={r.key} transform={`rotate(-90 ${CENTER} ${CENTER})`}>
              <circle
                cx={CENTER}
                cy={CENTER}
                r={r.radius}
                fill="none"
                stroke={r.color}
                strokeOpacity={0.15}
                strokeWidth={STROKE}
              />
              <motion.circle
                cx={CENTER}
                cy={CENTER}
                r={r.radius}
                fill="none"
                stroke={r.color}
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={circ}
                initial={{ strokeDashoffset: reduce ? circ * (1 - frac) : circ }}
                animate={{ strokeDashoffset: circ * (1 - frac) }}
                transition={{ duration: reduce ? 0 : 0.7, ease: "easeOut" }}
              />
            </g>
          );
        })}
      </svg>

      <div className="flex flex-1 flex-col gap-2">
        <span className="text-sm font-semibold text-ink">오늘의 링</span>
        {rings.map((r) => {
          const closed = ringFraction(r.done, r.goal) >= 1;
          return (
            <div key={r.key} className="flex items-center gap-2 text-xs">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: r.color }}
                aria-hidden
              />
              <span className="w-8 text-ink-soft">{r.label}</span>
              <span className="font-medium tabular-nums text-ink">
                {Math.min(r.done, r.goal || r.done)}
                <span className="text-ink-soft"> / {r.goal || r.done}</span>
              </span>
              {closed && (
                <span className="text-success" aria-label="달성">
                  ✓
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
