const KEY = "tv:window:recent";
const CAP = 5;

export interface SessionWindowEntry {
  total: number;
  firstTryCorrect: number;
  reviewCount: number;
  starsSum: number;
  starsCount: number;
}

export function readRecentWindow(): SessionWindowEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as SessionWindowEntry[]) : [];
  } catch {
    return [];
  }
}

export function appendRecentWindow(entry: SessionWindowEntry): SessionWindowEntry[] {
  const next = [...readRecentWindow(), entry].slice(-CAP);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* quota or disabled — ignore */
    }
  }
  return next;
}
