# Typing-Voca 개발 진행 상황

> 진행 상태 추적 문서. 각 기능 단위(plan.md / claude.md 기준)의 완료 여부와 메모를 기록한다.

## 범례
- ✅ 완료 (빌드 + 모바일 검증 통과)
- 🟡 부분 완료 (MVP 한정 구현 / 후속 Phase에서 보강 예정)
- ⬜ 미착수

---

## Phase 0 — 기반 ✅ (완료)

| 단위 | 내용 | 상태 | 메모 |
|------|------|------|------|
| 0-1 | 프로젝트 초기 셋업 | ✅ | Next.js(App Router)+TS+Tailwind v4, Zustand sessionStore, 디자인 토큰, 모바일 전역 레이아웃, ESLint, .env 플레이스홀더. |
| 0-2 | Supabase 스키마 + RLS + 시드 | ✅ | `supabase/schema.sql`(words 공개읽기 + user_state/progress/study_sessions + auth.uid() RLS), `scripts/seed.ts`(Service Role 전용, `npm run seed`), `src/lib/supabase/client.ts`(anon, 미설정 시 null). **실연동 완료**: 실제 프로젝트에 스키마 적용 + **words 900행 적재** + anon 읽기 OK / INSERT 차단(42501) / 비로그인 progress 0행 **실측 검증**. |
| 0-3 | 구글 로그인 + 세션 가드 | ✅ | `/login`([Google로 계속하기]), `AuthProvider`(onAuthStateChange·signOut), `/auth/callback`, `AuthGuard`, 신규 유저 `user_state` upsert(`ensureUserState`). **실연동 완료**: Google OAuth Provider 활성화 + 키 등록 + 리다이렉트 허용목록 설정, authorize→accounts.google.com 302(scope `email profile`, client_id 정상) **실측 검증**. 비로그인 시 `/study`→`/login` 가드 동작 확인. |
| 0-4 | 데이터 레이어(조회/동기화/오프라인 큐) | ✅ | `getWords`(Supabase→캐시→번들 JSON 폴백), `lib/sync/userData.ts`(로드·배치 upsert·`study_sessions` insert), `offlineQueue.ts`(LocalStorage 큐 + `online` flush), 타입(UserState/Progress/StudySession) 추가. |
| 0-5 | 디자인 시스템 & 공통 컴포넌트 | ✅ | Button/Card/ProgressBar/Hearts/BottomActionBar/LoadingDots/BottomSheet/Toast, 다크모드(ThemeProvider+토글+시스템감지+FOUC방지), 접근성(포커스링·48px·aria·색+아이콘), framer-motion 프리셋 + `MotionConfig reducedMotion`. 샘플 페이지 `/sample`. |

> ℹ️ **graceful 동작 원칙**: Supabase 환경변수가 비어 있으면(미설정) 앱은 **로컬 게스트 모드**로 동작해 Phase 1 학습이 그대로 가능(규칙 6 학습 무중단). 환경변수를 채우면 **로그인-퍼스트 + 동기화**가 자동 활성화됩니다.
>
> ✅ **실연동 셋업 완료**: ① Supabase 프로젝트 생성 ✓ → ② `supabase/schema.sql` 실행 ✓ → ③ `.env.local` 채움 ✓ → ④ `npm run seed`로 900행 적재 ✓ → ⑤ Google OAuth Provider + 리다이렉트 허용목록 설정 ✓. 현재 앱은 **로그인-퍼스트 모드**로 동작.
>
> ⏳ **남은 사람 작업(검증만)**: 사용자 브라우저에서 `http://localhost:3000` → [Google로 계속하기] 실제 1회 로그인 (자동 프리뷰 브라우저로는 구글 동의 화면 완료 불가). 로그인 시 `user_state` 행 자동 생성.

---

## Phase 1 — 코어 타이핑 퀴즈 ✅ (완료)

| 단위 | 내용 | 상태 | 검증 |
|------|------|------|------|
| 1-1 | 학습 세션 셸 & 화면 골격 | ✅ | 상단 ProgressBar+Hearts, 중앙 문제 카드, 하단 BottomActionBar. 10문항 큐, 좌우 슬라이드 전환. 모바일(390px) 확인. |
| 1-2 | 타이핑 입력 UX(빈칸 채우기) | ✅ | 한글 뜻+빈칸 영문, 글자 수만큼 언더바(mono), 한 글자씩 채워지는 모션, 대소문자/공백 처리, 입력 16px+, autofocus+scrollIntoView. |
| 1-3 | 정답/오답 판정 + 마이크로 인터랙션 | ✅ | 정답: 초록 플래시+컨페티+햅틱+체크아이콘. 오답: shake+하트 차감+격려 톤+첫 글자 힌트. 하트 3소진→복습 후보 처리. |
| 1-4 | 1세트(10문항) 루프 완성 | ✅ | 10문항 완주, 문항별 결과(첫시도 정답/하트 소진) 누적, 임시 결과창 이동. 섀도잉 자리는 placeholder(Phase 3에서 구현). |

**검증 방법**: `npm run build` 통과(타입체크+lint), 브라우저 프리뷰(390px)에서 정답 흐름(플래시·컨페티·섀도잉 placeholder)과 오답 흐름(하트 차감·격려·힌트) 실측 확인.

---

## Phase 2 — 대시보드 + 학습 데이터 + Streak + 카테고리 선택 ✅ (완료)

| 단위 | 내용 | 상태 | 검증 |
|------|------|------|------|
| 2-1 | 유저 데이터 스토어(Supabase 동기화) | ✅ | `stores/userStore.ts`(level/streak/lastStudyDate/totalLearned/progress맵/preferredCategories/onboarded, 세션 중 메모리). 로그인 시 `loadUserData`로 적재, 체크포인트(레벨확정·카테고리저장·세션완료 훅)에서만 배치 upsert. 비로그인(게스트)은 `localProfile`(LocalStorage)에 영속 → **학습 무중단**. |
| 2-2 | 메인 로비/대시보드 UI | ✅ | 홈(`/`)이 대시보드. 상단 상태(Lv./누적단어/Streak🔥), CTA([오늘의 10단어]/[카테고리 학습]/[오답 노트]=`in_review` 있을 때만), 하단 [통계 히스토리]·[주간 리포트] 진입점. 로그인-퍼스트(미로그인 시 Google 카드), 게스트는 바로 진입. |
| 2-3 | 레벨 테스트(온보딩) | ✅ | 최초 접속(미온보딩) 시 5문항 타이핑 테스트 → 정답 수로 Lv.1~3 확정 + 저장(`onboarded=true`), 로비 이동. "추정치·자동 조정" 안내. 재방문 시 건너뜀(브라우저 실측). |
| 2-4 | Streak 로직 + 불꽃 비주얼 | ✅ | `lib/streak.ts`(오늘 완료=+1 / 하루 건너뜀=리셋, 날짜 모킹 테스트 통과), `StreakFlame`(streak 구간별 불꽃 강화 모션). 세션완료 시 갱신용 `markStudiedToday` 액션 제공(실제 호출은 Phase 4 결과창에서 연결). |
| 2-5 | 카테고리 선택 학습 | ✅ | 12개 카테고리 멀티 선택 바텀시트(아이콘+토글칩), 선택을 `preferred_categories`에 저장(다음 기본값 복원). [카테고리 학습]→해당 범위 세션 구성, 부족 시 5.6 충원(인접 레벨 확장). 선택 0개면 전체. 브라우저에서 선택→`/study?mode=category` 세션 구성·영속 실측. |

**검증 방법**: `npm run build` 통과. 핵심 로직(streak +1/리셋·레벨 산정·불꽃 구간·카테고리 충원) 단위 검증 통과. 게스트 모드 프리뷰(390px·라이트/다크)에서 레벨테스트→대시보드→카테고리 시트→카테고리 세션→재방문 건너뜀까지 무에러 실측.

> ⚠️ **실연동 시 1회 마이그레이션 필요**: `user_state`에 `onboarded` 컬럼이 추가됐습니다(레벨 테스트 완료 여부의 단일 소스). Supabase SQL Editor에서 아래 한 줄(또는 `supabase/schema.sql` 재실행)을 실행하세요. 기존 행에는 자동으로 `false`가 채워집니다.
> ```sql
> alter table public.user_state add column if not exists onboarded boolean not null default false;
> ```

---

## Phase 3 — 섀도잉 챌린지 + 채점 고도화 ✅ (완료)

| 단위 | 내용 | 상태 | 검증 |
|------|------|------|------|
| 3-1 | 기능 감지 & 3단계 폴백 + 권한 UX | ✅ | `hooks/useSpeechSupport.ts`(TTS/STT webkit 감지·online/offline 반응·iOS PWA 감지 → `full`/`listening`/`typingOnly` 결정), `types/speech.d.ts`(SpeechRecognition 타입 선언), `UnsupportedBanner`(비차단·닫기 가능, 오프라인/iOS PWA/listening/미지원별 안내 + T9 톤). 오프라인·iOS PWA는 자동 `typingOnly` 강등. |
| 3-2 | TTS 자동 재생 + 느리게 다시 듣기 | ✅ | `lib/speech/tts.ts`(en-US 음성 선택·`speak(rate)`·`cancelSpeech`·`registerTTSVisibilityGuard`로 탭 비활성 시 pause/resume). 정답 직후 자동 1회 재생, [느리게 다시 듣기](rate 0.7), `SpeakerPulse`(재생 중 펄스 모션) + `aria-live`. |
| 3-3 | STT 녹음 + 채점 + 별 등급 UI | ✅ | `lib/speech/stt.ts`(webkit 포함·error 종류 매핑·no-speech/not-allowed 분기), `StarRating`(별 톡톡 등장 T1·색+개수+aria 이중표시 T5). ⭐⭐⭐ "Perfect Echo"+컨페티 / ⭐⭐ "Nice!" / ⭐ "Keep going" / 🎤 "다시 한 번"(실패 아님·무한 재시도). **브라우저 실측**: STT 실패가 retry로 분기(크래시 없음). |
| 3-4 | 폴백·건너뛰기 + 단계 통합 | ✅ | `ShadowingView`가 3모드 통합: full(마이크 채점) / listening([다시]/[잘 했어요] 자가 체크) / typingOnly(자동 스킵). 모든 모드 [건너뛰기] 제공, 채점 후 [다음 문제] 또는 3초 자동 전환. 타이핑→섀도잉→다음이 한 흐름. |
| 3-5 | 채점 알고리즘 고도화 | ✅ | `lib/shadowing/score.ts`: 정규화(축약 전개 30종+동음 사전) → 단어 정렬 → 단어별 부분 점수(완전일치/동음/문자 Levenshtein/음소 soundex류) → 가중 점수 + `weakWords`(문장에 붉은 물결밑줄 강조). 삽입 단어 경미 감점, 신뢰도는 retry 게이트 전용. |

**검증 방법**: `npm run build` 통과. `scripts/test-score.ts`(node --experimental-strip-types) 단위 테스트 **6/6 통과** — perfect=100, 축약형=고득점, 동음 오인식(to/too·see/sea)=고득점(0점 아님), 부분 발화=중간+weakWords, 빈 결과·저신뢰도=retry. 게스트 프리뷰(390px·다크)에서 타이핑 정답→섀도잉(TTS 자동재생·스피커 펄스·느리게 듣기·마이크) → STT 실패 retry 분기 → 건너뛰기 → 다음 문항까지 무에러 실측.

> ℹ️ **프리뷰 환경 한계**: 자동화 헤드리스 Chrome은 `SpeechRecognition`이 존재해도 실제 음성 서비스/마이크가 없어 항상 retry로 떨어집니다. 실제 채점·별점은 데스크톱 Chrome/Edge 실기기에서 마이크로 발화 시 동작합니다(채점 로직 자체는 단위 테스트로 검증 완료).

---

## Phase 4 — 결과창 + 복습 졸업 + 세션 기록 + 출제 로직 ✅ (완료)

| 단위 | 내용 | 상태 | 검증 |
|------|------|------|------|
| 4-1 | 세션 결과창 + 축하 + 배치 동기화 | ✅ | `SessionResult`: 학습 단어·첫 시도 정답·**평균 별점**·복습 노트 + 단어별 별점(⭐/⏭/📒/✓) + canvas-confetti. 세트 완주 시 **1회 배치 커밋**(`userStore.commitSession`)으로 streak 갱신(2-4 연결)·total_learned·progress·study_sessions를 함께 반영. 후속 버튼 [방금 틀린 단어 복습]/[한 세트 더]/[메인 로비]. **StrictMode 중복 커밋 방지**: `sessionStore.committed` 플래그를 `getState()`로 즉시 확인·세팅(이펙트 1회 커밋 보장). |
| 4-2 | 복습 졸업 규칙(SRS-lite) | ✅ | `lib/srs.ts`(`computeProgressUpdate`): in_review 진입(하트 소진 OR ⭐1 이하), 통과(첫 시도 정답 + ⭐⭐ 이상), 1차 통과→next_due+1일·2차 통과→졸업(in_review=false)·통과 실패→pass_count 리셋(행 유지). (user_id, word_id) 복합키. **단위 테스트 7/7 통과**(진입·통과·졸업·리셋·스킵·isDue). |
| 4-3 | 출제 로직 + 적응형 레벨 제안 | ✅ | `buildSession`(신규 70% + 복습 30%, 신규는 미학습 우선→오래된 순, 복습은 next_due 지난 것 오래된 순, 카테고리 필터·인접 레벨 충원, 세션 내 중복 금지). `suggestLevelAdjustment`(첫 시도 정답률↑+평균 ⭐⭐↑→상향 / 하트 소진율↑→하향)은 **강제 없이 토스트 제안만**(T2 톤). |
| 4-4 | 세션 기록 저장(study_sessions) | ✅ | `commitSession`이 study_sessions 요약 1행(level·categories·words_count·correct_first_try·avg_stars·avg_score·review_count·study_date)을 progress upsert와 함께 **1회 묶어** 큐잉→`syncNow`. 오프라인이면 LocalStorage 큐(`offlineQueue`)에 적재 후 `online` 복귀 시 flush. 로그인 유저만 클라우드 기록(게스트는 메모리 누적). |

**검증 방법**: `npm run build` 통과. SRS 단위 테스트 **7/7**(`scripts/test-srs.ts`, alias 로더 경유) + 채점 **6/6** 통과. 게스트 프리뷰(390px)에서 10문항 완주 → 결과창(통계·컨페티·단어별 별점·[방금 틀린 단어 복습 (N)] 버튼) 정상, 완주 후 streak=1·last_study_date=오늘·total_learned 정확 누적·복습 노트 진입 실측. **참고**: dev-guest(3100)는 `.env.local` 실자격이 launch.json 인라인 placeholder보다 우선 적용되는 경우가 있어, 게스트 모드 강제 검증 시 `.env.local`을 잠시 옆으로 옮겨 확인함(현재 원복 완료).

---

## Phase 5 — 통계 히스토리 + 주간 리포트 + 최종 QA ✅ (완료)

| 단위 | 내용 | 상태 | 검증 |
|------|------|------|------|
| 5-1 | 통계 히스토리 화면 | ✅ | `/stats`: 학습한 단어·졸업한 단어 요약 카드 + **스트릭 캘린더 히트맵**(최근 10주, 학습량 강도별 4단계) + **학습량·점수 추이 차트**(recharts ComposedChart, 14일 막대=학습 단어 + 라인=평균 점수, 우측 0~100 점수축) + **카테고리별 숙련도 바**(졸업/학습 비율 %). 데이터 없으면 친절한 빈 상태. 차트는 `dynamic(ssr:false)`로 로드, `isAnimationActive=false`(헤드리스/SSR 안정). 집계는 순수 함수 `lib/stats/aggregate.ts`. |
| 5-2 | 주간 리포트 | ✅ | `/report`: 최근 7일 집계(학습한 날 N/7·총 학습 단어·평균 점수·평균 별점·전주 대비 일수/단어 증감·집중 분야·가장 잘 외운 분야·연속 학습). `WeeklyReportCard` 공용. **새 주 첫 진입 시 대시보드에서 바텀시트 자동 노출**(`WeeklyReportAuto`, `tv:report:lastSeenWeek`로 주(週) 1회·닫기 가능), [주간 리포트] 메뉴로 다시 보기. |
| 5-3 | 최종 QA(다크모드·접근성·모바일) | ✅ | 신규 화면 라이트/다크 양쪽 대비·가독성(히트맵 강도·차트 막대/라인·카드) 실측. 접근성: 캘린더 `role=img`+aria-label, 숙련도 바 `role=progressbar`(aria-valuenow), 뒤로가기 버튼 aria-label, 48px 터치 타겟. 모바일 390px 레이아웃·`prefers-reduced-motion`(전역 MotionConfig) 유지. 콘솔 에러 0. |

**검증 방법**: `npm run build` 통과. 집계 단위 테스트 **7/7**(`scripts/test-stats.ts`: 날짜 키·캘린더·가중 평균 추이·졸업/복습 합계·카테고리 숙련도·주간 리포트 총계와 전주 대비·빈 데이터) + SRS 7/7 + 채점 6/6 통과. 게스트 프리뷰(390px·라이트/다크)에서 시드 세션으로 `/stats`(요약·히트맵·막대+라인 차트·카테고리 바) → `/report`(6/7일·전주 대비 +2일·+20단어·평균 78점·⭐2.2·연속 5일) → 대시보드 진입 시 주간 리포트 시트 자동 노출까지 무에러 실측.

> ℹ️ **게스트 모드 통계의 한계(설계상 정상)**: 로그인 유저는 클라우드(`study_sessions`+`progress`)에서 전체 이력을 불러와 요약·캘린더·추이·카테고리 숙련도가 모두 채워집니다. 게스트는 세션 요약을 LocalStorage(`tv:stats:sessions:guest`)에 누적하므로 캘린더·추이·주간 리포트는 동작하지만, **단어별 숙련도(progress)는 메모리 기반이라 새로고침 후 초기화**되어 "학습한/졸업한 단어"와 카테고리 숙련도가 비어 보일 수 있습니다(클라우드 동기화 시 해소).

---

## 실행 방법
```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # 프로덕션 빌드 + 타입/lint 검증
npm run seed     # (Supabase 설정 후) words 900행 적재
node --experimental-strip-types scripts/test-score.ts  # 섀도잉 채점 단위 테스트(6/6)
node --experimental-strip-types --import ./scripts/test-bootstrap.mjs scripts/test-srs.ts  # SRS 복습 규칙(7/7)
node --experimental-strip-types --import ./scripts/test-bootstrap.mjs scripts/test-stats.ts  # 통계 집계(7/7)
```
- 홈(`/`) = 대시보드 → [오늘의 10단어]/[카테고리 학습]/[오답 노트] → 학습 화면(`/study`)
- 통계/리포트 진입점: `/stats`·`/report`(Phase 5 자리표시 "준비 중" 화면)
- 디자인 시스템 미리보기: `/sample`
- 로그인 화면: `/login` (Supabase 설정 시에만 가드 동작)
- **게스트 모드 QA**: `.claude/launch.json`의 `dev-guest`(포트 3100)는 Supabase 미설정 상태를 흉내 내 로그인 없이 대시보드/레벨테스트/카테고리를 점검하는 용도.

## 알려진 메모
- **Supabase 실연동 활성화 상태** — 앱이 로그인-퍼스트 모드로 동작. words 900행 적재 완료. 배포 시 운영 도메인의 콜백 URL을 Google OAuth 승인 리디렉션 + Supabase Redirect URLs에 추가 필요.
- **(Phase 2) `onboarded` 컬럼 마이그레이션 1회 필요** — Supabase SQL Editor에서 `alter table public.user_state add column if not exists onboarded boolean not null default false;` 실행(또는 `supabase/schema.sql` 재실행). 미실행 시 로그인 유저의 레벨 테스트 완료 저장이 동작하지 않음(게스트 모드는 영향 없음).
- Next.js는 15.5.4 사용. `npm audit`에 표시되는 권고들은 대부분 미사용 기능(middleware/image optimizer/server actions) 대상이라 로컬 학습 MVP 동작에 영향 없음. 배포 전 16.x 안정 라인으로 일괄 업그레이드 검토.
- 다크 모드 토글 UI는 0-5에서 구현 완료(홈/학습/샘플 헤더). 전 화면 일괄 점검은 Phase 5 최종 QA에서.
