export interface StagedHint {
  label: string;
  text: string;
}

export function answerWords(answer: string): string[] {
  return answer.trim().split(/\s+/).filter(Boolean);
}

function initials(words: string[]): string {
  return words.map((word) => word.charAt(0).toUpperCase()).join(" ");
}

// 7-5: 오답 단계별 힌트 — 1회차 첫 글자 → 2회차 단어/글자 수 → 3회차 청크 단위
export function stagedHint(answer: string, stage: number): StagedHint {
  const words = answerWords(answer);
  const multiWord = words.length > 1;

  if (stage <= 1) {
    return { label: "첫 글자", text: answer.charAt(0).toUpperCase() };
  }

  if (stage === 2) {
    if (multiWord) {
      return {
        label: "단어 수",
        text: `${words.length}개 단어 · ${initials(words)}`,
      };
    }
    return {
      label: "글자 수",
      text: `${answer.length}글자 · ${answer.slice(0, Math.min(2, answer.length))}…`,
    };
  }

  if (multiWord) {
    const chunk = words
      .map((word, i) => (i === 0 ? word : "_".repeat(word.length)))
      .join(" ");
    return { label: "청크", text: chunk };
  }

  return {
    label: "힌트",
    text: `${answer.slice(0, Math.ceil(answer.length / 2))}…`,
  };
}
