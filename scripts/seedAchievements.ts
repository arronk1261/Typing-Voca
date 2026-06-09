import { createClient } from "@supabase/supabase-js";
import { ACHIEVEMENTS } from "../src/lib/achievements/catalog.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "❌ NEXT_PUBLIC_SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.\n" +
      "   .env.local 에 채운 뒤 실행: npm run seed:achievements",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

const rows = ACHIEVEMENTS.map((a) => ({
  key: a.key,
  category: a.category,
  tier: a.tier,
  title: a.title,
  description: a.description,
  icon: a.icon,
  season: a.season,
}));

async function main() {
  console.log(`🏅 ${rows.length}개 배지 카탈로그 upsert...`);
  const { error } = await supabase
    .from("achievements")
    .upsert(rows, { onConflict: "key" });
  if (error) {
    console.error("❌ upsert 실패:", error.message);
    process.exit(1);
  }
  const { count } = await supabase
    .from("achievements")
    .select("*", { count: "exact", head: true });
  console.log(`✅ 완료. achievements 테이블 총 ${count}행.`);
}

main();
