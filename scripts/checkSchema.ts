import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("❌ env(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) 필요");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

const CHECKS: { table: string; columns: string[]; migration: string }[] = [
  {
    table: "user_state",
    columns: ["level_provisional", "calibration_questions", "calibration_correct"],
    migration: "v7_user_state_calibration.sql",
  },
  {
    table: "progress",
    columns: ["meaning_recall_score", "spelling_score", "pronunciation_score"],
    migration: "v8_progress_components.sql",
  },
  {
    table: "progress",
    columns: ["pron_pass_count"],
    migration: "v10_progress_pron_pass.sql",
  },
  {
    table: "progress",
    columns: ["ease_factor", "interval_days"],
    migration: "v11_sm2_scheduler.sql",
  },
  {
    table: "review_logs",
    columns: ["grade", "ease_factor", "interval_days", "reps"],
    migration: "v11_sm2_scheduler.sql",
  },
  {
    table: "user_state",
    columns: ["streak_freezes", "xp", "best_streak"],
    migration: "v12_achievements.sql",
  },
  {
    table: "achievements",
    columns: ["key", "category", "tier", "season"],
    migration: "v12_achievements.sql",
  },
  {
    table: "user_achievements",
    columns: ["achievement_key", "earned_at"],
    migration: "v12_achievements.sql",
  },
  {
    table: "daily_rings",
    columns: ["learn_goal", "learn_done", "pron_done"],
    migration: "v12_achievements.sql",
  },
];

async function main() {
  let missing = false;
  for (const c of CHECKS) {
    const { error } = await supabase.from(c.table).select(c.columns.join(",")).limit(1);
    if (!error) {
      console.log(`✅ ${c.table}: ${c.columns.join(", ")}`);
    } else if (error.message.includes("does not exist") || error.code === "42703") {
      console.log(`⚠️ ${c.table}: 컬럼 없음 — supabase/migrations/${c.migration} 적용 필요`);
      missing = true;
    } else {
      console.log(`❓ ${c.table}: 확인 실패 — ${error.message}`);
      missing = true;
    }
  }
  if (missing) process.exit(2);
}

void main();
