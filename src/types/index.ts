export type WordLevel = 1 | 2 | 3;

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
}

export type StudyStage = "typing" | "shadowing";

export interface QuestionResult {
  wordId: number;
  firstTryCorrect: boolean;
  heartsDepleted: boolean;
  attempts: number;
  shadowStars: number | null;
  shadowScore: number | null;
  shadowSkipped: boolean;
}

export interface UserState {
  user_id: string;
  level: WordLevel;
  streak: number;
  last_study_date: string | null;
  total_learned: number;
  preferred_categories: string[];
  onboarded: boolean;
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
