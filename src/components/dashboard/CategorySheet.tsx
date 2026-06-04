"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { CATEGORIES } from "@/lib/words/categories";

interface CategorySheetProps {
  open: boolean;
  initial: string[];
  onClose: () => void;
  onStart: (categories: string[]) => void;
}

export function CategorySheet({
  open,
  initial,
  onClose,
  onStart,
}: CategorySheetProps) {
  const [selected, setSelected] = useState<string[]>(initial);

  useEffect(() => {
    if (open) setSelected(initial);
  }, [open, initial]);

  const toggle = (key: string) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="카테고리 골라 학습하기">
      <p className="mb-3 text-sm text-ink-soft">
        관심 있는 주제를 골라보세요. 고르지 않으면 전체에서 출제돼요.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const on = selected.includes(cat.key);
          return (
            <motion.button
              key={cat.key}
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => toggle(cat.key)}
              aria-pressed={on}
              className={cn(
                "relative flex min-h-[48px] items-center gap-2 rounded-2xl border px-3 py-2.5 text-left text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                on
                  ? "border-brand bg-brand-soft text-brand-strong dark:text-white"
                  : "border-line bg-surface text-ink-soft",
              )}
            >
              <Icon size={18} aria-hidden />
              <span className="flex-1">{cat.label}</span>
              {on && <Check size={16} className="text-brand" aria-hidden />}
            </motion.button>
          );
        })}
      </div>

      <div className="mt-5">
        <Button onClick={() => onStart(selected)}>
          {selected.length > 0
            ? `${selected.length}개 주제로 학습 시작`
            : "전체에서 학습 시작"}
        </Button>
      </div>
    </BottomSheet>
  );
}
