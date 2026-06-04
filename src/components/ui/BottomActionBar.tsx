import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface BottomActionBarProps {
  children: ReactNode;
  className?: string;
}

export function BottomActionBar({ children, className }: BottomActionBarProps) {
  return (
    <div
      className={cn(
        "sticky bottom-0 left-0 right-0 z-20 border-t border-line bg-surface/95 backdrop-blur",
        "px-5 pt-3",
        className,
      )}
      style={{ paddingBottom: "calc(0.75rem + var(--safe-bottom))" }}
    >
      {children}
    </div>
  );
}
