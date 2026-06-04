"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Heart } from "lucide-react";
import { MAX_HEARTS } from "@/stores/sessionStore";
import { cn } from "@/lib/cn";

interface HeartsProps {
  hearts: number;
}

export function Hearts({ hearts }: HeartsProps) {
  return (
    <div
      className="flex items-center gap-1"
      role="status"
      aria-label={`남은 기회 ${hearts}개`}
    >
      {Array.from({ length: MAX_HEARTS }).map((_, i) => {
        const filled = i < hearts;
        return (
          <AnimatePresence key={i} mode="popLayout">
            <motion.span
              key={filled ? "on" : "off"}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <Heart
                size={20}
                className={cn(
                  filled ? "text-attention" : "text-line",
                )}
                fill={filled ? "currentColor" : "none"}
                aria-hidden
              />
            </motion.span>
          </AnimatePresence>
        );
      })}
    </div>
  );
}
