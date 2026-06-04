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

async function loadLevelProgress(
  supabase: SupabaseClient,
  userId: string,
  level: WordLevel,
): Promise<Progress[]> {
  const { data, error } = await supabase
    .from("progress")
    .select("*, words!inner(level)")
    .eq("user_id", userId)
    .eq("words.level", level);
  if (error || !Array.isArray(data)) return [];
  return data.map((row) => {
    const rest = { ...(row as Record<string, unknown>) };
    delete rest.words;
    return rest as unknown as Progress;
  });
}

async function applyWrite(
  supabase: SupabaseClient,
  item: QueuedWrite,
): Promise<boolean> {
  try {
    if (item.table === "user_state") {
      const { error } = await supabase
        .from("user_state")
        .upsert({ ...item.payload, updated_at: new Date().toISOString() }, {
          onConflict: "user_id",
        });
      return !error;
    }
    if (item.table === "progress") {
      if (item.payload.length === 0) return true;
      const { error } = await supabase
        .from("progress")
        .upsert(item.payload, { onConflict: "user_id,word_id" });
      return !error;
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
