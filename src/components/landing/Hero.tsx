"use client";

import { motion } from "framer-motion";
import { Keyboard, Mic, Sparkles } from "lucide-react";
import { GoogleCta } from "@/components/landing/GoogleCta";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-5 pb-16 pt-[calc(2rem+var(--safe-top))] text-center">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 0%, var(--color-brand-soft) 0%, transparent 60%)",
        }}
        aria-hidden
      />

      <motion.span
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand-strong"
      >
        <Sparkles size={13} aria-hidden />
        무료 · 설치 없이 브라우저에서 바로
      </motion.span>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.05 }}
        className="mx-auto mt-5 max-w-[18rem] text-[2rem] font-extrabold leading-tight tracking-tight text-ink"
      >
        손끝으로 치고
        <br />
        <span className="text-brand">입으로 말하며</span> 외우는
        <br />
        영어 회화
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.12 }}
        className="mx-auto mt-4 max-w-[20rem] text-[15px] leading-relaxed text-ink-soft"
      >
        눈으로 보고 넘기는 단어장은 그만. 직접 <b className="text-ink">타이핑</b>하고
        문장을 <b className="text-ink">따라 말하면</b> 기억에 훨씬 오래 남아요.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.18 }}
        className="mx-auto mt-8 w-full max-w-sm"
      >
        <HeroPreview />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.26 }}
        className="mx-auto mt-8 w-full max-w-sm"
      >
        <GoogleCta label="Google로 시작하기" />
        <p className="mt-3 text-xs text-ink-soft">
          하루 10단어 · 같은 계정이면 어느 기기에서나 이어집니다
        </p>
      </motion.div>
    </section>
  );
}

function HeroPreview() {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5 text-left shadow-lg shadow-brand/10">
      <p className="text-sm font-medium text-ink-soft">그는 회의에 늦었다.</p>
      <p className="mt-2 font-en text-lg text-ink">
        He was <span className="text-brand">late</span> for the meeting.
      </p>
      <div className="mt-3 flex items-center gap-2 font-mono text-lg text-brand">
        {"late".split("").map((ch, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0.25 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: 0.3,
              delay: 0.5 + i * 0.18,
              repeat: Infinity,
              repeatDelay: 2.2,
              repeatType: "reverse",
            }}
            className="flex h-9 w-7 items-center justify-center rounded-md border-b-2 border-brand bg-brand-soft"
          >
            {ch}
          </motion.span>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3 border-t border-line pt-3 text-xs text-ink-soft">
        <span className="flex items-center gap-1 font-semibold text-brand-strong">
          <Keyboard size={14} aria-hidden /> 타이핑
        </span>
        <span aria-hidden>→</span>
        <span className="flex items-center gap-1 font-semibold text-accent">
          <Mic size={14} aria-hidden /> 따라 말하기
        </span>
        <span className="ml-auto text-star">★★★</span>
      </div>
    </div>
  );
}
