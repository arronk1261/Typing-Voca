"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { flameTier, type FlameTier } from "@/lib/streak";

interface StreakFlameProps {
  streak: number;
}

const tierStyle: Record<FlameTier, { size: number; className: string }> = {
  spark: { size: 22, className: "text-ink-soft" },
  small: { size: 24, className: "text-accent/80" },
  medium: { size: 28, className: "text-accent" },
  large: { size: 32, className: "text-accent drop-shadow-[0_0_8px_var(--color-accent)]" },
  blaze: { size: 36, className: "text-accent drop-shadow-[0_0_12px_var(--color-accent)]" },
};

export function StreakFlame({ streak }: StreakFlameProps) {
  const tier = flameTier(streak);
  const { size, className } = tierStyle[tier];
  const active = streak > 0;

  return (
    <div className="flex items-center gap-1.5" aria-label={`연속 학습 ${streak}일`}>
      <motion.span
        className={active ? className : "text-line"}
        animate={
          active
            ? { scale: [1, 1.12, 1], rotate: [0, -3, 3, 0] }
            : { scale: 1 }
        }
        transition={
          active
            ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.2 }
        }
      >
        <Flame size={size} fill={active ? "currentColor" : "none"} aria-hidden />
      </motion.span>
      <span className="text-lg font-bold tabular-nums text-ink">{streak}</span>
    </div>
  );
}
