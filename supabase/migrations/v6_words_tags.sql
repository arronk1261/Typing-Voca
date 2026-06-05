-- v6 마이그레이션: words 테이블에 콘텐츠 태그 컬럼 추가
-- 기존 Supabase 프로젝트에 적용. (신규 셋업은 supabase/schema.sql에 이미 포함)
-- Supabase 대시보드 → SQL Editor 에 붙여넣어 한 번 실행한 뒤 `npm run seed` 로 2,520행 재적재.

alter table public.words add column if not exists display_sentence text;
alter table public.words add column if not exists frequency        text;
alter table public.words add column if not exists chunk_type       text;
alter table public.words add column if not exists difficulty_axis  text;
alter table public.words add column if not exists use_case         text[] not null default '{}';

create index if not exists words_frequency_idx  on public.words (frequency);
create index if not exists words_chunk_type_idx on public.words (chunk_type);
