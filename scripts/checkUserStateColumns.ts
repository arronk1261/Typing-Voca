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

const COLUMNS = ["level_provisional", "calibration_questions", "calibration_correct"];

async function main() {
  const { error } = await supabase
    .from("user_state")
    .select(COLUMNS.join(","))
    .limit(1);

  if (!error) {
    console.log("✅ v7 컬럼 존재함:", COLUMNS.join(", "));
    return;
  }
  if (error.message.includes("does not exist") || error.code === "42703") {
    console.log("⚠️ v7 컬럼 없음 — supabase/migrations/v7_user_state_calibration.sql 적용 필요");
    process.exit(2);
  }
  console.log("❓ 확인 실패:", error.message);
  process.exit(1);
}

void main();
