-- v10 마이그레이션: progress 에 발음 졸업 트랙 컬럼 추가 (Phase 9-3d)
-- pass_count는 '타이핑(뜻·철자) 졸업', pron_pass_count는 '발음 졸업'을 별도 누적한다.
-- 기존 Supabase 프로젝트에 적용. (신규 셋업은 supabase/schema.sql에 이미 포함)
-- Supabase 대시보드 → SQL Editor 에 붙여넣어 한 번 실행.

alter table public.progress
  add column if not exists pron_pass_count int not null default 0;
