"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Home, RotateCcw, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { BottomActionBar } from "@/components/ui/BottomActionBar";
import { useToast } from "@/components/ui/Toast";
import { AchievementSheet } from "@/components/achievements/AchievementSheet";
import { burstConfetti } from "@/lib/confetti";
import type { EarnedAchievement } from "@/lib/achievements/engine";
import {
  buildReviewSession,
  buildSession,
  suggestLevelFromHistory,
  type RollingWindow,
} from "@/lib/words/getWords";
import { isGraduated, isReviewTrigger } from "@/lib/srs";
import { focusWords } from "@/lib/shadowing/pronunciation";
import { SET_SIZE, useSessionStore } from "@/stores/sessionStore";
import { useUserStore } from "@/stores/userStore";
import type { WordLevel } from "@/types";

export function SessionResult() {
  const results = useSessionStore((s) => s.results);
  const words = useSessionStore((s) => s.words);
  const config = useSessionStore((s) => s.config);
  const startSession = useSessionStore((s) => s.startSession);

  const commitSession = useUserStore((s) => s.commitSession);
  const progress = useUserStore((s) => s.progress);
  const router = useRouter();
  const toast = useToast();

  const [earned, setEarned] = useState<EarnedAchievement[]>([]);
  const [xpGained, setXpGained] = useState(0);
  const [badgesDone, setBadgesDone] = useState(false);

  useEffect(() => {
    void burstConfetti();
    if (useSessionStore.getState().committed || results.length === 0) return;
    useSessionStore.getState().markCommitted();

    const outcome = commitSession({
      results,
      level: config.level,
      categories: config.categories,
    });

    setEarned(outcome.newAchievements);
    setXpGained(outcome.xpGained);
    if (outcome.records.streak) {
      toast.show("🔥 최장 연속 학습 신기록!", "success");
    } else if (outcome.records.accuracy) {
      toast.show("🎯 역대 최고 정확도 신기록!", "success");
    } else if (outcome.records.stars) {
      toast.show("⭐ 역대 최고 평균 별점 신기록!", "success");
    }
    if (outcome.freezesEarned > 0) {
      toast.show("🧊 스트릭 동결권을 얻었어요! 하루 쉬어도 연속이 지켜져요.", "info");
    }

    const recent = useUserStore.getState().recentSessions;
    const progressNow = useUserStore.getState().progress;
    const rolling: RollingWindow = {
      sessions: recent.length,
      questions: recent.reduce((s, e) => s + e.total, 0),
      firstTryCorrect: recent.reduce((s, e) => s + e.firstTryCorrect, 0),
      reviewEntries: recent.reduce((s, e) => s + e.reviewTriggers, 0),
      starsSum: recent.reduce((s, e) => s + e.starsSum, 0),
      starsCount: recent.reduce((s, e) => s + e.starsCount, 0),
      graduatedCount: Object.values(progressNow).filter(isGraduated).length,
    };
    const suggestion = suggestLevelFromHistory(rolling, config.level);
    if (suggestion === "up") {
      const next = (config.level + 1) as WordLevel;
      toast.show(
        `요즘 꾸준히 잘하고 있어요! Lv.${next} 맛보기 세트는 어때요? (강제 아니에요, 언제든 조절돼요)`,
        "success",
      );
    } else if (suggestion === "down") {
      const next = (config.level - 1) as WordLevel;
      toast.show(
        `최근 조금 버거웠죠? Lv.${next} 기초 다지기 모드로 잠깐 쉬어가도 좋아요.`,
        "info",
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = results.length;
  const firstTry = results.filter((r) => r.firstTryCorrect).length;
  const review = results.filter((r) => r.heartsDepleted).length;
  const starred = results.filter((r) => typeof r.shadowStars === "number");
  const avgStars =
    starred.length > 0
      ? starred.reduce((sum, r) => sum + (r.shadowStars ?? 0), 0) /
        starred.length
      : null;

  const justMissedIds = results
    .filter((r) => isReviewTrigger(r))
    .map((r) => r.wordId);

  const pronunciationFocus = focusWords(
    results.flatMap((r) => r.weakWords ?? []),
    3,
  );

  const restart = async () => {
    const queue = await buildSession({
      level: config.level,
      progress,
      categories: config.mode === "category" ? config.categories : undefined,
      count: SET_SIZE,
    });
    startSession(queue, {
      ...config,
      mode: config.mode === "review" ? "default" : config.mode,
    });
  };

  const reviewMissed = async () => {
    const queue = await buildReviewSession(justMissedIds, SET_SIZE);
    if (queue.length === 0) return;
    startSession(queue, { ...config, mode: "review" });
  };

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col">
      <div className="flex flex-1 flex-col gap-4 px-5 pb-4 pt-8">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.5, rotate: -10, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 240, damping: 14 }}
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent/15 text-accent"
          >
            <Trophy size={40} aria-hidden />
          </motion.div>
          <h1 className="mt-4 text-2xl font-bold text-ink">한 세트 완료! 🎉</h1>
          <p className="mt-1 text-sm text-ink-soft">오늘도 한 걸음 나아갔어요.</p>
          {xpGained > 0 && (
            <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-accent/15 px-3 py-1 text-sm font-bold text-accent">
              +{xpGained} XP
            </span>
          )}
        </div>

        <Card className="flex justify-around text-center">
          <Stat label="학습 단어" value={`${total}`} />
          <Stat label="첫 시도 정답" value={`${firstTry}`} accent="success" />
          <Stat
            label="평균 별점"
            value={avgStars !== null ? `⭐${avgStars.toFixed(1)}` : "—"}
            accent="star"
          />
          <Stat label="복습 노트" value={`${review}`} accent="accent" />
        </Card>

        <Card className="flex flex-col gap-2">
          <p className="mb-1 text-sm font-semibold text-ink-soft">
            오늘 학습한 단어
          </p>
          {words.map((w, i) => {
            const r = results[i];
            return (
              <div
                key={w.id}
                className="flex items-center justify-between border-b border-line/60 py-1.5 last:border-0"
              >
                <span className="font-en font-medium text-ink">{w.answer}</span>
                <span className="flex-1 px-2 text-sm text-ink-soft">{w.meaning}</span>
                <span className="text-xs tabular-nums" aria-label="섀도잉 별점">
                  {typeof r?.shadowStars === "number" && r.shadowStars > 0
                    ? "⭐".repeat(r.shadowStars)
                    : r?.shadowSkipped
                      ? "⏭"
                      : r?.heartsDepleted
                        ? "📒"
                        : "✓"}
                </span>
              </div>
            );
          })}
        </Card>

        {pronunciationFocus.length > 0 && (
          <Card className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-ink-soft">
              🎤 발음 포커스 — 다음엔 이 단어를 또렷하게!
            </p>
            <div className="flex flex-wrap gap-2">
              {pronunciationFocus.map((w) => (
                <span
                  key={w}
                  className="rounded-full bg-brand-soft px-3 py-1 font-en text-sm font-medium text-brand-strong dark:text-white"
                >
                  {w}
                </span>
              ))}
            </div>
          </Card>
        )}
      </div>

      <BottomActionBar>
        <div className="flex flex-col gap-2">
          {justMissedIds.length > 0 && (
            <Button variant="secondary" onClick={reviewMissed}>
              방금 틀린 단어 복습 ({justMissedIds.length})
            </Button>
          )}
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="w-auto px-5"
              onClick={() => router.push("/")}
              aria-label="메인 로비로"
            >
              <Home size={18} aria-hidden />
            </Button>
            <Button onClick={restart}>
              <RotateCcw size={18} aria-hidden /> 한 세트 더
            </Button>
          </div>
        </div>
      </BottomActionBar>

      {earned.length > 0 && !badgesDone && (
        <AchievementSheet items={earned} onDone={() => setBadgesDone(true)} />
      )}
    </main>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "success" | "accent" | "star";
}) {
  const color =
    accent === "success"
      ? "text-success"
      : accent === "accent"
        ? "text-accent"
        : accent === "star"
          ? "text-star"
          : "text-brand";
  return (
    <div className="flex flex-col">
      <span className={`text-xl font-bold ${color}`}>{value}</span>
      <span className="mt-0.5 text-xs text-ink-soft">{label}</span>
    </div>
  );
}
