# PRD & MVP 개발 플랜: Typing-Voca (말해보카 스타일 영어 학습 웹앱)

본 문서는 AI(Claude)와 함께 **단계별(Phase-by-Phase) 바이브 코딩**으로 MVP를 빌드하기 위한 제품 요구사항 정의서(PRD)이자 실행 로드맵입니다. 각 Phase는 **독립적으로 테스트 가능한 산출물**을 갖도록 설계되어, 한 단계를 끝낼 때마다 실제로 동작하는 결과물이 나옵니다.

> **버전:** v6 (학습 품질 고도화) — **단어 DB를 900→2,520(레벨당 840, 카테고리당 210)로 확충 + v6 스키마(콘텐츠 태그) 적용 완료** / MVP(Phase 0~5) 완료 후 **콘텐츠 정제 · 진단/채점 신뢰도 · 장기 기억(SRS) 설계**를 다루는 Phase 6~8 로드맵 추가(8장 말미) / v5 구글 로그인 + 카테고리·통계·리포트·채점 고도화 MVP 포함 / v4 학습 데이터 Supabase 이전 / v3 단어 DB Supabase / v2 발음 재설계·폴백·콘텐츠 확장

---

## 0. 핵심 결정 사항 요약

1. **발음 단계 → "섀도잉 챌린지".** 점수 심판이 아니라 무한 재시도 가능한 따라 말하기 도전. 별 등급(⭐) 기반, STT 실패는 유저 실패로 간주하지 않음.
2. **지원 환경 = Chrome/Edge 풀 지원 + 3단계 폴백.** STT 미지원 환경에서도 학습이 절대 막히지 않게 설계.
3. **콘텐츠 = 성인 일반회화까지 (12개 카테고리 · CEFR 3레벨 · 레벨당 840문항 / 총 2,520 — 구축 완료).** 출제는 신규70/복습30 + 적응형, 복습은 SRS-lite 졸업 규칙.
4. **저장/인증 = 전부 Supabase + 구글 로그인.** 단어 콘텐츠(공개 읽기 전용) + 학습 데이터(`auth.uid()` RLS). 구글 OAuth로 로그인 → 기기 간 동기화 기본 제공.
5. **이번 MVP에 포함되는 확장 4종:** ①카테고리 선택 학습 ②통계 히스토리 ③주간 리포트 ④채점 알고리즘 고도화(음소 근사 + 단어 정렬 + 부분 점수). → 6단계 로드맵(Phase 0~5).

---

## 1. 서비스 개요 (Service Overview)

* **서비스명:** Typing-Voca (가칭)
* **핵심 컨셉:** 말해보카의 성공 방정식 **[타이핑 중심 퀴즈 → 즉각 마이크로 피드백 → 게임화(Streak) → 복습 루프]** 에, **섀도잉 챌린지**를 보너스 레이어로 결합한 무료 브라우저 기반 웹앱.
* **주요 타겟:** 타이핑으로 철자·뜻·콜로케이션을 외우고, 입으로 따라 말하며 회화 감각까지 키우려는 자기주도형 성인 학습자.
* **학습 단위:** 10문항 = 1세트. 각 문항은 **1단계 타이핑 퀴즈 → 2단계 섀도잉 챌린지**로 연결.
* **차별 포인트:** 구글 로그인 한 번으로 기기 간 이어서 학습, 100% 무료(자체 음성/채점 엔진), 발음 연습이 "평가"가 아닌 "도전"이라 부담 없음, 카테고리 선택·통계·주간 리포트로 동기 유지.

---

## 2. 기술 스택 & 인프라 제약 (100% Free / Serverless)

* **Frontend:** React (또는 Next.js) + TailwindCSS — 모바일 퍼스트, 컴포넌트 기반.
* **Animation:** Framer Motion 또는 CSS 키프레임 (정답 플래시, Shake, Confetti).
* **TTS:** 브라우저 내장 `Web Speech API – SpeechSynthesis` (지원 넓음, 오프라인 동작).
* **STT:** 브라우저 내장 `Web Speech API – SpeechRecognition` (Chrome/Edge/Safari, **인터넷 필수 · 외부 서버 전송**).
* **발음 비교 엔진:** 유료 API 없이, STT 텍스트와 정답 문장의 **정규화 Levenshtein 유사도**를 자체 구현 (어순·중복·부분일치 반영).
* **Data Storage (전부 Supabase):**
  * **단어 DB (콘텐츠, 읽기 전용):** **Supabase (Postgres)** — `words` 테이블. 누구나 SELECT, 쓰기 차단(공개 RLS).
  * **학습 데이터 (개인 상태):** **Supabase** — `user_state`(레벨·streak 등) + `progress`(문항별 학습 신호). 본인 데이터만 접근 가능하도록 `auth.uid()` 기준 RLS.
* **인증:** **Supabase Auth — 구글 OAuth(Google 로그인).** 앱 진입 시 `[Google로 계속하기]` 한 번으로 로그인 → `auth.uid()` 발급. 같은 구글 계정이면 **기기 간 학습 데이터 동기화**가 기본. 수집 정보는 구글이 제공하는 최소 프로필(이메일·이름·아바타)뿐. (선택: 로그인 전 "둘러보기" 게스트 프리뷰는 손쉬운 추가 옵션이나 기본은 로그인-퍼스트.)
* **로컬 캐시 (보조):** `LocalStorage`(또는 IndexedDB)는 **오프라인 캐시 + 쓰기 큐**로만 사용 — 학습 루프는 메모리에서 즉시 반응하고, 네트워크는 체크포인트에서 배치 동기화. (소스 오브 트루스는 Supabase)

> 즉, **"콘텐츠도, 학습 데이터도 서버에"**. LocalStorage 시절의 약점(캐시 삭제 시 전소·기기 간 동기화 불가)이 해소되고, 구글 로그인으로 어느 기기에서나 이어서 학습합니다.

> ⚠️ **동기화 원칙:** 키 입력·문항마다 네트워크를 때리지 않는다. 세션 중에는 메모리(Zustand)에서 처리하고, **세션 종료/주요 분기에서 배치 upsert**. 오프라인이면 로컬 큐에 쌓았다가 온라인 복귀 시 flush.

> ⚠️ **빌드 환경 주의:** Claude 아티팩트(미리보기)에서는 Auth 세션/LocalStorage가 제한적 → 메모리 상태로 대체. 자체 배포(Next.js)에서 정상 동작.

---

## 3. 발음 단계 = 섀도잉 챌린지 (결정 ①)

핵심 원칙: **"평가받는다"는 느낌 제거 → "따라 말해본다"는 도전으로.** STT 불안정을 전제로, 실패가 유저 탓으로 보이지 않게 설계.

### 3.1 톤 & 용어
* "발음 점수 / Score" → **"섀도잉 챌린지 / 따라 말하기"**, 숫자 대신 **별 등급(⭐)** 표시.
* 모든 피드백은 격려형: "틀렸다" ❌ → "한 번 더 가볼까?" ✅

### 3.2 등급 기준 (개선된 유사도 0~100 기반)
| 등급 | 조건 | 피드백 |
|---|---|---|
| ⭐⭐⭐ Perfect Echo | 85점 이상 | "Perfect!" + Confetti |
| ⭐⭐ Nice! | 60~84점 | "Great!" |
| ⭐ Keep going | 60점 미만 (음성은 인식됨) | 누락/오인식 단어 붉게 표시 + 재시도 |
| 🎤 다시 한 번 | STT 미인식 / 빈 결과 / 저신뢰도 | **실패 아님.** 무한 재시도 유도 |

### 3.3 채점 알고리즘 (고도화 — 이번 MVP 포함)
단순 단어 일치/Levenshtein을 넘어 **다요소 점수**로 STT 특유의 오인식·발음 변이를 흡수한다. 모두 클라이언트에서 무료로 동작.

1. **정규화(전처리):** 소문자화 → 구두점 제거 → 다중 공백 정리 → **축약형 전개**(don't→do not, it's→it is, gonna→going to, wanna→want to, I'm→i am 등) → 흔한 STT 동음 치환 사전(to/two/too, their/there 등) 옵션 적용.
2. **단어 정렬:** 정답·발화 토큰 시퀀스를 Levenshtein 정렬해 매칭/삽입/삭제/치환 위치를 식별(어순·중복 반영).
3. **단어별 유사도(부분 점수):** 정렬된 각 쌍에 대해 `max(완전일치=1.0, 문자단위 정규화 유사도, 음소 일치)`.
   * **음소 근사:** 간이 Metaphone/Soundex류 코드가 일치하면 높은 부분점수(예: 0.8) — 동음·STT 오청취 보정. (라이브러리 예: `talisman`의 doubleMetaphone/jaroWinkler, 또는 자체 soundex)
4. **점수화:** `Σ(단어별 유사도) / 정답 단어 수 × 100`. 불필요한 삽입 단어는 소폭 감점(또는 경미 시 무시).
5. **재시도 게이트:** STT가 빈 문자열/저신뢰도면 점수화하지 않고 **"다시 한 번"** 분기(신뢰도는 점수 부풀리기에 쓰지 않음).
6. **출력:** `{ status, score, stars, weakWords }` — `weakWords`는 누락/약하게 인식된 정답 단어 → UI에서 붉게 강조.

> 코드 골격은 **9장**의 `scoreShadowing()` 고도화 버전 참조.

### 3.4 진행 규칙
* 섀도잉은 **절대 진행을 막지 않음.** STT 안 돼도 `[건너뛰기]`로 다음 문항 이동.
* 타이핑(1단계)이 학습의 코어, 섀도잉은 보너스 레이어.
* TTS: 정답 직후 1회 자동 재생 + `[느리게 다시 듣기]`(rate 0.7) 버튼.

---

## 4. 지원 브라우저 & 폴백 설계 (결정 ②)

런타임 기능 감지(`window.SpeechRecognition || window.webkitSpeechRecognition`, `window.speechSynthesis`)로 **3단계 자동 분기**.

### 4.1 공식 지원 환경
* **풀 지원:** 데스크톱 Chrome / Edge, 안드로이드 Chrome ← 메인 타깃, QA 우선.
* **부분 지원:** macOS Safari (웹킷 프리픽스 + 권한 모달 처리 필요).
* **STT 미지원:** Firefox(기본 비활성), iOS PWA 설치 시, 인앱 WebView.

### 4.2 3단계 Graceful Degradation
| 환경 감지 | 동작 모드 |
|---|---|
| TTS ✅ + STT ✅ | **풀 모드** — 타이핑 + 섀도잉 챌린지(별점) |
| TTS ✅ + STT ❌ | **리스닝 섀도잉 모드** — 듣고 따라 말한 뒤 유저가 `[잘 했어요/다시]` 자가 체크 |
| 둘 다 ❌ | **타이핑 전용 모드** — 발음 단계 자동 스킵 |

### 4.3 필수 UX 처리
* 미지원 환경 첫 진입 시 **비차단형 배너**: "🔊 발음 연습은 Chrome/Edge에서 가장 잘 동작해요" (학습은 계속 가능).
* **iOS:** 사파리 탭에서는 일부 동작하나 **PWA 설치 시 마이크 차단** → "홈 화면 추가" 대신 브라우저 탭 사용 안내.
* **TTS 백그라운드 끊김:** `visibilitychange` 감지 → 탭 비활성 시 일시정지/재큐잉.
* **오프라인:** STT는 인터넷 필수 → 오프라인 감지 시 자동으로 타이핑 전용 모드 폴백.

---

## 5. 콘텐츠 · DB · 출제 · 복습 규칙 (결정 ③)

### 5.1 콘텐츠 범위 — 12개 회화 카테고리 (성인 일반회화 포함)
인사·스몰토크 / 쇼핑·결제 / 음식·레스토랑 / 여행·교통 / 직장·업무 / 전화·이메일 / 감정·의견 표현 / 약속·일정 / 건강·병원 / 일상 루틴 / 인간관계·소셜 / IT·실무

> 빈칸은 단어 1개뿐 아니라 **핵심 청크(collocation)** 도 가능. 예: `Could you ___ me a favor?` → `do`

### 5.2 레벨 정의 (CEFR 매핑)
| 레벨 | CEFR | 특징 | 빈칸 단위 |
|---|---|---|---|
| Lv.1 초심자 | A1~A2 | 생존 표현, 고빈도 단어 | 단어 1개 |
| Lv.2 중수 | B1 | 일상 유창성, 구동사·기본 콜로케이션 | 단어~짧은 청크 |
| Lv.3 고수 | B2~C1 | 뉘앙스·관용구·비즈니스/추상 | 청크 단위 |

### 5.3 DB 규모 (반복 체감 기준 역산)
* **MVP 최소:** 레벨당 150문항 (총 450) → 약 15일치. 출시 가능 최소선.
* **권장 1차 목표(달성):** 레벨당 300문항 (총 900) → 약 30일치.
* ✅ **현재 = 최종 서비스 규모: 레벨당 840문항 (총 2,520).** 12 카테고리 × 3 레벨 × **70개** 격자. 일상 회화 전 영역을 체감 반복 없이 커버. (구축 방식·검수: 8.5 / `docs/word-content-spec-v6.md`)
* 품질 원칙: AI 대량 생성 + **카테고리·레벨 균형 + 예문 자연스러움 검수.** 어색한 예문 1개가 신뢰를 깎음 → `npm run validate:words`로 빈칸채움=tts·placeholder 누수·카테고리 내 중복을 자동 게이트(오류 0건).

### 5.4 출제 로직 (세션당 10문항)
* **신규 70% / 복습 30%** (신규 7 + 복습 3). 신규는 현재 레벨 미학습 우선, 그다음 가장 오래전 본 문항.
* 한 세션 내 **중복 출제 금지.**
* 문항별 메타 추적: `seen_count, first_try_correct, shadow_stars, last_seen, next_due, pass_count, in_review`.
* **적응형 레벨 보정(제안만, 강제 ❌):** (타이핑 첫 시도 정답률 높음 + 섀도잉 평균 ⭐⭐ 이상) 반복 → 상향 토스트 / 목숨 소진 잦음 → 하향 제안.

### 5.5 복습 졸업 규칙 (SRS-lite)
* **`in_review` 진입:** 타이핑 목숨 전부 소진(실패) **또는** 섀도잉 ⭐ 1개 이하.
* **"통과" 정의:** 타이핑 첫 시도 정답 **+** 섀도잉 ⭐⭐(60점) 이상.
* **졸업(`in_review=false`):** 서로 다른 2회(이상적으로 다른 날) "통과" 시.
  * 1차 통과 → `next_due = +1일` / 2차 통과 → **졸업** / 통과 실패 → `pass_count` 리셋(행 유지).
* `(user_id, word_id)` 복합키로 중복 방지, 복습 노출은 `next_due` 지난 것 중 오래된 순.

### 5.6 카테고리 선택 학습 (이번 MVP 포함)
* **두 가지 진입 모드:**
  * **오늘의 10단어(기본):** 현재 레벨에서 전 카테고리 혼합 출제.
  * **카테고리 학습:** 사용자가 1개 이상 카테고리를 골라 그 범위에서만 출제.
* 마지막 선택은 `user_state.preferred_categories`에 저장해 다음에 기본값으로 제안.
* **출제 충원 규칙:** 선택 카테고리 × 현재 레벨 문항이 10개에 못 미치면 → ①같은 카테고리의 인접 레벨로 확장 → ②그래도 부족하면 복습 비율을 높여 채움. (현재 DB는 **카테고리당 레벨별 70개**라 단일 카테고리·단일 레벨 세션도 충분히 쾌적 — 충원 규칙은 안전장치로 유지. 6.1 참조)

### 5.7 통계 히스토리 & 주간 리포트 (이번 MVP 포함)
* **원천 데이터:** 세션 종료 시 `study_sessions`에 1행 기록(6.6). 추이·집계는 이 테이블 + `progress`에서 산출.
* **통계 히스토리 화면 구성:**
  * 스트릭 캘린더(학습한 날짜 히트맵)
  * 일/주별 학습 단어 수 추이 + 평균 점수·별점 추이(라인/바 차트)
  * **카테고리별 숙련도**(졸업/학습 비율) + 레벨 추이
  * 누적 학습 단어 수, 졸업 단어 수
* **주간 리포트(최근 7일):** 학습한 날 수(/7), 총 학습 단어, 평균 점수, 가장 많이 푼·가장 향상된 카테고리, 스트릭 상태, **전주 대비 증감**. 새 주의 첫 진입 시 카드로 노출(닫기 가능). 집계는 클라이언트에서 `study_sessions` 쿼리로 계산하거나, 성능을 위해 Supabase RPC(`get_weekly_report`)로 위임 가능.

---

## 6. 데이터 스키마

### 6.1 단어/문장 DB — `words.json` → Supabase `words` 테이블
실제 생성된 `words.json` 한 행의 형태 (**총 2,520문항 · v6 스키마**):
```json
{
  "id": 8,
  "category": "greeting",
  "level": 2,
  "cefr": "B1",
  "answer": "catch up",
  "sentence_en": "Let's ___ over coffee sometime.",
  "sentence_ko": "언제 커피 마시면서 얘기 좀 해요.",
  "meaning": "근황을 나누다",
  "tts_text": "Let's catch up over coffee sometime.",
  "display_sentence": "Let's catch up over coffee sometime.",
  "frequency": "high",
  "chunk_type": "phrasal_verb",
  "difficulty_axis": "usage",
  "use_case": ["greeting", "social"]
}
```
* `answer`는 단어 또는 청크(콜로케이션)이며 `sentence_en`의 `___` 자리에 들어갑니다.
* `tts_text`는 빈칸이 채워진 완성 문장 = **섀도잉 대상**입니다.
* 문두에 빈칸이 오는 경우 `answer`/`tts_text`는 첫 글자가 대문자로 처리되어 있습니다(예: `How`, `When`).
* **v6 콘텐츠 태그**(`display_sentence`/`frequency`/`chunk_type`/`difficulty_axis`/`use_case`)는 진단·적응형 출제(8.5 Phase 6~8)에서 활용. 규격 상세: `docs/word-content-spec-v6.md`.
* 빌드 파이프라인: 카테고리별 `src/data/generated/*.json` → `npm run assemble:words`(검수+ID 부여) → `src/data/words.json` → `npm run seed`(Supabase upsert).

### 6.2 Supabase 스키마 & 시드 등록 (SQL)
```sql
-- 1) 테이블 생성
create table public.words (
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
create index on public.words (level);
create index on public.words (category);
create index on public.words (frequency);
create index on public.words (chunk_type);
-- 기존 DB는 supabase/migrations/v6_words_tags.sql 로 컬럼만 추가 후 재시드

-- 2) RLS: 누구나 읽기만 가능 (쓰기는 차단)
alter table public.words enable row level security;
create policy "public read" on public.words
  for select using (true);
-- INSERT/UPDATE/DELETE 정책은 만들지 않음 → anon(public) 키로는 수정 불가
```
**시드 등록 방법 (택1):**
* **가장 쉬움:** Supabase 대시보드 → Table Editor → `words` → *Import data* → `words.json`을 CSV로 변환해 업로드. (또는 SQL Editor에서 `insert`)
* **CLI/스크립트:** Service Role 키로 `@supabase/supabase-js`의 `upsert(rows)` 한 번 실행. (Service Role 키는 절대 프론트엔드에 노출 ❌, 시드 스크립트에서만 사용)

### 6.3 클라이언트 조회 전략
* 프론트엔드는 **anon(public) 키**만 사용 — RLS가 읽기 전용이라 노출되어도 안전.
* 환경변수: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
* **로드 패턴:** 세션 시작 시 현재 레벨 문항을 한 번에 조회 후 클라이언트에서 출제.
  ```js
  const { data, error } = await supabase
    .from('words').select('*').eq('level', userLevel);
  ```
* **오프라인 폴백 / 성능:** 최초 조회 결과를 LocalStorage(또는 IndexedDB)에 캐시 → 네트워크 실패 시 캐시로 동작. 단어 DB는 거의 안 바뀌므로 캐시 적중률이 높음.

### 6.4 학습 데이터 (Supabase — `user_state` + `progress`)
LocalStorage가 아니라 Supabase 테이블에 저장합니다. `reviewList`는 별도 테이블 없이 `progress.in_review` 플래그로 표현합니다.
```sql
-- 유저 1행: 레벨/스트릭/누적/선호 카테고리
create table public.user_state (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  level          int  not null default 1,
  streak         int  not null default 0,
  last_study_date date,
  total_learned  int  not null default 0,
  preferred_categories text[] not null default '{}',  -- 카테고리 선택 학습 기본값
  updated_at     timestamptz not null default now()
);

-- 문항별 학습 신호 (user_id + word_id 복합키)
create table public.progress (
  user_id          uuid not null references auth.users(id) on delete cascade,
  word_id          int  not null references public.words(id),
  seen_count       int  not null default 0,
  first_try_correct boolean,
  shadow_stars     int,
  pass_count       int  not null default 0,
  in_review        boolean not null default false,  -- reviewList 대체
  last_seen        date,
  next_due         date,
  updated_at       timestamptz not null default now(),
  primary key (user_id, word_id)
);
create index on public.progress (user_id, in_review);
create index on public.progress (user_id, next_due);

-- 세션 요약 1행 = 통계 히스토리/주간 리포트의 원천
create table public.study_sessions (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  ended_at        timestamptz not null default now(),
  study_date      date not null default current_date,
  level           int  not null,
  categories      text[] not null default '{}',
  words_count     int  not null,
  correct_first_try int not null,     -- 타이핑 첫 시도 정답 수
  avg_stars       numeric(3,2),       -- 섀도잉 평균 별점
  avg_score       numeric(5,2),       -- 섀도잉 평균 점수
  review_count    int  not null default 0
);
create index on public.study_sessions (user_id, study_date);

-- RLS: 본인 데이터만 읽고/쓰기
alter table public.user_state     enable row level security;
alter table public.progress       enable row level security;
alter table public.study_sessions enable row level security;
create policy "own state" on public.user_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own progress" on public.progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own sessions" on public.study_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```
* `word_id`는 `words.id`를 참조(FK). 로그인 유저는 `auth.users`에 행이 있으므로 FK·RLS가 그대로 적용됩니다.
* 신규 유저 첫 로그인 시 `user_state` 1행 자동 생성(`upsert`).

### 6.5 인증(구글) & 동기화 전략
* **구글 로그인:** `supabase.auth.signInWithOAuth({ provider: 'google' })`. Supabase 대시보드에서 Google provider 설정(클라이언트 ID/시크릿) + 리다이렉트 URL 등록 필요. 로그인 후 `onAuthStateChange`로 세션 감지 → `user_state` upsert.
* **세션 가드:** 비로그인 상태에서 학습/저장 기능 진입 시 로그인 화면으로 유도(로그인-퍼스트). (선택적 게스트 프리뷰는 추후 옵션.)
* **로드:** 로그인 직후 `user_state` + 현재 레벨 `progress`를 불러와 Zustand에 적재.
* **쓰기(배치):** 학습 중에는 메모리에서만 갱신하고, **세션 종료(결과창) 또는 주요 분기**에서 변경분만 `upsert`(`progress`는 `onConflict: 'user_id,word_id'`). 세션 요약 1행은 `study_sessions`에 insert. 키 입력/문항마다 쓰지 않음.
* **오프라인 큐:** 네트워크 실패 시 변경분을 LocalStorage 큐에 적재 → 온라인 복귀(`online` 이벤트)/다음 진입 시 flush. (학습 루프는 끊기지 않음 — 규칙 6)
* **기기 간 동기화:** 같은 구글 계정이면 `user_id`가 동일 → 별도 작업 없이 다른 기기에서 이어서 학습.

---

## 7. 사용자 플로우 (요약)

```
[첫 접속] → [구글 로그인] → (신규면) [레벨 테스트] → [레벨 설정 + Supabase 저장]
                                                          |
                                                          v
   [통계/주간 리포트] ← [메인 대시보드] → [카테고리 선택(선택)] → [학습 세션 진입]
                              ^                                        |
   [세션 결과창] ─────────────┘ (10문항 완료 → study_sessions 기록 + 배치 동기화)
        ^                                                              |
        └────── [코어 학습 루프: 타이핑 → 섀도잉(고도화 채점)] (문항별, 메모리) ──┘
```

---

## 8. 단계별 MVP 개발 로드맵 ⭐ (6 Phase · 22 기능 단위)

각 Phase는 **독립적으로 테스트 가능한 산출물**을, 각 기능 단위는 **명확한 완료 기준(Done)** 을 가집니다. 번호 순서를 엄격히 따르고, 한 단위가 에러 없이 완료된 뒤 다음으로 넘어갑니다. (claude.md의 기능 단위 번호와 1:1 매핑)

```
[Phase 0] 기반: 환경·Supabase·구글 인증·스키마·디자인 시스템   0-1 → 0-2 → 0-3 → 0-4 → 0-5
[Phase 1] 코어 타이핑 퀴즈 (학습의 심장)                       1-1 → 1-2 → 1-3 → 1-4
[Phase 2] 대시보드 + 학습 데이터 + Streak + 카테고리 선택      2-1 → 2-2 → 2-3 → 2-4 → 2-5
[Phase 3] 섀도잉 챌린지 + 채점 고도화                          3-1 → 3-2 → 3-3 → 3-4 → 3-5
[Phase 4] 결과창 + 복습 졸업 + 세션 기록 + 출제 로직            4-1 → 4-2 → 4-3 → 4-4
[Phase 5] 통계 히스토리 + 주간 리포트 + 최종 QA                5-1 → 5-2 → 5-3
```

---

### 🧱 Phase 0 — 기반 (환경·Supabase·구글 인증·스키마·디자인 시스템)
* **목표:** 빌드 기반 + Supabase(콘텐츠·학습 데이터·세션) + 구글 로그인 + 디자인 시스템까지 준비.
* **0-1 프로젝트 셋업 & 모바일 셸:** Next.js(App Router)+TS+Tailwind v4, 폴더 구조(app/components/stores/hooks/lib/types), `@theme` 디자인 토큰·다크모드, `100dvh`/세이프에어리어 전역 레이아웃, ESLint/Prettier. **Done:** 모바일 뷰(390px) 에러 없이 렌더 + 다크모드 토큰 적용.
* **0-2 Supabase 스키마 + RLS + 시드:** 6.2 `words`(공개 읽기) + 6.4 `user_state`·`progress`·`study_sessions`(`auth.uid()` RLS). `words.json`(**현재 2,520행/v6**) 시드 스크립트(Service Role 전용). **Done:** 단어 행 적재 + anon 키로 words SELECT 가능/INSERT 차단 + 타 user 데이터 RLS 차단.
* **0-3 구글 로그인 + 세션 가드:** Supabase Google OAuth 설정, `[Google로 계속하기]` 화면, `onAuthStateChange` 세션 관리, 로그인 시 `user_state` upsert, 비로그인 가드. **Done:** 구글 로그인→로그아웃→재로그인 동작, 신규 유저 `user_state` 1행 생성.
* **0-4 데이터 레이어 + 동기화:** `getWords`(레벨/카테고리 조회+캐시), `userData`(로드 + 변경분 배치 upsert + 오프라인 큐), 타입 정의(Word/UserState/Progress/StudySession). **Done:** 시작 시 데이터 로드, 체크포인트에서만 쓰기, 오프라인 변경 복귀 시 flush.
* **0-5 디자인 시스템 공통 컴포넌트:** Button/Card/ProgressBar/Hearts/LoadingDots/BottomSheet/BottomActionBar/Toast + 다크모드·접근성(48px·포커스링·색+아이콘) + framer-motion 전환 프리셋. **Done:** 샘플 페이지에서 전 컴포넌트·다크토글·전환 모션 정상.

---

### ⌨️ Phase 1 — 코어 타이핑 퀴즈 (단독으로도 학습 가능한 최소 MVP)
* **목표:** 학습의 심장인 타이핑 루프 완성.
* **1-1 세션 셸 & 전환 골격:** 풀스크린 학습 화면(상단 Progress+Hearts, 중앙 문제 카드, 하단 액션바), 문항 좌우 슬라이드 전환. **Done:** 1/10~10/10 슬라이드 골격 동작.
* **1-2 타이핑 입력 UX:** 한글 뜻 + 빈칸 예문, 글자 수만큼 언더바(`--font-mono` 정렬), 글자별 부드러운 채움, 대소문자 무시/공백·하이픈 처리, 모바일 키보드 가림 방지. **Done:** 한 글자씩 채우는 경험이 매끄럽고 키보드가 입력창을 가리지 않음.
* **1-3 정답/오답 + 마이크로 인터랙션:** 정답=초록 플래시+미세 햅틱→2단계 신호, 오답=shake+하트 차감+격려+첫 글자 힌트, 하트 소진→복습 후보 표시(세션 종료 시 `in_review` 반영), 색+아이콘 이중 표시. **Done:** 정/오답 피드백·하트·복습 후보 처리 동작.
* **1-4 10문항 루프 + 결과 누적:** 끝까지 도는 루프(섀도잉 자리 placeholder), 문항별 결과(첫 시도 정답·하트 소진)를 세션 상태에 누적, 임시 결과 화면. **Done:** 타이핑만으로 10문항 완주 + 결과 정확 누적. **Phase 1 마스터 브리핑.**

---

### 🏠 Phase 2 — 대시보드 + 학습 데이터 + Streak + 카테고리 선택
* **목표:** 세션 밖 영속성(Supabase)·게임화·카테고리 진입.
* **2-1 유저 데이터 스토어(Supabase 동기화):** Zustand userStore(level/streak/lastStudyDate/totalLearned/progress/preferredCategories), 0-4 레이어 연결, 세션 종료 시 배치 upsert. **Done:** 같은 구글 계정이면 새로고침/다른 기기에서 상태 유지, 쓰기는 체크포인트에서만.
* **2-2 메인 대시보드 UI:** 상단 상태(레벨/누적/Streak 🔥), 하단 CTA([오늘의 10단어]/[카테고리 학습]/[오답 노트]=`in_review` 있을 때만), 통계·리포트 진입점. **Done:** 모바일에서 대시보드 진입 → 각 모드로 분기.
* **2-3 레벨 테스트(온보딩):** 신규 유저 타이핑 3~5문항 → Lv.1~3 확정 → `user_state` 저장 → 대시보드. "추정치, 학습 중 자동 조정" 안내. **Done:** 최초 1회 테스트 → 레벨 저장, 재방문 시 스킵.
* **2-4 Streak 로직 + 불꽃:** `last_study_date` 비교로 +1/리셋, 불꽃 강도 비주얼, 세션 완료 시 호출 훅. **Done:** 날짜 모킹으로 +1/리셋 정확, 불꽃 표시.
* **2-5 카테고리 선택 학습:** 12개 카테고리 멀티 선택 바텀시트(아이콘·라벨), 선택을 `preferred_categories`에 저장, 선택 시 세션이 해당 카테고리로 구성(5.6 충원 규칙). **Done:** 카테고리 선택 → 그 범위 문항으로 세션 구성, 부족 시 충원 규칙 동작. **Phase 2 마스터 브리핑.**

---

### 🎤 Phase 3 — 섀도잉 챌린지 + 채점 고도화
* **목표:** 발음 레이어 + 다요소 채점.
* **3-1 기능 감지 & 3단계 폴백 + 권한 UX:** `useSpeechSupport`(webkit 포함)로 full/listening/typingOnly 분기, 미지원 비차단 배너, 마이크 권한 맥락 안내(T9), iOS PWA·오프라인 자동 강등. **Done:** Chrome=full, Firefox=폴백, 어느 경우도 멈추지 않음.
* **3-2 TTS 자동재생 + 느리게 듣기:** 정답 직후 `tts_text` 1회 낭독 + `[느리게 다시 듣기]`(0.7), `visibilitychange` 끊김 대응, 재생 시각화+aria-live. **Done:** 자동 낭독·느리게 듣기·탭 전환 처리.
* **3-3 STT 녹음 + 기본 채점 + 별점 UI:** 하단 큰 마이크 버튼→`SpeechRecognition`, 9장 함수로 점수→별 등급(⭐⭐⭐/⭐⭐/⭐/🎤), 별점 톡톡 등장(T1), 섀도잉엔 부정 표현 금지(T2). **Done:** 발화→별 등급, STT 실패=재시도 분기.
* **3-4 폴백·건너뛰기·단계 통합:** listening 모드(듣고 자가 체크), 모든 모드 `[건너뛰기]`, 점수 후 `[다음]`/3초 자동 전환, 타이핑→섀도잉→다음 통합. **Done:** 세 모드 모두 한 문항이 끊김 없이 흐름.
* **3-5 채점 알고리즘 고도화:** 축약/동의어·동음 정규화 → 단어 정렬 → 단어별 부분 점수(문자 유사도 + **음소 근사**) → 가중 점수 + `weakWords` 산출(9장 고도화 버전). 약하게 인식된 정답 단어 붉게 강조. **Done:** 동음 오인식·부분 발화에서 0/100 극단이 줄고 점수가 자연스러워짐, weakWords 강조 표시. **Phase 3 마스터 브리핑.**

---

### 🏆 Phase 4 — 결과창 + 복습 졸업 + 세션 기록 + 출제 로직
* **목표:** 세션 종료 보상·복습 루프·통계 원천 데이터 적재.
* **4-1 결과창 + 축하 + 배치 동기화:** 학습 단어 리스트·문항별 별점·평균 시각화, 칭찬 애니메이션+confetti, Streak 갱신, **세션 종료 시 `user_state`+`progress` 변경분 배치 upsert**(오프라인 큐). 후속 버튼 3종. **Done:** 완주→통계·축하·Supabase 1회 반영.
* **4-2 복습 졸업(SRS-lite):** 5.5대로 `in_review` in/out·`next_due`·`pass_count` 갱신. **Done:** 진입/통과/졸업/리셋 분기 정확, Supabase 반영.
* **4-3 출제 로직 + 적응형 레벨 제안:** 신규70/복습30, 카테고리 모드 반영(5.6), `next_due` 지난 복습 우선, 세션 내 중복 금지, 적응형 레벨 제안 토스트(강제 X). **Done:** 다음 세트가 비율·카테고리대로 구성 + 조건 충족 시 레벨 제안.
* **4-4 세션 기록 저장(`study_sessions`):** 세션 종료 시 요약 1행 insert(level/categories/words_count/correct_first_try/avg_stars/avg_score/review_count). **Done:** 완주 1회당 `study_sessions` 1행 적재 — 통계/리포트의 원천 확보. **Phase 4 마스터 브리핑.**

---

### 📊 Phase 5 — 통계 히스토리 + 주간 리포트 + 최종 QA
* **목표:** 동기 유지 장치 완성 + 출시 점검.
* **5-1 통계 히스토리 화면:** `study_sessions`+`progress` 집계 → 스트릭 캘린더(히트맵), 일/주별 학습량·평균 점수 추이 차트, 카테고리별 숙련도, 누적/졸업 단어 수(5.7). 모바일 차트(recharts 등). **Done:** 히스토리 화면에서 추이·캘린더·카테고리 숙련도가 실제 데이터로 표시.
* **5-2 주간 리포트:** 최근 7일 집계(학습한 날 수/총 단어/평균 점수/베스트·향상 카테고리/스트릭/전주 대비). 새 주 첫 진입 시 카드 노출(닫기 가능). 클라이언트 집계 또는 RPC. **Done:** 주간 리포트 카드가 7일 데이터로 정확히 계산·노출.
* **5-3 최종 QA:** 다크모드 전수(대비 AA), 접근성(aria-live/포커스/색+아이콘/48px), 모바일 실기기(노치·키보드·오프라인) QA, `prefers-reduced-motion` 전수. **Done:** 라이트/다크·접근성·모바일 통과. **전체 마스터 브리핑(사용자 여정 관점).**

---

### (참고) 그 밖의 확장 후보 (Phase 9+)
* 데이터 export/import(백업), 리더보드/친구 등 소셜, PWA 오프라인 강화, 월간 리포트·공유 이미지, 채점 동의어 사전 확장.

---

## 8.5 학습 품질 고도화 로드맵 ⭐ (v6 추가 · Phase 6~8)

> MVP(Phase 0~5)로 **제품 학습 루프**는 완성됐다. 이제 *영어 학습 서비스로서의 품질*을 끌어올린다. 영어 학습 콘텐츠 전문가 리뷰 결과, 개선 우선순위는 **①콘텐츠 오류 정제 → ②진단(레벨테스트)·채점 신뢰도 → ③장기 기억(SRS) 설계** 순이다.
>
> **현황 검증(2026-06):** 단어 DB는 **총 2,520문항(Lv.1/2/3 각 840, 카테고리당 210)·v6 스키마로 확충·시드 완료** ✅ (구 900문항 시절의 템플릿 오류 4건·placeholder 9건·중복 61종은 검수 스크립트로 전수 제거). **남은 과제는 콘텐츠가 아니라 진단·채점·복습 로직** — 레벨테스트 5문항 랜덤, 완전일치만 정답 인정, SRS 2회 통과 졸업·+1일 고정, `loadUserData`가 현재 레벨 progress만 로드(레벨 상향 시 이전 레벨 복습 누락).
>
> **Phase 6 콘텐츠 정제 상태 — ✅ 전 단위 완료:** 6-1(검수 스크립트 `scripts/validateWords.ts`)·6-2(오류 수정)·6-4(v6 태깅+스키마/시드 파이프라인)은 DB 구축으로 완료, **6-3(중복 정리)도 `scripts/dedupReport.ts`로 마무리**(카테고리 간 동일 예문 오염 9종을 맥락별 예문으로 차별화 → 오염 0종, 사유 로그 `docs/duplicate-answer-report.md`). 전수 검수 오류 0/2,520. → **다음 착수는 Phase 7(진단·채점 신뢰도)**.

### 의존성 순서

```
[Phase 6] 콘텐츠 정제 (최우선)        6-1 → 6-2 → 6-3 → 6-4
[Phase 7] 진단·채점 신뢰도           7-1 → 7-2 → 7-3 → 7-4 → 7-5
[Phase 8] 장기 기억·적응            8-1 → 8-2 → 8-3 → 8-4 → 8-5 → 8-6
```
* **6 → 7 → 8 순서 권장.** 7-1(앵커 문항 선별)·8-3(적응 출제)이 6-4의 콘텐츠 태그를 활용한다.
* 스키마 변경을 수반하는 단위: **6-4(`words`), 7-3(`user_state`), 8-2(`progress`)** → 각각 `supabase/migrations/` SQL + `scripts/seed.ts`/`types/index.ts` 동반 수정.

---

### 🧹 Phase 6 — 콘텐츠 정제 (최우선)
* **목표:** 어색·오류 문장 제거. 학습 서비스 신뢰의 1순위.
* **6-1 콘텐츠 검수 스크립트:** `scripts/validateWords.ts` — placeholder 누수(`someone you`·`for granted your` 류), 문법 의심(주어+동사원형 `Something come`), `sentence_en` 빈칸채움≠`tts_text`, `answer`↔빈칸 토큰수 불일치, 중복 `answer` 목록을 카테고리·레벨과 함께 리포트. **Done:** `npm run validate:words`로 전수 오류 리포트 출력, 회귀 방지용 재사용.
* **6-2 확정 오류 수정(4건+placeholder 9건):** `id 441`(`ping someone`→`ping`, `I'll ___ you on the app.`), `id 555`(`Something has ___ at work.`로 문법 교정), `id 819`·`825` 구조 재설계, `someone`류 관용구(`win someone over` 등)는 6-4의 학습표현/예문 분리로 해소. **Done:** 6-1 리포트에서 placeholder 누수 0건 + 문법 의심 수동 확인 완료.
* **6-3 중복 answer 정리 — ✅ 완료:** `scripts/dedupReport.ts`(`npm run dedup:report`)가 중복을 **의도적 재노출**(다른 카테고리·다른 예문 → 유지)과 **오염**(동일 카테고리 또는 동일 예문 복제 → 교체)으로 자동 분류. 카테고리 내 중복 0종, 카테고리 간 238종 중 **동일 예문 오염 9종을 카테고리 맥락 예문으로 차별화**(`generated/*` 패치→재조립→재시드). **Done:** 재실행 시 오염 0종, 사유 로그 `docs/duplicate-answer-report.md` 자동 생성.
* **6-4 콘텐츠 태깅 + 학습표현/예문 분리(`words` 스키마 확장) — ✅ 완료:** 컬럼 추가 `frequency`/`chunk_type`/`difficulty_axis`/`use_case`(text[]) + `display_sentence`(자연 예문) 분리. 레벨은 빈도+청크유형 기준으로 재구성(전체 idiom 약 14%로 절제). **Done:** `supabase/migrations/v6_words_tags.sql` + `scripts/assembleWords.ts` 파이프라인 + `types/index.ts` `Word` 확장 + **2,520개 전수 태깅·시드 완료**(`docs/word-content-spec-v6.md`).

---

### 🎯 Phase 7 — 진단·채점 신뢰도
* **목표:** 첫 경험 진단 정확도 + 정답 인정 범위의 학습 친화성.
* **7-1 앵커 레벨테스트(5→9~12문항):** `src/data/anchorTest.json` — 레벨별 3~4개 **검증된 대표 문항**(랜덤 아님, 6-4 태그로 고빈도·대표성 선별). `levelTest.ts`의 `pickLevelTest`를 앵커 로딩으로 교체. **Done:** 매 진입 동일 난이도 분포, 운 요소 제거.
* **7-2 다요소 채점 + "추천 시작 레벨" 표현:** 정답 수 외 **힌트 사용·오답 후 재시도·응답 시간·멀티워드 성공** 반영한 가중 점수로 `levelFromScore` 교체, 결과 UI를 "Lv.X 확정"이 아닌 **"추천 시작 레벨"**(T2 톤). **Done:** 단위 테스트 — 동일 정답수라도 힌트 다용/저속 응답이 점수에 반영되어 분기.
* **7-3 임시 레벨 자동 보정(`user_state` 확장):** 컬럼 추가 `level_provisional`(bool)·`calibration_questions`·`calibration_correct`. 첫 진입 Lv.2 provisional로 시작 → 누적 30문항(3세트) 후 확정/조정. **Done:** 모킹으로 30문항 누적 시 확정, 그 전엔 provisional 유지.
* **7-4 정답 허용범위 확대:** `answerCheck.ts`의 `isAnswerCorrect`에 허용 규칙 — 관사 차이 일부, 축약/비축약(`I'll`=`I will`), 하이픈·아포스트로피, 단/복수 일부. `Word`에 선택적 `accepted_answers[]` 지원. **Done:** 단위 테스트 — `I will`=`I'll` 통과, 핵심 표현 오인정은 차단.
* **7-5 멀티워드 단계 힌트:** 오답 시 1회차 첫 글자 → 2회차 단어 수 → 3회차 청크 단위 힌트. Lv.3 긴 표현은 "핵심 청크 재조립" UX 검토. **Done:** 멀티워드 문항에서 단계별 힌트 순차 노출.

---

### 🧠 Phase 8 — 장기 기억·적응
* **목표:** "복습 노트"를 넘어 장기 기억 시스템으로. 한 세트가 아닌 누적 안정성 기반 적응.
* **8-1 SRS 간격 장기화:** `srs.ts` — 졸업 2회 → **3~4회 노출**, 간격 `1→3→7→14일`, Lv.3 idiom은 졸업 3회. **Done:** 모킹으로 간격 확장·졸업 회수 분기 정확.
* **8-2 3요소 분리 기록(`progress` 스키마 확장):** 컬럼 추가 `meaning_recall_score`·`spelling_score`·`pronunciation_score`. 타이핑(철자/뜻)·섀도잉(발음)을 따로 기록. **Done:** 결과가 각 요소로 분리 저장.
* **8-3 적응형 출제 비율:** `getWords.ts`의 고정 `REVIEW_RATIO` → 동적 — Lv.1 초반 신규50/복습50, 안정 70/30, 오답누적 多 40/60, streak 끊긴 복귀자 30/70. 카테고리 학습은 상황별 순서(공항→호텔→길찾기→식당) 묶음. **Done:** 상태별로 비율이 의도대로 변동.
* **8-4 크로스레벨 복습 로드(현 누락 수정):** `userData.ts`의 `loadLevelProgress` — 현재 레벨 + `in_review=true`인 이전 레벨 progress까지 로드. **Done:** 레벨 상향 후에도 이전 레벨 복습 대상이 출제 풀에 유지.
* **8-5 누적 기반 승급 정책:** `suggestLevelAdjustment`를 한 세트 → **최근 3~5세트/40~50문항 롤링 윈도우**로(정답률 85%↑, 복습진입률 15%↓, 섀도잉 2.2↑, 졸업 30개↑). 상향=강제 X "Lv.3 맛보기 세트", 하향="기초 다지기 모드"(T2). **Done:** 누적 모킹으로 제안 정확, 단일 세트 흔들림 제거.
* **8-6 졸업 후 유지 점검:** 졸업 단어를 월 1회 아주 낮은 비율로 8-3 풀에 소량 혼입 재출제. **Done:** 졸업 단어가 일정 주기로 재등장.

---

### ⚠️ Phase 6~8 선결 의사결정 2가지 — ✅ 해소됨
1. **콘텐츠 모델:** `someone`류 관용구는 **실제 목적어를 문장에 넣고 answer는 핵심 청크만** 두는 방식으로 정리(예: `win over the whole team`). `display_sentence`도 함께 도입. → 해결.
2. **태깅 범위:** **2,520개 전수 태깅을 이번 DB 구축에 포함** 완료(코드 파이프라인 + 시드). → 별도 콘텐츠 작업 불필요.

---

## 9. 핵심 유틸리티 코드 가이드 (Claude 참고용)

**3-5 채점 고도화 버전.** 축약/동음 정규화 → 단어 정렬 → 단어별 부분 점수(문자 유사도 + 음소 근사) → 가중 점수 + `weakWords`. 모두 클라이언트, 무료.

```javascript
// 1) 정규화: 소문자 + 구두점 제거 + 축약 전개 + 공백 정리
const CONTRACTIONS = {
  "don't":"do not","it's":"it is","i'm":"i am","you're":"you are","we're":"we are",
  "can't":"cannot","won't":"will not","gonna":"going to","wanna":"want to","let's":"let us",
};
const clean = (s) => {
  let t = s.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?"]/g, " ");
  t = t.replace(/\s+/g, " ").trim();
  return t.split(" ").map((w) => CONTRACTIONS[w] ?? w).join(" ").trim();
};

// 2) 문자 단위 Levenshtein → 0~1 유사도
function charSim(a, b) {
  const m = a.length, n = b.length;
  if (!m && !n) return 1;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return 1 - dp[m][n] / Math.max(m, n);
}

// 3) 음소 근사 (간이 soundex류). 운영 시 talisman의 doubleMetaphone 권장.
function phonetic(w) {
  const head = w[0] || "";
  const code = w.slice(1)
    .replace(/[hw]/g, "")
    .replace(/[aeiouy]/g, "0")
    .replace(/[bfpv]/g, "1").replace(/[cgjkqsxz]/g, "2")
    .replace(/[dt]/g, "3").replace(/[l]/g, "4")
    .replace(/[mn]/g, "5").replace(/[r]/g, "6")
    .replace(/(.)\1+/g, "$1").replace(/0/g, "");
  return (head + code).slice(0, 4).padEnd(4, "0");
}

// 4) 단어별 유사도: 완전일치 > 문자유사도 > 음소일치
function wordScore(a, b) {
  if (a === b) return 1;
  const cs = charSim(a, b);
  const ps = phonetic(a) === phonetic(b) ? 0.8 : 0;
  return Math.max(cs, ps);
}

// 5) 정답 시퀀스를 기준으로 정렬 채점 (어순/중복 반영) + 약한 단어 수집
function scoreShadowing(original, spoken, confidence = 1) {
  if (!spoken || !spoken.trim() || confidence < 0.3) {
    return { status: "retry", score: null, stars: 0, weakWords: [] };
  }
  const orig = clean(original).split(" ");
  const spok = clean(spoken).split(" ");
  const used = new Array(spok.length).fill(false);
  const weakWords = [];
  let sum = 0;

  for (const ow of orig) {
    let best = 0, bestIdx = -1;
    spok.forEach((sw, i) => {
      if (used[i]) return;
      const s = wordScore(ow, sw);
      if (s > best) { best = s; bestIdx = i; }
    });
    if (bestIdx >= 0 && best >= 0.5) used[bestIdx] = true;
    if (best < 0.6) weakWords.push(ow);
    sum += best;
  }

  const extra = used.filter((u) => !u).length;        // 불필요한 삽입
  const raw = sum / Math.max(orig.length, 1);
  const penalty = Math.min(0.15, extra * 0.03);        // 경미 감점
  const score = Math.max(0, Math.round((raw - penalty) * 100));
  const stars = score >= 85 ? 3 : score >= 60 ? 2 : 1;
  return { status: "scored", score, stars, weakWords };
}
```
> `weakWords`는 UI에서 붉게 강조해 "여기만 다시 말해볼까?"로 연결(T2). 음소 함수는 MVP용 간이 버전이며, 정확도가 필요하면 `talisman`의 `doubleMetaphone`+`jaroWinkler`로 교체.
