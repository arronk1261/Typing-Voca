-- v8 마이그레이션: progress 에 3요소 분리 점수 컬럼 추가 (Phase 8-2)
-- 기존 Supabase 프로젝트에 적용. (신규 셋업은 supabase/schema.sql에 이미 포함)
-- Supabase 대시보드 → SQL Editor 에 붙여넣어 한 번 실행.

alter table public.progress
  add column if not exists meaning_recall_score int;
alter table public.progress
  add column if not exists spelling_score int;
alter table public.progress
  add column if not exists pronunciation_score int;
