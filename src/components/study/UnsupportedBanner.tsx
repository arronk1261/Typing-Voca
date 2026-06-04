"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Info, X } from "lucide-react";
import { useState } from "react";
import type { ShadowMode } from "@/hooks/useSpeechSupport";

interface UnsupportedBannerProps {
  mode: ShadowMode;
  online: boolean;
  isIOSPWA: boolean;
}

function bannerMessage(
  mode: ShadowMode,
  online: boolean,
  isIOSPWA: boolean,
): string | null {
  if (mode === "full") return null;
  if (!online) {
    return "🔌 오프라인이에요. 발음 연습은 인터넷이 연결되면 다시 켜져요. 타이핑 학습은 그대로 이어가요!";
  }
  if (isIOSPWA) {
    return "📱 홈 화면 앱에서는 마이크가 막혀요. Safari 탭에서 열면 발음 연습까지 즐길 수 있어요.";
  }
  if (mode === "listening") {
    return "🔊 이 브라우저는 듣고 따라 말하기까지 가능해요. 발음 채점은 Chrome/Edge에서 가장 잘 동작해요.";
  }
  return "🔊 발음 연습은 Chrome/Edge에서 가장 잘 동작해요. 지금은 타이핑으로 알차게 학습해요!";
}

export function UnsupportedBanner({
  mode,
  online,
  isIOSPWA,
}: UnsupportedBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const message = bannerMessage(mode, online, isIOSPWA);

  return (
    <AnimatePresence>
      {message && !dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          role="status"
          className="mx-5 mt-2 flex items-start gap-2 rounded-2xl bg-brand-soft px-4 py-3 text-sm text-brand-strong dark:text-white"
        >
          <Info size={18} className="mt-0.5 shrink-0" aria-hidden />
          <p className="flex-1 leading-snug">{message}</p>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="안내 닫기"
            className="-mr-1 shrink-0 rounded-full p-1 active:bg-line/40"
          >
            <X size={16} aria-hidden />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
