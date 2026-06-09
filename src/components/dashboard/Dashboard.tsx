"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Award,
  BarChart3,
  BookMarked,
  CalendarRange,
  Keyboard,
  LayoutGrid,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { CategorySheet } from "@/components/dashboard/CategorySheet";
import { LearningRings } from "@/components/dashboard/LearningRings";
import { StreakFlame } from "@/components/dashboard/StreakFlame";
import { WeeklyReportAuto } from "@/components/report/WeeklyReportAuto";
import { LevelTest } from "@/components/onboarding/LevelTest";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingDots } from "@/components/ui/LoadingDots";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { GoogleLoginCard } from "@/components/auth/GoogleLoginCard";
import { useUserStore } from "@/stores/userStore";

export function Dashboard() {
  const { configured, loading, user, signOut } = useAuth();
  const router = useRouter();

  const hydrated = useUserStore((s) => s.hydrated);
  const onboarded = useUserStore((s) => s.onboarded);
  const level = useUserStore((s) => s.level);
  const streak = useUserStore((s) => s.streak);
  const totalLearned = useUserStore((s) => s.totalLearned);
  const xp = useUserStore((s) => s.xp);
  const streakFreezes = useUserStore((s) => s.streakFreezes);
  const preferredCategories = useUserStore((s) => s.preferredCategories);
  const hydrate = useUserStore((s) => s.hydrate);
  const completeOnboarding = useUserStore((s) => s.completeOnboarding);
  const setPreferredCategories = useUserStore((s) => s.setPreferredCategories);
  const reviewWordIds = useUserStore((s) => s.reviewWordIds);

  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    void hydrate(user?.id ?? null);
  }, [loading, user?.id, hydrate]);

  if (configured && !loading && !user) {
    return <GoogleLoginCard />;
  }

  if (loading || !hydrated) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center">
        <LoadingDots />
      </main>
    );
  }

  if (!onboarded) {
    return <LevelTest onDone={completeOnboarding} />;
  }

  const reviewCount = reviewWordIds().length;

  const startCategory = (categories: string[]) => {
    setPreferredCategories(categories);
    setSheetOpen(false);
    router.push(categories.length > 0 ? "/study?mode=category" : "/study");
  };

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-5 pb-8">
      <header
        className="flex items-center justify-between pb-4"
        style={{ paddingTop: "calc(1rem + var(--safe-top))" }}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white">
            <Keyboard size={18} aria-hidden />
          </div>
          <span className="text-lg font-bold text-ink">Typing-Voca</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {configured && user && (
            <button
              type="button"
              onClick={signOut}
              aria-label="로그아웃"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <LogOut size={18} aria-hidden />
            </button>
          )}
        </div>
      </header>

      <Card className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-ink-soft">현재 레벨</span>
          <span className="text-2xl font-bold text-brand">Lv.{level}</span>
          <span className="text-xs text-ink-soft">
            누적 <b className="text-ink">{totalLearned}</b> 단어
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs font-medium text-ink-soft">연속 학습</span>
          <StreakFlame streak={streak} />
          <span className="text-xs text-ink-soft">
            {streakFreezes > 0 && `🧊${streakFreezes} · `}
            <b className="text-accent">{xp}</b> XP
          </span>
        </div>
      </Card>

      <div className="mt-4">
        <LearningRings />
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <Button onClick={() => router.push("/study")}>
          <Keyboard size={18} aria-hidden /> 오늘의 10단어 학습
        </Button>
        <Button variant="secondary" onClick={() => setSheetOpen(true)}>
          <LayoutGrid size={18} aria-hidden /> 카테고리 학습
        </Button>
        {reviewCount > 0 && (
          <Button
            variant="secondary"
            onClick={() => router.push("/study?mode=review")}
          >
            <BookMarked size={18} aria-hidden /> 오답 노트 ({reviewCount})
          </Button>
        )}
      </div>

      <div className="mt-auto grid grid-cols-3 gap-3 pt-8">
        <SecondaryLink
          icon={<Award size={18} aria-hidden />}
          label="배지"
          onClick={() => router.push("/achievements")}
        />
        <SecondaryLink
          icon={<BarChart3 size={18} aria-hidden />}
          label="통계"
          onClick={() => router.push("/stats")}
        />
        <SecondaryLink
          icon={<CalendarRange size={18} aria-hidden />}
          label="리포트"
          onClick={() => router.push("/report")}
        />
      </div>

      <CategorySheet
        open={sheetOpen}
        initial={preferredCategories}
        onClose={() => setSheetOpen(false)}
        onStart={startCategory}
      />
      <WeeklyReportAuto />
    </main>
  );
}

function SecondaryLink({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-3 py-3 text-sm font-medium text-ink-soft transition-colors active:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      {icon}
      {label}
    </button>
  );
}
