"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Hearts } from "@/components/ui/Hearts";
import { LoadingDots } from "@/components/ui/LoadingDots";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useToast } from "@/components/ui/Toast";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { slideVariants, transitionFast } from "@/lib/motion";

export default function SamplePage() {
  const [progress, setProgress] = useState(3);
  const [hearts, setHearts] = useState(3);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [slideKey, setSlideKey] = useState(0);
  const { show } = useToast();

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col gap-5 px-5 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">디자인 시스템</h1>
        <ThemeToggle />
      </header>

      <Card className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-ink-soft">버튼</p>
        <Button onClick={() => show("기본 동작 완료!", "success")}>
          Primary
        </Button>
        <Button variant="secondary" onClick={() => show("정보 토스트", "info")}>
          Secondary
        </Button>
        <Button variant="ghost" onClick={() => show("주의 토스트", "attention")}>
          Ghost
        </Button>
        <Button disabled>Disabled</Button>
      </Card>

      <Card className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-ink-soft">진행도 & 하트</p>
        <ProgressBar current={progress} total={10} />
        <div className="flex items-center justify-between">
          <Hearts hearts={hearts} />
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="w-auto px-4"
              onClick={() => {
                setProgress((p) => (p >= 10 ? 0 : p + 1));
                setHearts((h) => (h <= 0 ? 3 : h - 1));
              }}
            >
              +1 / -하트
            </Button>
          </div>
        </div>
      </Card>

      <Card className="flex flex-col items-center gap-3">
        <p className="text-sm font-semibold text-ink-soft">로딩 & 전환</p>
        <LoadingDots />
        <div className="h-16 w-full overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={slideKey}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transitionFast}
              className="flex h-16 items-center justify-center rounded-2xl bg-brand-soft font-en text-brand-strong"
            >
              슬라이드 카드 #{slideKey}
            </motion.div>
          </AnimatePresence>
        </div>
        <Button variant="secondary" onClick={() => setSlideKey((k) => k + 1)}>
          다음으로 슬라이드
        </Button>
      </Card>

      <Card className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-ink-soft">바텀시트 & 토스트</p>
        <Button onClick={() => setSheetOpen(true)}>바텀시트 열기</Button>
      </Card>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="바텀시트 예시"
      >
        <p className="text-ink-soft">
          아래로 드래그하거나 바깥을 탭하면 닫혀요. 떠 있는 레이어에만 절제된
          글래스(블러)를 적용했습니다.
        </p>
        <div className="mt-4">
          <Button onClick={() => setSheetOpen(false)}>닫기</Button>
        </div>
      </BottomSheet>
    </main>
  );
}
