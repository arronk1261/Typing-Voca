"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { BottomActionBar } from "@/components/ui/BottomActionBar";
import { LoadingDots } from "@/components/ui/LoadingDots";
import { TypingInput } from "@/components/study/TypingInput";
import {
  firstLetterHint,
  isAnswerCorrect,
  splitSentence,
} from "@/lib/typing/answerCheck";
import { levelFromScore, pickLevelTest } from "@/lib/words/levelTest";
import type { Word, WordLevel } from "@/types";

interface LevelTestProps {
  onDone: (level: WordLevel) => void;
}

export function LevelTest({ onDone }: LevelTestProps) {
  const [questions, setQuestions] = useState<Word[]>([]);
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState("");
  const [correct, setCorrect] = useState(0);
  const [judge, setJudge] = useState<"typing" | "correct" | "wrong">("typing");
  const [shake, setShake] = useState(false);

  useEffect(() => {
    let active = true;
    pickLevelTest().then((qs) => {
      if (active) setQuestions(qs);
    });
    return () => {
      active = false;
    };
  }, []);

  if (questions.length === 0) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center">
        <LoadingDots />
      </main>
    );
  }

  const word = questions[index];
  const { before, after } = splitSentence(word.sentence_en);

  const next = (gotIt: boolean) => {
    const nextCorrect = correct + (gotIt ? 1 : 0);
    const nextIndex = index + 1;
    if (nextIndex >= questions.length) {
      onDone(levelFromScore(nextCorrect));
      return;
    }
    setCorrect(nextCorrect);
    setIndex(nextIndex);
    setValue("");
    setJudge("typing");
  };

  const submit = () => {
    if (judge === "correct") return;
    const isCorrect = isAnswerCorrect(value, word.answer);
    if (isCorrect) {
      setJudge("correct");
      window.setTimeout(() => next(true), 420);
      return;
    }
    setJudge("wrong");
    setShake(true);
    window.setTimeout(() => setShake(false), 420);
  };

  const skip = () => next(false);

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col">
      <header
        className="px-5 pb-2"
        style={{ paddingTop: "calc(1rem + var(--safe-top))" }}
      >
        <div className="mb-3 flex items-center gap-2 text-brand">
          <Sparkles size={20} aria-hidden />
          <h1 className="text-lg font-bold">레벨 테스트</h1>
        </div>
        <ProgressBar current={index} total={questions.length} />
        <p className="mt-1 text-xs font-medium text-ink-soft">
          {index + 1} / {questions.length} · 추정 레벨이며 학습하며 자동
          조정돼요
        </p>
      </header>

      <div className="relative flex flex-1 flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -60, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="flex flex-1 flex-col gap-4 px-5 pb-4 pt-2"
          >
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
                    onSubmit={submit}
                    disabled={judge === "correct"}
                    shake={shake}
                    status={judge}
                  />
                  {after && <span>{after}</span>}
                </span>
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      <BottomActionBar>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            className="w-auto px-5"
            onClick={skip}
          >
            모르겠어요
          </Button>
          <Button
            onClick={submit}
            disabled={judge === "correct" || value.trim().length === 0}
          >
            확인하기
          </Button>
        </div>
        {judge === "wrong" && (
          <p className="mt-2 text-center text-xs text-ink-soft">
            첫 글자: <b className="font-mono">{firstLetterHint(word.answer)}</b>{" "}
            · 모르면 넘어가도 괜찮아요
          </p>
        )}
      </BottomActionBar>
    </main>
  );
}
