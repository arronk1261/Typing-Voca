export const BLANK_TOKEN = "___";

const CONTRACTIONS: Record<string, string> = {
  "i'll": "i will",
  "you'll": "you will",
  "we'll": "we will",
  "they'll": "they will",
  "he'll": "he will",
  "she'll": "she will",
  "it'll": "it will",
  "i'm": "i am",
  "you're": "you are",
  "we're": "we are",
  "they're": "they are",
  "he's": "he is",
  "she's": "she is",
  "it's": "it is",
  "that's": "that is",
  "what's": "what is",
  "let's": "let us",
  "i've": "i have",
  "you've": "you have",
  "we've": "we have",
  "they've": "they have",
  "i'd": "i would",
  "you'd": "you would",
  "isn't": "is not",
  "aren't": "are not",
  "wasn't": "was not",
  "weren't": "were not",
  "don't": "do not",
  "doesn't": "does not",
  "didn't": "did not",
  "won't": "will not",
  "wouldn't": "would not",
  "shouldn't": "should not",
  "couldn't": "could not",
  "can't": "can not",
  "haven't": "have not",
  "hasn't": "has not",
  "hadn't": "had not",
};

export function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

// 7-4: 축약/관사/하이픈/아포스트로피 차이를 흡수한 정규형 (핵심 철자 차이는 유지)
export function canonicalAnswer(value: string): string {
  let text = value.toLowerCase().trim();
  text = text.replace(/[‘’ʼ`´]/g, "'");
  text = text.replace(/[-–—]/g, " ");
  text = text.replace(/[^a-z0-9' ]/g, "");
  text = text.replace(/\s+/g, " ").trim();
  text = text
    .split(" ")
    .map((token) => CONTRACTIONS[token] ?? token)
    .join(" ");
  text = text.replace(/\bcannot\b/g, "can not");
  text = text.replace(/'/g, "");
  text = text
    .split(" ")
    .map((token) => (token === "an" ? "a" : token))
    .join(" ");
  return text.replace(/\s+/g, " ").trim();
}

export function isAnswerCorrect(
  input: string,
  answer: string,
  acceptedAnswers?: string[],
): boolean {
  const target = canonicalAnswer(input);
  if (target.length === 0) return false;
  if (target === canonicalAnswer(answer)) return true;
  if (acceptedAnswers && acceptedAnswers.length > 0) {
    return acceptedAnswers.some((variant) => canonicalAnswer(variant) === target);
  }
  return false;
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

// 9-4 fix: 여러 단어 정답(공백 포함)에서 사용자가 공백을 직접 안 쳐도 정답 슬롯에 맞춰
// 글자를 흘려넣고 정답의 공백은 자동으로 채운다. (예: "straightahead" → "straight ahead")
export function fillTypedSlots(answer: string, raw: string): string {
  const letters = raw.replace(/\s+/g, "");
  let out = "";
  let li = 0;
  for (const ch of answer) {
    if (li >= letters.length) break;
    if (ch === " ") {
      out += " ";
    } else {
      out += letters[li];
      li += 1;
    }
  }
  return out;
}
