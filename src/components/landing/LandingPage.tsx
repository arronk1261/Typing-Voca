"use client";

import { motion } from "framer-motion";
import { Keyboard } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AudienceSection } from "@/components/landing/AudienceSection";
import { FinalCta } from "@/components/landing/FinalCta";
import { ForgettingCurve } from "@/components/landing/ForgettingCurve";
import { FunGallery } from "@/components/landing/FunGallery";
import { Hero } from "@/components/landing/Hero";
import { LevelSection } from "@/components/landing/LevelSection";
import { LoopSteps } from "@/components/landing/LoopSteps";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function LandingPage() {
  const { signInWithGoogle } = useAuth();

  return (
    <div className="mx-auto min-h-[100dvh] max-w-md bg-surface-muted">
      <header
        className="sticky top-0 z-20 flex items-center justify-between border-b border-line/60 bg-surface/80 px-5 py-3 backdrop-blur-md"
        style={{ paddingTop: "calc(0.75rem + var(--safe-top))" }}
      >
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-white">
            <Keyboard size={16} aria-hidden />
          </span>
          <span className="text-base font-bold text-ink">Typing-Voca</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={signInWithGoogle}
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white active:bg-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            로그인
          </button>
        </div>
      </header>

      <main className="pb-28">
        <Hero />
        <LoopSteps />
        <ForgettingCurve />
        <LevelSection />
        <FunGallery />
        <AudienceSection />
        <FinalCta />
      </main>

      <motion.div
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.6, duration: 0.4, ease: "easeOut" }}
        className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-line bg-surface/90 px-5 py-3 backdrop-blur-md"
        style={{ paddingBottom: "calc(0.75rem + var(--safe-bottom))" }}
      >
        <button
          type="button"
          onClick={signInWithGoogle}
          className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-brand text-base font-semibold text-white shadow-lg shadow-brand/25 active:bg-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          무료로 시작하기
        </button>
      </motion.div>
    </div>
  );
}
