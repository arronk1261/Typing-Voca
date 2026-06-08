-- v9 마이그레이션: study_sessions 에 약점 단어 배열 추가 (Phase 9-1a 주간 발음 리포트)
-- 기존 Supabase 프로젝트에 적용. (신규 셋업은 supabase/schema.sql에 이미 포함)
-- Supabase 대시보드 → SQL Editor 에 붙여넣어 한 번 실행.

alter table public.study_sessions
  add column if not exists weak_words text[] not null default '{}';
