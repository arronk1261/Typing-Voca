import type { SupabaseClient } from "@supabase/supabase-js";

export async function ensureUserState(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("user_state")
    .upsert(
      { user_id: userId },
      { onConflict: "user_id", ignoreDuplicates: true },
    );
  if (error && process.env.NODE_ENV === "development") {
    console.error("ensureUserState failed:", error.message);
  }
}
