import type { WordChunkType, WordLevel } from "@/types";

export interface LevelTestSignal {
  questionLevel: WordLevel;
  correct: boolean;
  hintsUsed: number;
  retries: number;
  responseMs: number;
  multiWord: boolean;
  chunkType?: WordChunkType;
}

export interface LevelTestOutcome {
  level: WordLevel;
  score: number;
  ratio: number;
  // 9-B3: 단일 ratio 한 방이 아니라 레벨별·청크유형별 하위 점수와 피드백을 함께 산출
  levelRatios: Record<WordLevel, number>;
  chunkScores: Partial<Record<WordChunkType, number>>;
  feedback: string;
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

function averageQuality(signals: LevelTestSignal[]): number {
  if (signals.length === 0) return 0;
  return signals.reduce((sum, s) => sum + questionQuality(s), 0) / signals.length;
}

const MULTIWORD_CHUNKS: WordChunkType[] = [
  "collocation",
  "phrasal_verb",
  "idiom",
  "sentence_frame",
];
const AXIS_GAP = 0.25;

// 9-B3: 단어(single_word) 대 덩어리표현(연어·숙어 등) 강약을 비교한 격려 피드백
function buildFeedback(chunkScores: Partial<Record<WordChunkType, number>>): string {
  const single = chunkScores.single_word;
  const multiVals = MULTIWORD_CHUNKS.map((k) => chunkScores[k]).filter(
    (n): n is number => typeof n === "number",
  );
  if (typeof single !== "number" || multiVals.length === 0) {
    return "단어와 표현 감각을 함께 키워가요. 학습하면서 딱 맞게 조정돼요 🙂";
  }
  const multi = multiVals.reduce((a, b) => a + b, 0) / multiVals.length;
  if (single - multi >= AXIS_GAP) {
    return "단어 실력은 탄탄해요! 연어·숙어 같은 덩어리 표현을 조금만 더 연습하면 회화가 확 트여요.";
  }
  if (multi - single >= AXIS_GAP) {
    return "표현 감각이 좋아요! 기본 단어 철자를 다지면 더 안정적으로 말할 수 있어요.";
  }
  return "단어와 덩어리 표현이 고르게 균형 잡혀 있어요. 좋은 출발점이에요!";
}

// 7-2/9-B3: 가중 점수로 추천 레벨 + 레벨별·청크별 하위 점수와 피드백 산출
export function scoreLevelTest(signals: LevelTestSignal[]): LevelTestOutcome {
  const emptyRatios: Record<WordLevel, number> = { 1: 0, 2: 0, 3: 0 };
  if (signals.length === 0) {
    return {
      level: 1,
      score: 0,
      ratio: 0,
      levelRatios: emptyRatios,
      chunkScores: {},
      feedback: buildFeedback({}),
    };
  }
  const totalWeight = signals.reduce((sum, s) => sum + s.questionLevel, 0);
  const earned = signals.reduce(
    (sum, s) => sum + questionQuality(s) * s.questionLevel,
    0,
  );
  const ratio = totalWeight > 0 ? earned / totalWeight : 0;
  const level: WordLevel =
    ratio >= UP_THRESHOLD ? 3 : ratio >= MID_THRESHOLD ? 2 : 1;

  const levelRatios: Record<WordLevel, number> = { ...emptyRatios };
  for (const lv of [1, 2, 3] as WordLevel[]) {
    levelRatios[lv] = averageQuality(
      signals.filter((s) => s.questionLevel === lv),
    );
  }

  const chunkScores: Partial<Record<WordChunkType, number>> = {};
  const byChunk = new Map<WordChunkType, LevelTestSignal[]>();
  for (const s of signals) {
    if (!s.chunkType) continue;
    const list = byChunk.get(s.chunkType) ?? [];
    list.push(s);
    byChunk.set(s.chunkType, list);
  }
  for (const [chunk, list] of byChunk) {
    chunkScores[chunk] = averageQuality(list);
  }

  return {
    level,
    score: Math.round(ratio * 100),
    ratio,
    levelRatios,
    chunkScores,
    feedback: buildFeedback(chunkScores),
  };
}

// 레거시 호환(정답 수만으로 판정) — 보조용
export function levelFromScore(correct: number): WordLevel {
  if (correct >= 4) return 3;
  if (correct >= 2) return 2;
  return 1;
}
