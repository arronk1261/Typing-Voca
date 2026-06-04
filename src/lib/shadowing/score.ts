export type ShadowStatus = "scored" | "retry";

export interface ShadowResult {
  status: ShadowStatus;
  score: number | null;
  stars: number;
  weakWords: string[];
}

const CONTRACTIONS: Record<string, string> = {
  "don't": "do not",
  "doesn't": "does not",
  "didn't": "did not",
  "it's": "it is",
  "i'm": "i am",
  "you're": "you are",
  "we're": "we are",
  "they're": "they are",
  "he's": "he is",
  "she's": "she is",
  "that's": "that is",
  "what's": "what is",
  "let's": "let us",
  "can't": "cannot",
  "won't": "will not",
  "isn't": "is not",
  "aren't": "are not",
  "wasn't": "was not",
  "weren't": "were not",
  "i've": "i have",
  "you've": "you have",
  "we've": "we have",
  "i'll": "i will",
  "you'll": "you will",
  "i'd": "i would",
  gonna: "going to",
  wanna: "want to",
  gotta: "got to",
};

const HOMOPHONES: Record<string, string> = {
  two: "to",
  too: "to",
  their: "there",
  theyre: "there",
  there: "there",
  your: "your",
  youre: "your",
  for: "for",
  four: "for",
  write: "right",
  right: "right",
  buy: "by",
  by: "by",
  bye: "by",
  see: "see",
  sea: "see",
  know: "no",
  no: "no",
  hear: "here",
  here: "here",
  one: "one",
  won: "one",
};

function expandToken(token: string): string[] {
  const expanded = CONTRACTIONS[token];
  if (expanded) return expanded.split(" ");
  return [token];
}

function canonical(token: string): string {
  return HOMOPHONES[token] ?? token;
}

export function clean(input: string): string[] {
  const lowered = input
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!lowered) return [];
  return lowered.split(" ").flatMap(expandToken).filter(Boolean);
}

export function charSim(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m && !n) return 1;
  if (!m || !n) return 0;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => [
    i,
    ...Array<number>(n).fill(0),
  ]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return 1 - dp[m][n] / Math.max(m, n);
}

export function phonetic(word: string): string {
  const head = word[0] ?? "";
  const code = word
    .slice(1)
    .replace(/[hw]/g, "")
    .replace(/[aeiouy]/g, "0")
    .replace(/[bfpv]/g, "1")
    .replace(/[cgjkqsxz]/g, "2")
    .replace(/[dt]/g, "3")
    .replace(/[l]/g, "4")
    .replace(/[mn]/g, "5")
    .replace(/[r]/g, "6")
    .replace(/(.)\1+/g, "$1")
    .replace(/0/g, "");
  return (head + code).slice(0, 4).padEnd(4, "0");
}

export function wordScore(a: string, b: string): number {
  if (a === b) return 1;
  if (canonical(a) === canonical(b)) return 0.95;
  const cs = charSim(a, b);
  const ps = phonetic(a) === phonetic(b) ? 0.8 : 0;
  return Math.max(cs, ps);
}

export function starsFromScore(score: number): number {
  return score >= 85 ? 3 : score >= 60 ? 2 : 1;
}

export function scoreShadowing(
  original: string,
  spoken: string,
  confidence = 1,
): ShadowResult {
  if (!spoken || !spoken.trim() || confidence < 0.3) {
    return { status: "retry", score: null, stars: 0, weakWords: [] };
  }

  const orig = clean(original);
  const spok = clean(spoken);
  if (orig.length === 0) {
    return { status: "retry", score: null, stars: 0, weakWords: [] };
  }

  const used = new Array(spok.length).fill(false);
  const weakWords: string[] = [];
  let sum = 0;

  for (const ow of orig) {
    let best = 0;
    let bestIdx = -1;
    spok.forEach((sw, i) => {
      if (used[i]) return;
      const s = wordScore(ow, sw);
      if (s > best) {
        best = s;
        bestIdx = i;
      }
    });
    if (bestIdx >= 0 && best >= 0.5) used[bestIdx] = true;
    if (best < 0.6) weakWords.push(ow);
    sum += best;
  }

  const extra = used.filter((u) => !u).length;
  const raw = sum / orig.length;
  const penalty = Math.min(0.15, extra * 0.03);
  const score = Math.max(0, Math.round((raw - penalty) * 100));

  return {
    status: "scored",
    score,
    stars: starsFromScore(score),
    weakWords,
  };
}
