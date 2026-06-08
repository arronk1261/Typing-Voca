import type { WordLevel } from "@/types";

export interface LevelTestSignal {
  questionLevel: WordLevel;
  correct: boolean;
  hintsUsed: number;
  retries: number;
  responseMs: number;
  multiWord: boolean;
}

export interface LevelTestOutcome {
  level: WordLevel;
  score: number;
  ratio: number;
}

const HINT_PENALTY = 0.25;
const RETRY_PENALTY = 0.2;
const SLOW_MS = 12000;
const VERY_SLOW_MS = 20000;
const SLOW_PENALTY = 0.15;
const VERY_SLOW_PENALTY = 0.3;
const MULTIWORD_BONUS = 0.1;

const UP_THRESHOLD = 0.7;
const MID_THRESHOLD = 0.4;

function questionQuality(signal: LevelTestSignal): number {
  if (!signal.correct) return 0;
  let quality = 1;
  quality -= HINT_PENALTY * signal.hintsUsed;
  quality -= RETRY_PENALTY * signal.retries;
  if (signal.responseMs >= VERY_SLOW_MS) quality -= VERY_SLOW_PENALTY;
  else if (signal.responseMs >= SLOW_MS) quality -= SLOW_PENALTY;
  if (signal.multiWord && signal.hintsUsed === 0 && signal.retries === 0) {
    quality += MULTIWORD_BONUS;
  }
  return Math.max(0, Math.min(1, quality));
}

// 7-2: 정답 수만이 아니라 힌트·재시도·응답속도·멀티워드를 가중한 점수로 추천 시작 레벨 산출
export function scoreLevelTest(signals: LevelTestSignal[]): LevelTestOutcome {
  if (signals.length === 0) return { level: 1, score: 0, ratio: 0 };
  const totalWeight = signals.reduce((sum, s) => sum + s.questionLevel, 0);
  const earned = signals.reduce(
    (sum, s) => sum + questionQuality(s) * s.questionLevel,
    0,
  );
  const ratio = totalWeight > 0 ? earned / totalWeight : 0;
  const level: WordLevel =
    ratio >= UP_THRESHOLD ? 3 : ratio >= MID_THRESHOLD ? 2 : 1;
  return { level, score: Math.round(ratio * 100), ratio };
}

// 레거시 호환(정답 수만으로 판정) — 보조용
export function levelFromScore(correct: number): WordLevel {
  if (correct >= 4) return 3;
  if (correct >= 2) return 2;
  return 1;
}
