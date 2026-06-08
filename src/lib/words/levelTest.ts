import anchors from "@/data/anchorTest.json";
import { isWord, type Word } from "@/types";

const ANCHOR_QUESTIONS: Word[] = (anchors as unknown[]).filter(isWord);

// 7-1: 랜덤 추출 대신 검증된 앵커 문항(레벨별 고정 분포)으로 매 진입 동일 난이도 보장
export async function pickLevelTest(): Promise<Word[]> {
  return ANCHOR_QUESTIONS;
}

export { scoreLevelTest, levelFromScore } from "@/lib/words/levelScore";
export type { LevelTestSignal, LevelTestOutcome } from "@/lib/words/levelScore";
