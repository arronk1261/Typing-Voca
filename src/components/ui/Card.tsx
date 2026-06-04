import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}
