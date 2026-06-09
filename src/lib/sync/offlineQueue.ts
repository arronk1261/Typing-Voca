import type {
  DailyRing,
  Progress,
  ReviewLog,
  StudySession,
  UserAchievement,
  UserState,
} from "@/types";

const QUEUE_KEY = "tv:sync:queue";

export type QueuedWrite =
  | { table: "user_state"; payload: Partial<UserState> & { user_id: string } }
  | { table: "progress"; payload: Progress[] }
  | { table: "study_sessions"; payload: StudySession }
  | { table: "review_logs"; payload: ReviewLog[] }
  | { table: "user_achievements"; payload: UserAchievement[] }
  | { table: "daily_rings"; payload: DailyRing };

function read(): QueuedWrite[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as QueuedWrite[]) : [];
  } catch {
    return [];
  }
}

function write(items: QueuedWrite[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

export function enqueueWrite(item: QueuedWrite): void {
  write([...read(), item]);
}

export function readQueue(): QueuedWrite[] {
  return read();
}

export function clearQueue(): void {
  write([]);
}

export function setQueue(items: QueuedWrite[]): void {
  write(items);
}
