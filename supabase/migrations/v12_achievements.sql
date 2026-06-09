-- v12 마이그레이션: 동기부여 시스템 (Phase 10 — 애플 활동 스타일)
-- 배지 카탈로그(공개 읽기 전용) + 유저 획득 배지(본인 RLS) + 오늘의 학습 링(본인 RLS)
-- + user_state 확장(streak_freezes / xp / best_streak).
-- 기존 Supabase 프로젝트에 적용. (신규 셋업은 supabase/schema.sql에 이미 포함)
-- Supabase 대시보드 → SQL Editor 에 붙여넣어 한 번 실행.

-- 1) user_state 확장: 동결권 / 경험치 / 역대 최장 연속
alter table public.user_state
  add column if not exists streak_freezes int not null default 0;
alter table public.user_state
  add column if not exists xp int not null default 0;
alter table public.user_state
  add column if not exists best_streak int not null default 0;

-- 2) 배지 카탈로그 (words처럼 공개 읽기 전용)
create table if not exists public.achievements (
  key         text primary key,
  category    text not null,
  tier        int  not null default 1,
  title       text not null,
  description text not null,
  icon        text not null,
  season      text,
  criteria    jsonb not null default '{}'::jsonb
);
alter table public.achievements enable row level security;
drop policy if exists "public read achievements" on public.achievements;
create policy "public read achievements" on public.achievements
  for select using (true);
-- INSERT/UPDATE/DELETE 정책 없음 → anon 키로는 수정 불가(시드는 Service Role 전용)

-- 3) 유저가 획득한 배지 (본인 행만)
create table if not exists public.user_achievements (
  user_id          uuid not null references auth.users(id) on delete cascade,
  achievement_key  text not null,
  earned_at        timestamptz not null default now(),
  progress_snapshot jsonb,
  primary key (user_id, achievement_key)
);
create index if not exists user_achievements_user_idx
  on public.user_achievements (user_id, earned_at);
alter table public.user_achievements enable row level security;
drop policy if exists "own achievements" on public.user_achievements;
create policy "own achievements" on public.user_achievements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4) 오늘의 학습 링 (본인 행만, 하루 1행)
create table if not exists public.daily_rings (
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null default current_date,
  learn_goal  int not null default 10,
  learn_done  int not null default 0,
  review_goal int not null default 0,
  review_done int not null default 0,
  pron_goal   int not null default 0,
  pron_done   int not null default 0,
  primary key (user_id, date)
);
alter table public.daily_rings enable row level security;
drop policy if exists "own rings" on public.daily_rings;
create policy "own rings" on public.daily_rings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
