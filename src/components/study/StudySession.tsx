"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { QuestionView } from "@/components/study/QuestionView";
import { SessionResult } from "@/components/study/SessionResult";
import { UnsupportedBanner } from "@/components/study/UnsupportedBanner";
import { useSpeechSupport } from "@/hooks/useSpeechSupport";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Hearts } from "@/components/ui/Hearts";
import { LoadingDots } from "@/components/ui/LoadingDots";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { buildReviewSession, buildSession } from "@/lib/words/getWords";
import { registerOnlineFlush } from "@/lib/sync/userData";
import {
  SET_SIZE,
  useSessionStore,
  type SessionMode,
} from "@/stores/sessionStore";
import { useUserStore } from "@/stores/userStore";
import type { Word } from "@/types";

function parseMode(raw: string | null): SessionMode {
  if (raw === "category" || raw === "review") return raw;
  return "default";
}

export function StudySession() {
  const { loading, user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = parseMode(searchParams.get("mode"));
  const speech = useSpeechSupport();

  const status = useSessionStore((s) => s.status);
  const words = useSessionStore((s) => s.words);
  const currentIndex = useSessionStore((s) => s.currentIndex);
  const hearts = useSessionStore((s) => s.hearts);
  const startSession = useSessionStore((s) => s.startSession);

  const hydrated = useUserStore((s) => s.hydrated);
  const level = useUserStore((s) => s.level);
  const preferredCategories = useUserStore((s) => s.preferredCategories);
  const progress = useUserStore((s) => s.progress);
  const reviewWordIds = useUserStore((s) => s.reviewWordIds);
  const hydrate = useUserStore((s) => s.hydrate);

  useEffect(() => {
    if (loading) return;
    if (!hydrated) void hydrate(user?.id ?? null);
  }, [loading, hydrated, user?.id, hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    let active = true;
    const build = async (): Promise<Word[]> => {
      if (mode === "review") {
        return buildReviewSession(reviewWordIds(), SET_SIZE);
      }
      return buildSession({
        level,
        progress,
        categories: mode === "category" ? preferredCategories : undefined,
        count: SET_SIZE,
      });
    };
    build().then((queue) => {
      if (active) {
        startSession(queue, { mode, level, categories: preferredCategories });
      }
    });
    const unregister = registerOnlineFlush();
    return () => {
      active = false;
      unregister();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, mode, level]);

  if (!hydrated || status === "idle") {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center">
        <LoadingDots />
      </main>
    );
  }

  if (status === "active" && words.length === 0) {
    return (
      <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg font-semibold text-ink">
          복습할 단어가 아직 없어요 📒
        </p>
        <p className="text-sm text-ink-soft">
          학습을 진행하면 어려웠던 단어가 여기에 모여요.
        </p>
        <Card className="w-full">
          <Button onClick={() => router.push("/")}>대시보드로 돌아가기</Button>
        </Card>
      </main>
    );
  }

  if (status === "finished") {
    return <SessionResult />;
  }

  const word = words[currentIndex];

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col">
      <header
        className="flex items-center gap-3 px-5 pb-2"
        style={{ paddingTop: "calc(0.75rem + var(--safe-top))" }}
      >
        <div className="flex-1">
          <ProgressBar current={currentIndex} total={words.length} />
          <p className="mt-1 text-xs font-medium text-ink-soft">
            {currentIndex + 1} / {words.length}
          </p>
        </div>
        <Hearts hearts={hearts} />
        <ThemeToggle />
      </header>

      <UnsupportedBanner
        mode={speech.mode}
        online={speech.online}
        isIOSPWA={speech.isIOSPWA}
      />

      <div className="relative flex flex-1 flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -60, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="flex flex-1 flex-col"
          >
            {word && <QuestionView word={word} mode={speech.mode} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}
