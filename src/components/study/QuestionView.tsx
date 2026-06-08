"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { BottomActionBar } from "@/components/ui/BottomActionBar";
import { TypingInput } from "@/components/study/TypingInput";
import { ShadowingView } from "@/components/study/ShadowingView";
import { useHaptics } from "@/hooks/useHaptics";
import type { ShadowMode } from "@/hooks/useSpeechSupport";
import { burstConfetti } from "@/lib/confetti";
import { isAnswerCorrect, splitSentence } from "@/lib/typing/answerCheck";
import { stagedHint, type StagedHint } from "@/lib/typing/hints";
import { useSessionStore } from "@/stores/sessionStore";
import type { Word } from "@/types";

type Judge = "typing" | "correct" | "wrong";

interface QuestionViewProps {
  word: Word;
  mode: ShadowMode;
}

export function QuestionView({ word, mode }: QuestionViewProps) {
  const stage = useSessionStore((s) => s.stage);
  const hearts = useSessionStore((s) => s.hearts);
  const loseHeart = useSessionStore((s) => s.loseHeart);
  const registerAttempt = useSessionStore((s) => s.registerAttempt);
  const completeTyping = useSessionStore((s) => s.completeTyping);
  const advance = useSessionStore((s) => s.advance);
  const haptics = useHaptics();

  const [value, setValue] = useState("");
  const [judge, setJudge] = useState<Judge>("typing");
  const [shake, setShake] = useState(false);
  const [hint, setHint] = useState<StagedHint | null>(null);
  const [encourage, setEncourage] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const attemptsRef = useRef(0);

  const { before, after } = splitSentence(word.sentence_en);
  const locked = judge === "correct";

  const handleSubmit = () => {
    if (locked || stage !== "typing") return;
    if (value.trim().length === 0) return;

    const correct = isAnswerCorrect(value, word.answer, word.accepted_answers);
    const isFirstTry = attemptsRef.current === 0;
    registerAttempt();
    attemptsRef.current += 1;

    if (correct) {
      setJudge("correct");
      setFlash(true);
      haptics(20);
      void burstConfetti();
      window.setTimeout(() => setFlash(false), 320);
      window.setTimeout(() => completeTyping(isFirstTry, false), 520);
      return;
    }

    haptics([0, 30, 40, 30]);
    setJudge("wrong");
    setShake(true);
    window.setTimeout(() => setShake(false), 420);

    const remaining = hearts - 1;
    loseHeart();

    if (remaining <= 0) {
      setEncourage("이 단어는 복습 노트에 담아둘게요 📒");
      window.setTimeout(() => completeTyping(false, true), 700);
      return;
    }

    setHint(stagedHint(word.answer, attemptsRef.current));
    setEncourage("거의 다 왔어요! 한 번 더 볼까요?");
    window.setTimeout(() => {
      setValue("");
      setJudge("typing");
    }, 450);
  };

  if (stage === "shadowing") {
    return <ShadowingView word={word} mode={mode} onNext={advance} />;
  }

  return (
    <div className="flex flex-1 flex-col">
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-none fixed inset-0 z-30 bg-success/25"
            aria-hidden
          />
        )}
      </AnimatePresence>

      <div className="flex flex-1 flex-col gap-4 px-5 pb-4 pt-2">
        <Card className="flex flex-1 flex-col justify-center gap-6">
          <div className="text-center">
            <p className="text-sm font-medium text-brand">{word.meaning}</p>
            <p className="mt-1 text-lg font-semibold text-ink">
              {word.sentence_ko}
            </p>
          </div>

          <div className="font-en text-xl leading-relaxed text-ink">
            <span className="flex flex-wrap items-end justify-center gap-x-1">
              {before && <span>{before}</span>}
              <TypingInput
                answer={word.answer}
                value={value}
                onChange={setValue}
                onSubmit={handleSubmit}
                disabled={locked}
                shake={shake}
                status={judge}
              />
              {after && <span>{after}</span>}
            </span>
          </div>

          <div className="min-h-[1.5rem] text-center" aria-live="polite">
            <AnimatePresence mode="wait">
              {judge === "correct" ? (
                <motion.p
                  key="ok"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-center gap-1.5 font-semibold text-success"
                >
                  <Check size={18} aria-hidden /> 정답이에요!
                </motion.p>
              ) : encourage ? (
                <motion.p
                  key="enc"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm font-medium text-accent"
                >
                  {encourage}
                  {hint && (
                    <span className="ml-1 text-ink-soft">
                      {hint.label}: <b className="font-mono">{hint.text}</b>
                    </span>
                  )}
                </motion.p>
              ) : null}
            </AnimatePresence>
          </div>
        </Card>
      </div>

      <BottomActionBar>
        <Button onClick={handleSubmit} disabled={locked || value.trim().length === 0}>
          확인하기
        </Button>
      </BottomActionBar>
    </div>
  );
}
