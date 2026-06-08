import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import {
  enqueueWrite,
  readQueue,
  setQueue,
  type QueuedWrite,
} from "@/lib/sync/offlineQueue";
import type { Progress, StudySession, UserState, WordLevel } from "@/types";

export interface LoadedUserData {
  userState: UserState | null;
  progress: Progress[];
}

export async function loadUserData(userId: string): Promise<LoadedUserData> {
  const supabase = getSupabase();
  if (!supabase) return { userState: null, progress: [] };

  const stateRes = await supabase
    .from("user_state")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  const userState = (stateRes.data as UserState | null) ?? null;
  const level = (userState?.level ?? 1) as WordLevel;
  const progress = await loadLevelProgress(supabase, userId, level);

  return { userState, progress };
}

function stripJoin(rows: unknown[]): Progress[] {
  return rows.map((row) => {
    const rest = { ...(row as Record<string, unknown>) };
    delete rest.words;
    return rest as unknown as Progress;
  });
}

// 8-4: 현재 레벨 progress + (레벨 무관) in_review=true 복습 대상까지 로드해 병합
async function loadLevelProgress(
  supabase: SupabaseClient,
  userId: string,
  level: WordLevel,
): Promise<Progress[]> {
  const [levelRes, reviewRes] = await Promise.all([
    supabase
      .from("progress")
      .select("*, words!inner(level)")
      .eq("user_id", userId)
      .eq("words.level", level),
    supabase
      .from("progress")
      .select("*")
      .eq("user_id", userId)
      .eq("in_review", true),
  ]);

  const byId = new Map<number, Progress>();
  if (Array.isArray(levelRes.data)) {
    for (const row of stripJoin(levelRes.data)) byId.set(row.word_id, row);
  }
  if (Array.isArray(reviewRes.data)) {
    for (const row of stripJoin(reviewRes.data)) byId.set(row.word_id, row);
  }
  return [...byId.values()];
}

function isMissingColumn(error: { code?: string; message?: string }): boolean {
  return error.code === "42703" || (error.message ?? "").includes("does not exist");
}

function omitKeys<T extends Record<string, unknown>>(
  obj: T,
  keys: string[],
): Partial<T> {
  const clone: Record<string, unknown> = { ...obj };
  for (const key of keys) delete clone[key];
  return clone as Partial<T>;
}

async function applyWrite(
  supabase: SupabaseClient,
  item: QueuedWrite,
): Promise<boolean> {
  try {
    if (item.table === "user_state") {
      const payload = { ...item.payload, updated_at: new Date().toISOString() };
      const { error } = await supabase
        .from("user_state")
        .upsert(payload, { onConflict: "user_id" });
      if (!error) return true;
      // v7 마이그레이션 전이면 보정 컬럼이 없으므로 핵심 필드만 다시 저장(무중단)
      if (isMissingColumn(error)) {
        const core = omitKeys(payload, [
          "level_provisional",
          "calibration_questions",
          "calibration_correct",
        ]);
        const retry = await supabase
          .from("user_state")
          .upsert(core, { onConflict: "user_id" });
        return !retry.error;
      }
      return false;
    }
    if (item.table === "progress") {
      if (item.payload.length === 0) return true;
      const { error } = await supabase
        .from("progress")
        .upsert(item.payload, { onConflict: "user_id,word_id" });
      if (!error) return true;
      // v8 마이그레이션 전이면 3요소 점수 컬럼이 없으므로 제거 후 재저장(무중단)
      if (isMissingColumn(error)) {
        const stripped = item.payload.map((row) =>
          omitKeys(row as unknown as Record<string, unknown>, [
            "meaning_recall_score",
            "spelling_score",
            "pronunciation_score",
          ]),
        );
        const retry = await supabase
          .from("progress")
          .upsert(stripped, { onConflict: "user_id,word_id" });
        return !retry.error;
      }
      return false;
    }
    const { error } = await supabase.from("study_sessions").insert(item.payload);
    return !error;
  } catch {
    return false;
  }
}

export interface LoadedStatsData {
  sessions: StudySession[];
  progress: Progress[];
}

export async function loadStatsData(userId: string): Promise<LoadedStatsData> {
  const supabase = getSupabase();
  if (!supabase) return { sessions: [], progress: [] };

  const [sessionsRes, progressRes] = await Promise.all([
    supabase
      .from("study_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("study_date", { ascending: true }),
    supabase.from("progress").select("*").eq("user_id", userId),
  ]);

  const sessions = Array.isArray(sessionsRes.data)
    ? (sessionsRes.data as StudySession[])
    : [];
  const progress = Array.isArray(progressRes.data)
    ? (progressRes.data as Progress[])
    : [];
  return { sessions, progress };
}

export async function syncNow(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;

  const remaining: QueuedWrite[] = [];
  for (const item of readQueue()) {
    const ok = await applyWrite(supabase, item);
    if (!ok) remaining.push(item);
  }
  setQueue(remaining);
}

export async function saveUserState(
  patch: Partial<UserState> & { user_id: string },
): Promise<void> {
  enqueueWrite({ table: "user_state", payload: patch });
  await syncNow();
}

export async function saveProgress(rows: Progress[]): Promise<void> {
  if (rows.length === 0) return;
  enqueueWrite({ table: "progress", payload: rows });
  await syncNow();
}

export async function saveStudySession(session: StudySession): Promise<void> {
  enqueueWrite({ table: "study_sessions", payload: session });
  await syncNow();
}

export function registerOnlineFlush(): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => void syncNow();
  window.addEventListener("online", handler);
  void syncNow();
  return () => window.removeEventListener("online", handler);
}
