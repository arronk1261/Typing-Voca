import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "❌ NEXT_PUBLIC_SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.\n" +
      "   .env.local 에 채운 뒤 실행: npm run seed",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

const wordsPath = resolve(__dirname, "../src/data/words.json");
const rows = JSON.parse(readFileSync(wordsPath, "utf-8")) as unknown[];

async function main() {
  console.log(`📦 ${rows.length}개 단어 upsert 시작...`);
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from("words").upsert(chunk, {
      onConflict: "id",
    });
    if (error) {
      console.error("❌ upsert 실패:", error.message);
      process.exit(1);
    }
    console.log(`  ✓ ${Math.min(i + chunkSize, rows.length)}/${rows.length}`);
  }

  const { count } = await supabase
    .from("words")
    .select("*", { count: "exact", head: true });
  console.log(`✅ 완료. words 테이블 총 ${count}행.`);
}

main();
