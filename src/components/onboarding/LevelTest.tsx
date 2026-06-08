"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Rocket } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import { pickLevelTest, scoreLevelTest } from "@/lib/words/levelTest";
import type { LevelTestSignal, LevelTestOutcome } from "@/lib/words/levelScore";
import type { Word } from "@/types";

interface LevelTestProps {
  onDone: (outcome: LevelTestOutcome) => void;
}

const LEVEL_LABEL: Record<number, string> = {
  1: "입문 (A1-A2)",
  2: "중급 (B1)",
  3: "고급 (B2-C1)",
};

export function LevelTest({ onDone }: LevelTestProps) {
  const [questions, setQuestions] = useState<Word[]>([]);
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState("");
  const [judge, setJudge] = useState<"typing" | "correct" | "wrong">("typing");
  const [shake, setShake] = useState(false);
  const [outcome, setOutcome] = useState<LevelTestOutcome | null>(null);

  const signalsRef = useRef<LevelTestSignal[]>([]);
  const startRef = useRef<number>(0);
  const retriesRef = useRef(0);
  const hintsRef = useRef(0);

  useEffect(() => {
    let active = true;
    pickLevelTest().then((qs) => {
      if (active) {
        setQuestions(qs);
        startRef.current = Date.now();
      }
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

  if (outcome) {
    return (
      <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-5">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="flex flex-col items-center gap-4 py-10 text-center">
            <Rocket className="text-brand" size={40} aria-hidden />
            <p className="text-sm font-medium text-ink-soft">추천 시작 레벨</p>
            <p className="text-3xl font-bold text-brand">
              Lv.{outcome.level}
            </p>
            <p className="text-base font-semibold text-ink">
              {LEVEL_LABEL[outcome.level]}
            </p>
            <p className="px-2 text-sm leading-relaxed text-ink-soft">
              여기서 출발해요. 학습하는 동안 자동으로 딱 맞게 조정되니 부담 갖지
              않아도 괜찮아요 🙂
            </p>
          </Card>
        </motion.div>
        <div className="mt-5">
          <Button onClick={() => onDone(outcome)}>이 레벨로 시작하기</Button>
        </div>
      </main>
    );
  }

  const word = questions[index];
  const { before, after } = splitSentence(word.sentence_en);

  const recordSignal = (correct: boolean) => {
    signalsRef.current.push({
      questionLevel: word.level,
      correct,
      hintsUsed: hintsRef.current,
      retries: retriesRef.current,
      responseMs: Date.now() - startRef.current,
      multiWord: word.answer.trim().includes(" "),
    });
  };

  const next = (correct: boolean) => {
    recordSignal(correct);
    const nextIndex = index + 1;
    if (nextIndex >= questions.length) {
      setOutcome(scoreLevelTest(signalsRef.current));
      return;
    }
    setIndex(nextIndex);
    setValue("");
    setJudge("typing");
    retriesRef.current = 0;
    hintsRef.current = 0;
    startRef.current = Date.now();
  };

  const submit = () => {
    if (judge === "correct") return;
    if (isAnswerCorrect(value, word.answer, word.accepted_answers)) {
      setJudge("correct");
      window.setTimeout(() => next(true), 420);
      return;
    }
    retriesRef.current += 1;
    hintsRef.current += 1;
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
          {index + 1} / {questions.length} · 추천 시작 레벨을 찾는 중이에요
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
          <Button variant="ghost" className="w-auto px-5" onClick={skip}>
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
