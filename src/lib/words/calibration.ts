import type { WordLevel } from "@/types";

export const CALIBRATION_TARGET = 30;
const UP_RATE = 0.85;
const DOWN_RATE = 0.45;

export interface CalibrationState {
  level: WordLevel;
  levelProvisional: boolean;
  calibrationQuestions: number;
  calibrationCorrect: number;
}

export interface CalibrationInput {
  questions: number;
  correct: number;
}

// 7-3: provisional 레벨을 누적 30문항(=3세트)까지 모은 정답률로 확정/조정
export function applyCalibration(
  state: CalibrationState,
  input: CalibrationInput,
): CalibrationState {
  if (!state.levelProvisional) return state;

  const calibrationQuestions = state.calibrationQuestions + input.questions;
  const calibrationCorrect = state.calibrationCorrect + input.correct;

  if (calibrationQuestions < CALIBRATION_TARGET) {
    return { ...state, calibrationQuestions, calibrationCorrect };
  }

  const rate = calibrationQuestions > 0 ? calibrationCorrect / calibrationQuestions : 0;
  let level = state.level;
  if (rate >= UP_RATE && level < 3) level = (level + 1) as WordLevel;
  else if (rate < DOWN_RATE && level > 1) level = (level - 1) as WordLevel;

  return {
    level,
    levelProvisional: false,
    calibrationQuestions,
    calibrationCorrect,
  };
}
