-- Typing-Voca Supabase schema (plan.md 6.2 / 6.4)
-- Supabase 대시보드 → SQL Editor 에 붙여넣어 한 번 실행하세요.

-- =========================================================
-- 1) 단어 콘텐츠 (공개 읽기 전용)
-- =========================================================
create table if not exists public.words (
  id          int primary key,
  category    text    not null,
  level       int     not null check (level between 1 and 3),
  cefr        text    not null,
  answer      text    not null,
  sentence_en text    not null,
  sentence_ko text    not null,
  meaning     text    not null,
  tts_text    text    not null,
  -- v6 콘텐츠 태그 (docs/word-content-spec-v6.md)
  display_sentence text,
  frequency        text,
  chunk_type       text,
  difficulty_axis  text,
  use_case         text[] not null default '{}'
);
create index if not exists words_level_idx    on public.words (level);
create index if not exists words_category_idx on public.words (category);

alter table public.words enable row level security;
drop policy if exists "public read" on public.words;
create policy "public read" on public.words
  for select using (true);
-- INSERT/UPDATE/DELETE 정책 없음 → anon 키로는 수정 불가

-- =========================================================
-- 2) 유저 상태 (1행 / 유저)
-- =========================================================
create table if not exists public.user_state (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  level          int  not null default 1,
  streak         int  not null default 0,
  last_study_date date,
  total_learned  int  not null default 0,
  preferred_categories text[] not null default '{}',
  onboarded      boolean not null default false,
  level_provisional     boolean not null default true,
  calibration_questions int not null default 0,
  calibration_correct   int not null default 0,
  updated_at     timestamptz not null default now()
);
-- 기존 프로젝트 마이그레이션: 레벨 테스트 완료 여부(이미 있으면 무시)
alter table public.user_state
  add column if not exists onboarded boolean not null default false;
-- 7-3: 임시(추정) 레벨 자동 보정 컬럼
alter table public.user_state
  add column if not exists level_provisional boolean not null default true;
alter table public.user_state
  add column if not exists calibration_questions int not null default 0;
alter table public.user_state
  add column if not exists calibration_correct int not null default 0;

-- =========================================================
-- 3) 문항별 학습 신호 (user_id + word_id 복합키)
-- =========================================================
create table if not exists public.progress (
  user_id          uuid not null references auth.users(id) on delete cascade,
  word_id          int  not null references public.words(id),
  seen_count       int  not null default 0,
  first_try_correct boolean,
  shadow_stars     int,
  pass_count       int  not null default 0,
  pron_pass_count  int  not null default 0,
  ease_factor      real not null default 2.5,
  interval_days    int  not null default 0,
  in_review        boolean not null default false,
  last_seen        date,
  next_due         date,
  meaning_recall_score int,
  spelling_score       int,
  pronunciation_score  int,
  updated_at       timestamptz not null default now(),
  primary key (user_id, word_id)
);
create index if not exists progress_review_idx   on public.progress (user_id, in_review);
create index if not exists progress_next_due_idx on public.progress (user_id, next_due);
-- 8-2: 3요소 분리 점수(기존 프로젝트 마이그레이션)
alter table public.progress
  add column if not exists meaning_recall_score int;
alter table public.progress
  add column if not exists spelling_score int;
alter table public.progress
  add column if not exists pronunciation_score int;
-- 9-3d: 발음 졸업 트랙(기존 프로젝트 마이그레이션)
alter table public.progress
  add column if not exists pron_pass_count int not null default 0;
-- 9-4: SM-2 간격 스케줄 상태(기존 프로젝트 마이그레이션)
alter table public.progress
  add column if not exists ease_factor real not null default 2.5;
alter table public.progress
  add column if not exists interval_days int not null default 0;

-- =========================================================
-- 4) 세션 요약 (통계/리포트 원천)
-- =========================================================
create table if not exists public.study_sessions (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  ended_at        timestamptz not null default now(),
  study_date      date not null default current_date,
  level           int  not null,
  categories      text[] not null default '{}',
  words_count     int  not null,
  correct_first_try int not null,
  avg_stars       numeric(3,2),
  avg_score       numeric(5,2),
  review_count    int  not null default 0,
  weak_words      text[] not null default '{}'
);
create index if not exists sessions_date_idx on public.study_sessions (user_id, study_date);
-- 9-1a: 주간 발음 리포트용 약점 단어(기존 프로젝트 마이그레이션)
alter table public.study_sessions
  add column if not exists weak_words text[] not null default '{}';

-- =========================================================
-- 4b) 리뷰 로그 (9-4: SM-2 운영 분석 · 향후 FSRS 파라미터 학습 원천)
-- =========================================================
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

-- =========================================================
-- 5) RLS: 본인 행만 읽기/쓰기
-- =========================================================
alter table public.user_state     enable row level security;
alter table public.progress       enable row level security;
alter table public.study_sessions enable row level security;
alter table public.review_logs    enable row level security;

drop policy if exists "own state" on public.user_state;
create policy "own state" on public.user_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own progress" on public.progress;
create policy "own progress" on public.progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own sessions" on public.study_sessions;
create policy "own sessions" on public.study_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own review logs" on public.review_logs;
create policy "own review logs" on public.review_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
