"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, type ReactNode } from "react";
import { sheetVariants, transitionFast } from "@/lib/motion";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm"
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title ?? "시트"}
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={transitionFast}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120) onClose();
            }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-[var(--radius-card)] border border-line bg-surface/95 backdrop-blur"
            style={{ paddingBottom: "calc(1.25rem + var(--safe-bottom))" }}
          >
            <div className="flex justify-center pb-1 pt-3">
              <span className="h-1.5 w-10 rounded-full bg-line" aria-hidden />
            </div>
            {title && (
              <h2 className="px-5 pb-2 text-lg font-bold text-ink">{title}</h2>
            )}
            <div className="px-5 pt-2">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
