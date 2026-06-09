-- v11 마이그레이션: SM-2 간격 스케줄러 + 리뷰 로그 (Phase 9-4)
-- progress.pass_count는 SM-2의 연속 통과 횟수(n)를 겸하고, ease_factor·interval_days가 추가된다.
-- review_logs는 SM-2 운영 분석 및 향후 FSRS 파라미터 학습의 원천이다.
-- 기존 Supabase 프로젝트에 적용. (신규 셋업은 supabase/schema.sql에 이미 포함)
-- Supabase 대시보드 → SQL Editor 에 붙여넣어 한 번 실행.

alter table public.progress
  add column if not exists ease_factor real not null default 2.5;
alter table public.progress
  add column if not exists interval_days int not null default 0;

create table if not exists public.review_logs (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  word_id       int  not null references public.words(id),
  reviewed_at   timestamptz not null default now(),
  grade         smallint not null,
  elapsed_days  int  not null default 0,
  ease_factor   real not null,
  interval_days int  not null,
  reps          int  not null,
  shadow_stars  int
);
create index if not exists review_logs_user_idx on public.review_logs (user_id, reviewed_at);

alter table public.review_logs enable row level security;
drop policy if exists "own review logs" on public.review_logs;
create policy "own review logs" on public.review_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
