"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { fillTypedSlots } from "@/lib/typing/answerCheck";

interface TypingInputProps {
  answer: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  shake?: boolean;
  status: "typing" | "correct" | "wrong";
}

export function TypingInput({
  answer,
  value,
  onChange,
  onSubmit,
  disabled = false,
  shake = false,
  status,
}: TypingInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (disabled) return;
    const id = window.setTimeout(() => {
      inputRef.current?.focus();
      wrapRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 60);
    return () => window.clearTimeout(id);
  }, [disabled, answer]);

  const chars = answer.split("");

  return (
    <div ref={wrapRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        inputMode="text"
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        maxLength={answer.length}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(fillTypedSlots(answer, e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSubmit();
          }
        }}
        aria-label="빈칸에 들어갈 영어 단어 입력"
        className="absolute inset-0 h-full w-full cursor-text text-[16px] opacity-0"
      />
      <motion.div
        animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        onClick={() => inputRef.current?.focus()}
        className="flex flex-wrap items-end justify-center gap-x-1.5 gap-y-3"
        aria-hidden
      >
        {chars.map((ch, i) => {
          if (ch === " ") {
            return <span key={i} className="w-3" />;
          }
          const typed = value[i];
          const isCurrent =
            !disabled && status === "typing" && i === value.length;
          return (
            <span
              key={i}
              className="relative flex flex-col items-center font-mono"
            >
              <span className="flex h-9 min-w-[1.1ch] items-center justify-center text-2xl font-semibold leading-none">
                <AnimatePresence mode="popLayout">
                  {typed ? (
                    <motion.span
                      key="c"
                      initial={{ y: 6, opacity: 0, scale: 0.7 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      transition={{ duration: 0.16 }}
                      className={cn(
                        status === "correct"
                          ? "text-success"
                          : status === "wrong"
                            ? "text-attention"
                            : "text-ink",
                      )}
                    >
                      {typed}
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </span>
              <motion.span
                className={cn(
                  "h-0.5 w-full rounded-full",
                  isCurrent ? "bg-brand" : "bg-line",
                )}
                animate={isCurrent ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
                transition={
                  isCurrent
                    ? { duration: 1, repeat: Infinity }
                    : { duration: 0.2 }
                }
              />
            </span>
          );
        })}
      </motion.div>
    </div>
  );
}
