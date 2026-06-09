"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Gauge,
  Mic,
  RotateCcw,
  SkipForward,
  Volume2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { BottomActionBar } from "@/components/ui/BottomActionBar";
import { StarRating } from "@/components/study/StarRating";
import { useHaptics } from "@/hooks/useHaptics";
import type { ShadowMode } from "@/hooks/useSpeechSupport";
import { burstConfetti } from "@/lib/confetti";
import {
  cancelSpeech,
  registerTTSVisibilityGuard,
  speak,
} from "@/lib/speech/tts";
import { startRecognition, type STTHandle } from "@/lib/speech/stt";
import { scoreShadowing, type ShadowResult } from "@/lib/shadowing/score";
import { useSessionStore } from "@/stores/sessionStore";
import type { Word } from "@/types";

type Phase = "intro" | "recording" | "scored" | "retry" | "fatigue";

const AUTO_ADVANCE_MS = 3000;
// 9-3b: 음성 인식이 연속 실패하면 발음 약점이 아니라 '인식 환경 이슈'로 보고 중립 처리
const MAX_MISSES = 2;

const STAR_LABEL: Record<number, string> = {
  3: "Perfect Echo!",
  2: "Nice!",
  1: "Keep going",
};

interface ShadowingViewProps {
  word: Word;
  mode: ShadowMode;
  onNext: () => void;
}

export function ShadowingView({ word, mode, onNext }: ShadowingViewProps) {
  const completeShadowing = useSessionStore((s) => s.completeShadowing);
  const haptics = useHaptics();

  const [speaking, setSpeaking] = useState(false);
  const [phase, setPhase] = useState<Phase>("intro");
  const [result, setResult] = useState<ShadowResult | null>(null);
  const sttRef = useRef<STTHandle | null>(null);
  const advanceTimer = useRef<number | null>(null);
  const recordedRef = useRef(false);
  const missesRef = useRef(0);

  const finish = useCallback(
    (
      stars: number | null,
      score: number | null,
      skipped: boolean,
      weakWords: string[] = [],
    ) => {
      if (recordedRef.current) return;
      recordedRef.current = true;
      completeShadowing(stars, score, skipped, mode, weakWords);
    },
    [completeShadowing, mode],
  );

  const goNext = useCallback(() => {
    cancelSpeech();
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    onNext();
  }, [onNext]);

  const playTTS = useCallback(
    (rate = 1) => {
      if (mode === "typingOnly") return;
      speak(word.tts_text, {
        rate,
        onStart: () => setSpeaking(true),
        onEnd: () => setSpeaking(false),
      });
    },
    [mode, word.tts_text],
  );

  useEffect(() => {
    const unregister = registerTTSVisibilityGuard();
    if (mode === "typingOnly") {
      finish(null, null, true);
      onNext();
    } else {
      playTTS(1);
    }
    return () => {
      unregister();
      cancelSpeech();
      sttRef.current?.abort();
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = () => {
    if (phase === "recording") return;
    cancelSpeech();
    setSpeaking(false);
    setPhase("recording");
    sttRef.current = startRecognition({
      onResult: (r) => {
        const scored = scoreShadowing(word.tts_text, r.transcript, r.confidence);
        applyResult(scored);
      },
      onError: (kind) => {
        if (kind === "not-allowed") {
          setResult(null);
          setPhase("retry");
          return;
        }
        applyResult({ status: "retry", score: null, stars: 0, weakWords: [] });
      },
    });
  };

  const applyResult = (scored: ShadowResult) => {
    if (scored.status === "retry") {
      missesRef.current += 1;
      // 9-3b: 2회 연속 미인식이면 중립으로 넘겨 피로를 덜고 발음 점수에 불이익을 주지 않음
      if (missesRef.current >= MAX_MISSES) {
        finish(null, null, true);
        setPhase("fatigue");
        advanceTimer.current = window.setTimeout(goNext, AUTO_ADVANCE_MS);
        return;
      }
      setPhase("retry");
      return;
    }
    setResult(scored);
    setPhase("scored");
    finish(scored.stars, scored.score, false, scored.weakWords);
    if (scored.stars === 3) {
      haptics(20);
      void burstConfetti();
    } else {
      haptics(15);
    }
    advanceTimer.current = window.setTimeout(goNext, AUTO_ADVANCE_MS);
  };

  const selfCheck = (good: boolean) => {
    const stars = good ? 2 : 1;
    finish(stars, good ? 70 : 50, false);
    setResult({ status: "scored", score: null, stars, weakWords: [] });
    setPhase("scored");
    advanceTimer.current = window.setTimeout(goNext, AUTO_ADVANCE_MS);
  };

  const skip = () => {
    finish(null, null, true);
    goNext();
  };

  if (mode === "typingOnly") return null;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-4 px-5 pb-4 pt-2">
        <Card className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <SpeakerPulse speaking={speaking} />

          <Sentence
            text={word.tts_text}
            weakWords={result?.weakWords ?? []}
          />
          <p className="text-sm text-ink-soft">{word.sentence_ko}</p>

          <button
            type="button"
            onClick={() => playTTS(0.7)}
            className="flex items-center gap-1.5 rounded-full bg-brand-soft px-4 py-2 text-sm font-medium text-brand-strong active:brightness-95 dark:text-white"
            aria-label="느리게 다시 듣기"
          >
            <Gauge size={16} aria-hidden /> 느리게 다시 듣기
          </button>

          <div className="min-h-[5.5rem]" aria-live="polite">
            <AnimatePresence mode="wait">
              {phase === "scored" && result && (
                <motion.div key="scored" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <StarRating
                    stars={result.stars}
                    label={STAR_LABEL[result.stars] ?? "Nice!"}
                  />
                </motion.div>
              )}
              {phase === "retry" && (
                <motion.p
                  key="retry"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-base font-semibold text-brand"
                >
                  🎤 잘 안 들렸어요. 한 번 더 해볼까요?
                </motion.p>
              )}
              {phase === "fatigue" && (
                <motion.p
                  key="fatigue"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-base font-semibold text-brand"
                >
                  🙂 인식이 잘 안 되는 환경 같아요. 오늘은 듣고 넘어가도 좋아요.
                </motion.p>
              )}
              {phase === "recording" && (
                <motion.p
                  key="rec"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-base font-semibold text-attention"
                >
                  듣고 있어요… 따라 말해보세요!
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </Card>
      </div>

      <BottomActionBar>
        <div className="flex flex-col gap-2">
          {mode === "full" && phase !== "scored" && phase !== "fatigue" && (
            <Button onClick={startRecording} disabled={phase === "recording"}>
              <Mic size={18} aria-hidden />
              {phase === "retry" ? "다시 따라 말하기" : "따라 말하기"}
            </Button>
          )}

          {mode === "listening" && phase !== "scored" && phase !== "fatigue" && (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => selfCheck(false)}>
                <RotateCcw size={18} aria-hidden /> 다시
              </Button>
              <Button onClick={() => selfCheck(true)}>
                <Check size={18} aria-hidden /> 잘 했어요
              </Button>
            </div>
          )}

          {phase === "scored" || phase === "fatigue" ? (
            <Button onClick={goNext}>
              <SkipForward size={18} aria-hidden /> 다음 문제
            </Button>
          ) : (
            <Button variant="ghost" onClick={skip} aria-label="섀도잉 건너뛰기">
              건너뛰기
            </Button>
          )}
        </div>
      </BottomActionBar>
    </div>
  );
}

function SpeakerPulse({ speaking }: { speaking: boolean }) {
  return (
    <div className="relative flex h-20 w-20 items-center justify-center">
      <AnimatePresence>
        {speaking && (
          <motion.span
            initial={{ scale: 0.8, opacity: 0.6 }}
            animate={{ scale: 1.6, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeOut" }}
            className="absolute inset-0 rounded-full bg-brand/30"
            aria-hidden
          />
        )}
      </AnimatePresence>
      <motion.div
        animate={speaking ? { scale: [1, 1.08, 1] } : { scale: 1 }}
        transition={{ duration: 0.8, repeat: speaking ? Infinity : 0 }}
        className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-soft text-brand"
      >
        <Volume2 size={34} aria-hidden />
      </motion.div>
    </div>
  );
}

function Sentence({
  text,
  weakWords,
}: {
  text: string;
  weakWords: string[];
}) {
  const weakSet = new Set(weakWords.map((w) => w.toLowerCase()));
  const tokens = text.split(/(\s+)/);
  return (
    <p className="font-en text-xl font-semibold leading-relaxed text-ink">
      {tokens.map((token, i) => {
        const bare = token.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?"]/g, "");
        const weak = bare.length > 0 && weakSet.has(bare);
        return (
          <span key={i} className={weak ? "text-attention underline decoration-wavy" : undefined}>
            {token}
          </span>
        );
      })}
    </p>
  );
}
