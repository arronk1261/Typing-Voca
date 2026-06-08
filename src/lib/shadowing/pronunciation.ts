// 9-C3: 한국어 화자가 자주 어려워하는 발음 요소를 표면형에서 파생 추정(별도 재태깅 없이).
const VOWELS = new Set(["a", "e", "i", "o", "u"]);

function hasConsonantCluster(word: string): boolean {
  let run = 0;
  for (const ch of word) {
    if (/[a-z]/.test(ch) && !VOWELS.has(ch)) {
      run += 1;
      if (run >= 3) return true;
    } else {
      run = 0;
    }
  }
  return false;
}

export function pronunciationDifficulty(text: string): number {
  const word = text.toLowerCase();
  let score = 0;
  if (word.includes("th")) score += 1; // th: 한국어에 없는 치간음
  if (word.includes("r") && word.includes("l")) score += 1; // r/l 구분
  if (/[vf]/.test(word)) score += 1; // v/f: b/p 혼동
  if (/[zʒ]/.test(word)) score += 1; // z 계열
  if (hasConsonantCluster(word)) score += 1; // 자음군
  return score;
}

// 발화 약점 단어를 발음 난이도 순으로 정리한 "발음 포커스" 목록
export function focusWords(weakWords: string[], max = 3): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const w of weakWords) {
    const key = w.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(w.trim());
  }
  return unique
    .sort(
      (a, b) =>
        pronunciationDifficulty(b) - pronunciationDifficulty(a) ||
        b.length - a.length,
    )
    .slice(0, max);
}
