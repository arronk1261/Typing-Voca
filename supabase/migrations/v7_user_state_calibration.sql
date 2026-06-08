-- v7 마이그레이션: user_state 에 임시 레벨 자동 보정 컬럼 추가 (Phase 7-3)
-- 기존 Supabase 프로젝트에 적용. (신규 셋업은 supabase/schema.sql에 이미 포함)
-- Supabase 대시보드 → SQL Editor 에 붙여넣어 한 번 실행.

alter table public.user_state
  add column if not exists level_provisional boolean not null default true;
alter table public.user_state
  add column if not exists calibration_questions int not null default 0;
alter table public.user_state
  add column if not exists calibration_correct int not null default 0;
