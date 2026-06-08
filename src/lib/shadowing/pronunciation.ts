// 9-C3/9-1b: 한국어 화자가 자주 어려워하는 발음 요소를 표면형에서 파생 추정(별도 재태깅 없이).
const VOWELS = new Set(["a", "e", "i", "o", "u"]);

export type PhonemeFeature = "th" | "r_l" | "v_f" | "z" | "cluster";

export const PHONEME_LABEL: Record<PhonemeFeature, string> = {
  th: "th 발음 (the·think)",
  r_l: "r / l 구분",
  v_f: "v / f 발음",
  z: "z 발음 (zoo·busy)",
  cluster: "자음군 (str·spl 등)",
};

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

// 단어/문장에 들어있는 까다로운 발음 요소 태그 목록
export function pronunciationFeatures(text: string): PhonemeFeature[] {
  const word = text.toLowerCase();
  const features: PhonemeFeature[] = [];
  if (word.includes("th")) features.push("th"); // 한국어에 없는 치간음
  if (word.includes("r") && word.includes("l")) features.push("r_l"); // r/l 구분
  if (/[vf]/.test(word)) features.push("v_f"); // v/f: b/p 혼동
  if (/z/.test(word)) features.push("z"); // z 계열
  if (hasConsonantCluster(word)) features.push("cluster"); // 자음군
  return features;
}

export function pronunciationDifficulty(text: string): number {
  return pronunciationFeatures(text).length;
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

export interface WeakWordStat {
  word: string;
  count: number;
  features: PhonemeFeature[];
}

// 9-1a: 기간 누적 약점 단어를 빈도×난이도로 랭킹 + 음소 feature 집계
export function rankWeakWords(weakWords: string[], max = 5): WeakWordStat[] {
  const counts = new Map<string, { display: string; count: number }>();
  for (const raw of weakWords) {
    const word = raw.trim();
    const key = word.toLowerCase();
    if (!key) continue;
    const entry = counts.get(key) ?? { display: word, count: 0 };
    entry.count += 1;
    counts.set(key, entry);
  }
  return [...counts.values()]
    .map((e) => ({
      word: e.display,
      count: e.count,
      features: pronunciationFeatures(e.display),
    }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        pronunciationDifficulty(b.word) - pronunciationDifficulty(a.word) ||
        b.word.length - a.word.length,
    )
    .slice(0, max);
}

// 약점 단어들이 어떤 발음 요소에 몰려 있는지 집계(많은 순)
export function topPhonemeFeatures(weakWords: string[]): PhonemeFeature[] {
  const tally = new Map<PhonemeFeature, number>();
  for (const w of weakWords) {
    for (const f of pronunciationFeatures(w)) {
      tally.set(f, (tally.get(f) ?? 0) + 1);
    }
  }
  return [...tally.entries()].sort((a, b) => b[1] - a[1]).map(([f]) => f);
}
