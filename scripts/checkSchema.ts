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
