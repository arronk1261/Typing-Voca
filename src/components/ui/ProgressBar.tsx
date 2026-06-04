"use client";

import { motion } from "framer-motion";

interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const ratio = total > 0 ? Math.min(1, current / total) : 0;
  return (
    <div
      className="h-2.5 w-full overflow-hidden rounded-full bg-line"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={current}
      aria-label={`${total}문제 중 ${current}문제 완료`}
    >
      <motion.div
        className="h-full rounded-full bg-brand"
        initial={false}
        animate={{ width: `${ratio * 100}%` }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
      />
    </div>
  );
}
