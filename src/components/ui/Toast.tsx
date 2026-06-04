"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, AlertCircle } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastTone = "success" | "info" | "attention";

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  show: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const icons: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 size={18} aria-hidden />,
  info: <Info size={18} aria-hidden />,
  attention: <AlertCircle size={18} aria-hidden />,
};

const toneClass: Record<ToastTone, string> = {
  success: "text-success",
  info: "text-brand",
  attention: "text-accent",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const show = useCallback((message: string, tone: ToastTone = "info") => {
    const id = ++counter.current;
    setItems((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 2600);
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[60] mx-auto flex max-w-md flex-col items-center gap-2 px-4"
        style={{ paddingTop: "calc(0.75rem + var(--safe-top))" }}
        aria-live="polite"
      >
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              initial={{ y: -24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -24, opacity: 0 }}
              className="flex w-full items-center gap-2 rounded-2xl border border-line bg-surface/95 px-4 py-3 text-sm font-medium text-ink shadow-lg backdrop-blur"
            >
              <span className={toneClass[t.tone]}>{icons[t.tone]}</span>
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
