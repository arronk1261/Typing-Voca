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
  // 9-C3: 발화에서 약했던 단어(발음 포커스용, 세션 내 메모리에서만 사용)
  weakWords?: string[];
  // 9-3c: 일반 학습 품질 신호 — 힌트 사용량·응답시간(뜻 회상 점수 정밀화)
  hintsUsed?: number;
  responseMs?: number;
  answerRevealed?: boolean;
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
  // 9-3d: pass_count는 '타이핑(뜻·철자) 졸업 트랙', pron_pass_count는 '발음 졸업 트랙'(별도 누적)
  // 9-4: pass_count는 SM-2의 연속 통과 횟수(n) 역할도 겸함
  pass_count: number;
  pron_pass_count: number;
  // 9-4: SM-2 간격 스케줄 상태(타이핑 트랙) — 난이도계수 EF와 직전 간격(일)
  ease_factor: number;
  interval_days: number;
  in_review: boolean;
  last_seen: string | null;
  next_due: string | null;
  // 8-2: 3요소 분리 기록 (타이핑=뜻/철자, 섀도잉=발음)
  meaning_recall_score: number | null;
  spelling_score: number | null;
  pronunciation_score: number | null;
  updated_at?: string;
}

// 9-4: per-review 로그 — SM-2 운영 분석·향후 FSRS 파라미터 학습의 원천
export interface ReviewLog {
  user_id: string;
  word_id: number;
  grade: number; // SM-2 q: 2=Again 3=Hard 4=Good 5=Easy
  elapsed_days: number; // 직전 학습 이후 경과일(없으면 0)
  ease_factor: number;
  interval_days: number;
  reps: number;
  shadow_stars: number | null;
  reviewed_at: string;
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
  // 9-1a: 이번 세션 섀도잉 약점 단어(주간 발음 리포트 원천)
  weak_words?: string[];
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
