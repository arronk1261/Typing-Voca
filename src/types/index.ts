export type WordLevel = 1 | 2 | 3;

export type WordFrequency = "high" | "mid" | "low";
export type WordChunkType =
  | "single_word"
  | "collocation"
  | "phrasal_verb"
  | "idiom"
  | "sentence_frame";
export type WordDifficultyAxis = "spelling" | "meaning" | "usage" | "pronunciation";

export interface Word {
  id: number;
  category: string;
  level: WordLevel;
  cefr: string;
  answer: string;
  sentence_en: string;
  sentence_ko: string;
  meaning: string;
  tts_text: string;
  // v6 콘텐츠 태그 (docs/word-content-spec-v6.md)
  display_sentence?: string;
  frequency?: WordFrequency;
  chunk_type?: WordChunkType;
  difficulty_axis?: WordDifficultyAxis;
  use_case?: string[];
  // 7-4: 정답으로 함께 인정할 표현 변형(축약/대체 표현 등)
  accepted_answers?: string[];
}

export type StudyStage = "typing" | "shadowing";

export type ShadowMode = "full" | "listening" | "typingOnly";

export interface QuestionResult {
  wordId: number;
  firstTryCorrect: boolean;
  heartsDepleted: boolean;
  attempts: number;
  shadowStars: number | null;
  shadowScore: number | null;
  shadowSkipped: boolean;
  // 8-1: 졸업 정책(레벨/청크 유형별)을 위해 문항 메타를 함께 기록
  wordLevel?: WordLevel;
  wordChunkType?: WordChunkType;
  // 9-A1: 발음 단계 환경(모드)을 기록 — typingOnly는 발음 없이도 졸업 가능
  shadowMode?: ShadowMode;
}

export interface UserState {
  user_id: string;
  level: WordLevel;
  streak: number;
  last_study_date: string | null;
  total_learned: number;
  preferred_categories: string[];
  onboarded: boolean;
  level_provisional: boolean;
  calibration_questions: number;
  calibration_correct: number;
  updated_at?: string;
}

export interface Progress {
  user_id: string;
  word_id: number;
  seen_count: number;
  first_try_correct: boolean | null;
  shadow_stars: number | null;
  pass_count: number;
  in_review: boolean;
  last_seen: string | null;
  next_due: string | null;
  // 8-2: 3요소 분리 기록 (타이핑=뜻/철자, 섀도잉=발음)
  meaning_recall_score: number | null;
  spelling_score: number | null;
  pronunciation_score: number | null;
  updated_at?: string;
}

export interface StudySession {
  user_id: string;
  study_date: string;
  level: WordLevel;
  categories: string[];
  words_count: number;
  correct_first_try: number;
  avg_stars: number | null;
  avg_score: number | null;
  review_count: number;
}

export function isWord(value: unknown): value is Word {
  if (typeof value !== "object" || value === null) return false;
  const w = value as Record<string, unknown>;
  return (
    typeof w.id === "number" &&
    typeof w.category === "string" &&
    (w.level === 1 || w.level === 2 || w.level === 3) &&
    typeof w.answer === "string" &&
    typeof w.sentence_en === "string" &&
    typeof w.sentence_ko === "string" &&
    typeof w.meaning === "string" &&
    typeof w.tts_text === "string"
  );
}
