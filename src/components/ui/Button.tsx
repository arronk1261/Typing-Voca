"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: ButtonVariant;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-white shadow-lg shadow-brand/25 active:bg-brand-strong",
  secondary:
    "bg-brand-soft text-brand-strong dark:text-white active:brightness-95",
  ghost: "bg-transparent text-ink-soft active:bg-line/40",
};

export function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled = false,
  className,
  ...rest
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.96 }}
      aria-label={rest["aria-label"]}
      className={cn(
        "flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl px-5 text-base font-semibold",
        "transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-muted",
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </motion.button>
  );
}
