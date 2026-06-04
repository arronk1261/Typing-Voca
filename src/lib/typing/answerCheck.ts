export const BLANK_TOKEN = "___";

export function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isAnswerCorrect(input: string, answer: string): boolean {
  return normalizeAnswer(input) === normalizeAnswer(answer);
}

export interface SentenceParts {
  before: string;
  after: string;
}

export function splitSentence(sentenceEn: string): SentenceParts {
  const index = sentenceEn.indexOf(BLANK_TOKEN);
  if (index === -1) return { before: sentenceEn, after: "" };
  return {
    before: sentenceEn.slice(0, index),
    after: sentenceEn.slice(index + BLANK_TOKEN.length),
  };
}

export function firstLetterHint(answer: string): string {
  return answer.charAt(0).toUpperCase();
}
