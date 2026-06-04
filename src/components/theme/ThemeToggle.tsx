"use client";

import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";

export function ThemeToggle() {
  const { resolved, toggle } = useTheme();
  const isDark = resolved === "dark";
  return (
    <motion.button
      type="button"
      onClick={toggle}
      whileTap={{ scale: 0.92 }}
      aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      {isDark ? <Sun size={20} aria-hidden /> : <Moon size={20} aria-hidden />}
    </motion.button>
  );
}
