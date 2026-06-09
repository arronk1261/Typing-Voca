"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { burstConfetti } from "@/lib/confetti";
import { useHaptics } from "@/hooks/useHaptics";
import type { EarnedAchievement } from "@/lib/achievements/engine";

interface Props {
  items: EarnedAchievement[];
  onDone: () => void;
}

// 10-5: 배지 획득 모먼트 — 톡 등장 + confetti + 햅틱. 여러 개면 하나씩, "확인" 한 번에 학습 복귀.
export function AchievementSheet({ items, onDone }: Props) {
  const [index, setIndex] = useState(0);
  const haptics = useHaptics();
  const lastCelebrated = useRef(-1);
  const current = items[index];
  const open = index < items.length;

  useEffect(() => {
    if (!open || lastCelebrated.current === index) return;
    lastCelebrated.current = index;
    void burstConfetti();
    haptics([12, 40, 12]);
  }, [open, index, haptics]);

  const next = () => {
    if (index + 1 < items.length) setIndex(index + 1);
    else onDone();
  };

  if (!current) return null;

  return (
    <BottomSheet open={open} onClose={onDone} title="새 배지 획득! 🎉">
      <div className="flex flex-col items-center gap-3 pb-2 text-center" aria-live="polite">
        <motion.div
          key={current.key}
          initial={{ scale: 0.3, rotate: -25, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 13 }}
          className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-soft text-5xl"
        >
          <span aria-hidden>{current.icon}</span>
        </motion.div>
        <p className="text-xl font-bold text-ink">{current.title}</p>
        <p className="text-sm text-ink-soft">{current.description}</p>
        {items.length > 1 && (
          <p className="text-xs font-medium text-brand">
            {index + 1} / {items.length}
          </p>
        )}
        <Button className="mt-2" onClick={next}>
          {index + 1 < items.length ? "다음 배지" : "확인"}
        </Button>
      </div>
    </BottomSheet>
  );
}
