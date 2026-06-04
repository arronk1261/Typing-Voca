import type { StudySession } from "@/types";

const SESSIONS_KEY = "tv:stats:sessions:guest";
const MAX_SESSIONS = 400;

export function readLocalSessions(): StudySession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SESSIONS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as StudySession[]) : [];
  } catch {
    return [];
  }
}

export function appendLocalSession(session: StudySession): void {
  if (typeof window === "undefined") return;
  try {
    const next = [...readLocalSessions(), session].slice(-MAX_SESSIONS);
    window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(next));
  } catch {
    /* quota or disabled — ignore */
  }
}
