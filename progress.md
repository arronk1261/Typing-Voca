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

## Phase 6 — 콘텐츠 정제 ✅ (완료)

> v6 단어 DB(2,520문항) 구축 과정에서 6-1·6-2·6-4가 사실상 완료됐고, 이번에 **6-3(중복 정리)**를 마무리하며 Phase 6 전 단위를 닫음.

| 단위 | 내용 | 상태 | 검증 |
|------|------|------|------|
| 6-1 | 콘텐츠 검수 스크립트 | ✅ | `scripts/validateWords.ts`(`npm run validate:words`): 필드 누락·enum·빈칸 1개·**빈칸채움=tts 일치**·placeholder 누수(`someone/something`)·**카테고리 내 answer 중복**·셀당 70개를 전수 리포트. 회귀 방지용 상시 재사용. **전수 결과: 오류 0건.** |
| 6-2 | 확정 오류 수정 | ✅ | 구 900문항 시절 템플릿 오류 4건(`ping someone`→`ping` 등)·placeholder 9건은 v6 신규 생성 시 원천 제거. 현재 검수기에서 **answer placeholder 누수 0건**(경고 6건은 모두 `something/someone`이 *answer가 아닌 자연스러운 전체 문장*에 포함된 정상 표현). |
| 6-3 | 중복 answer 정리 + 사유 기록 | ✅ | `scripts/dedupReport.ts`(`npm run dedup:report`): 중복을 **의도적 재노출**(다른 카테고리·다른 예문 → 간격 반복에 유익, 유지) vs **오염**(동일 카테고리 또는 동일 예문 단순 복제 → 교체)으로 자동 분류. 카테고리 내 중복 0종, 카테고리 간 중복 238종 중 **동일 예문 오염 9종을 카테고리 맥락에 맞는 예문으로 차별화**(예: social "drop by"→"Why don't you drop by after work?"). 재실행 결과 **오염 0종**, 사유 로그 `docs/duplicate-answer-report.md` 생성. |
| 6-4 | 콘텐츠 태깅 + 스키마 확장 | ✅ | `words`에 `display_sentence`/`frequency`/`chunk_type`/`difficulty_axis`/`use_case`(text[]) 추가(`supabase/migrations/v6_words_tags.sql`+`schema.sql`), `types/index.ts` `Word` 확장, `scripts/assembleWords.ts` 파이프라인. **2,520개 전수 태깅·시드 완료**(idiom 약 14%로 절제). 규격: `docs/word-content-spec-v6.md`. |

**검증 방법**: `npm run validate:words`(오류 0/2,520행) + `npm run dedup:report`(오염 0종) + `npm run build` 통과. 6-3 수정분 9건은 `generated/*.json` 원천 패치 → `npm run assemble:words` 재조립(id 재할당+검증) → **Supabase 재시드(2,520행)** → 루트 `words.json`/`words.csv` 동기화까지 일괄 반영. 콘텐츠 단일 소스(`src/data/words.json`·루트 백업·Supabase) 3중 일치 확인.

> ℹ️ **6-3 판정 기준 메모**: "다른 카테고리에서 서로 다른 예문으로 등장"은 학습상 **간격 반복**이라 일부러 남깁니다(238종 유지). 제거 대상은 "같은 문장을 그대로 복붙한" 9종뿐이었고, 모두 카테고리 맥락(식당 결제·IT 프린터·친구 방문 등)에 맞는 새 예문으로 바꿔 재노출로 전환했습니다. 전체 목록·사유는 `docs/duplicate-answer-report.md` 참조.

---

## Phase 7 — 진단·채점 신뢰도 ✅ (완료)

> "운 좋게 레벨이 정해지고, 맞는 답인데 틀렸다고 나오는" 신뢰 문제를 제거하는 단계. 레벨 진단을 **랜덤 → 검증된 앵커**로 바꾸고, 채점을 **정답 수만 → 다요소 가중**으로 바꾸고, 추정 레벨을 **학습 중 자동 보정**하며, 정답 허용범위를 넓히고, 오답 힌트를 단계화함.

| 단위 | 내용 | 상태 | 검증 |
|------|------|------|------|
| 7-1 | 앵커 레벨테스트 | ✅ | `scripts/buildAnchorTest.ts`(`npm run build:anchors`)가 6-4 태그(고빈도·single_word/collocation 우선)로 레벨별 4문항씩 **결정적**으로 선별 → `src/data/anchorTest.json`(12문항, 카테고리 분산). `pickLevelTest`를 앵커 로딩으로 교체 → **매 진입 동일 난이도 분포**(랜덤·운 요소 제거). |
| 7-2 | 다요소 채점 + "추천 시작 레벨" | ✅ | `src/lib/words/levelScore.ts`의 `scoreLevelTest`: 정답 여부 외 **힌트 사용·재시도·응답시간·멀티워드 성공**을 문항 레벨 가중으로 합산 → 비율(0~1)로 Lv.1~3 추천. LevelTest 결과 UI를 "Lv.X 확정"이 아닌 **"추천 시작 레벨"**(T2 격려 톤)로. 단위 테스트: 동일 정답수라도 힌트 다용/저속 응답이 점수·레벨을 낮춤. |
| 7-3 | 임시 레벨 자동 보정 | ✅ | `user_state`에 `level_provisional`·`calibration_questions`·`calibration_correct` 추가(`supabase/migrations/v7_user_state_calibration.sql`+`schema.sql`+`types`). `src/lib/words/calibration.ts`의 `applyCalibration`: provisional 동안 세션 결과를 누적, **누적 30문항(3세트) 도달 시** 정답률로 확정/상향/하향. `userStore.completeOnboarding`/`commitSession` 연동, 게스트는 `localProfile`에 보존. 단위 테스트: 30 미만은 provisional 유지, 30 도달 시 확정·고/저정답률 조정. |
| 7-4 | 정답 허용범위 확대 | ✅ | `src/lib/typing/answerCheck.ts`의 `canonicalAnswer`/`isAnswerCorrect`: 축약(`I'll`=`I will`·`don't`=`do not`)·하이픈/공백(`well-known`=`well known`)·아포스트로피·대소문자·관사(`a`=`an`) 차이를 흡수, `Word.accepted_answers[]` 변형 허용. **핵심 철자 차이(`recommended`≠`recommend`·`expensive`≠`overpriced`)는 차단.** 단위 테스트로 통과/차단 케이스 검증. |
| 7-5 | 멀티워드 단계 힌트 | ✅ | `src/lib/typing/hints.ts`의 `stagedHint`: 오답 1회차 **첫 글자** → 2회차 **단어/글자 수(+머리글자)** → 3회차 **청크 단위 공개**(첫 단어+나머지 빈칸). `QuestionView`가 오답 횟수에 따라 단계 힌트를 표시. |

**검증 방법**: `npm run test:phase7`(**23/23 통과** — 7-2 채점 5 / 7-3 보정 6 / 7-4 허용범위 8 / 7-5 힌트 4) + `npm run build`(타입·lint 0 오류) + `npm run build:anchors`(앵커 12문항 재생성). Supabase 동기화는 **v7 컬럼 부재 시 핵심 필드만 재저장하는 무중단 폴백**(`userData.ts`)을 넣어 마이그레이션 적용 전에도 streak·level 저장이 끊기지 않음. 적용 여부 확인: `node --env-file=.env.local --experimental-strip-types scripts/checkUserStateColumns.ts`.

> ⚠️ **운영 반영 필수(수동 1회)**: 7-3은 `user_state` 스키마를 확장하므로 **Supabase SQL Editor에 `supabase/migrations/v7_user_state_calibration.sql`을 1회 붙여넣어 실행**해야 보정값이 클라우드에 저장됩니다(v6 적용과 동일 방식). 적용 전에도 앱은 무중단으로 동작(위 폴백).

> ℹ️ **7-3 설계 메모**: 레벨테스트는 이제 **"확정"이 아니라 "추천 시작 레벨"**만 제시하고 provisional로 시작합니다. 이후 실제 학습 3세트(30문항)의 첫 시도 정답률로 자동 확정·조정하므로, 테스트 한 번의 운에 레벨이 묶이지 않습니다(정답률 ≥0.85 상향 / <0.45 하향 / 그 사이 유지).

---

## Phase 8 — 장기 기억·적응 ✅ (완료)

> "한 세트 단위 복습 노트"를 넘어 **누적 안정성 기반 장기 기억 시스템**으로. 복습 간격을 길게, 출제 비율을 상황 적응형으로, 승급을 누적 데이터로, 졸업 단어를 주기적 유지 점검으로 전환.

| 단위 | 내용 | 상태 | 검증 |
|------|------|------|------|
| 8-1 | SRS 간격 장기화 | ✅ | `srs.ts`: 졸업 2회 → **기본 3회**(가장 어려운 **Lv.3 관용구는 4회**), 복습 간격 `1→3→7→14일`(`REVIEW_INTERVALS`). `QuestionResult`에 `wordLevel`/`wordChunkType` 추가해 졸업 정책 분기. `graduationTarget`/`intervalForPass`. |
| 8-2 | 3요소 분리 기록 | ✅ | `progress`에 `meaning_recall_score`·`spelling_score`·`pronunciation_score` 추가(`v8_progress_components.sql`+`schema.sql`+`types`). 타이핑=뜻 회상(끝내 맞히면 100)/철자(재시도마다 −35), 섀도잉=발음(STT 점수). `srs.ts`에서 산출·저장(스킵 시 직전 발음 점수 유지). |
| 8-3 | 적응형 출제 비율 | ✅ | `lib/words/adaptive.ts`의 `adaptiveReviewRatio`: 복귀자(streak 끊김) **0.7** / 오답 누적 多 **0.6** / Lv.1 초반 **0.5** / 안정 **0.3**. 카테고리 학습은 `orderByCategoryFlow`로 상황 흐름 순서 묶음. `buildSession`이 상태로 비율 산출. |
| 8-4 | 크로스레벨 복습 로드 | ✅ | `userData.loadLevelProgress`: 현재 레벨 progress + (레벨 무관) **`in_review=true` 전부**를 2쿼리로 병합 로드 → 레벨 상향 후에도 이전 레벨 복습 대상이 출제 풀에 유지. |
| 8-5 | 누적 기반 승급 정책 | ✅ | `suggestLevelFromHistory`(최근 ≤5세트 롤링, ≥30문항): 정답률 ≥0.85·복습진입률 ≤0.15·평균별점 ≥2.2 → 상향 / 정답률 <0.5 또는 복습률 ≥0.4 → 하향. `userStore.recentSessions`(localStorage 영속)에 세트 요약 누적, `SessionResult`가 윈도우로 판정(단일 세트 흔들림 제거). 토스트는 "Lv.X 맛보기/기초 다지기 모드"(강제 X, T2). |
| 8-6 | 졸업 후 유지 점검 | ✅ | `isGraduated` + `pickMaintenanceWords`: 졸업 단어 중 **마지막 학습 ~30일 경과** 1개를 세션 풀에 소량 혼입 재출제 → 장기 망각 방지. |

**검증 방법**: `npm run test:phase8`(**25/25 통과** — 8-1 간격/졸업 6 · 8-2 3요소 5 · 8-3 비율 5 · 8-5 승급 5 · 8-6 유지 3 · 보조 1) + `npm run test:srs`(새 졸업 정책 8/8) + `npm run build`(타입·lint 0 오류). 순수 적응 로직은 `lib/words/adaptive.ts`로 분리해 데이터 의존 없이 단위 검증. Supabase 동기화는 **v8 컬럼 부재 시 점수 컬럼만 떼고 재저장하는 무중단 폴백**(`userData.ts`) — 마이그레이션 전에도 progress 저장이 끊기지 않음.

> ⚠️ **운영 반영 필수(수동 1회)**: 8-2는 `progress` 스키마를 확장하므로 **Supabase SQL Editor에 `supabase/migrations/v8_progress_components.sql`을 1회 실행**해야 3요소 점수가 클라우드에 저장됩니다(v6/v7과 동일 방식). 적용 전에도 앱은 무중단으로 동작(위 폴백). 적용 확인: `npm run check:schema`(v7·v8 컬럼 일괄 점검).

> ℹ️ **8-1 졸업 정책 메모**: plan 5.5의 "통과 2회 졸업"을 **8-1에서 3회로 강화**(간격 1→3→7→14일). 가장 까다로운 **Lv.3 관용구만 4회**로 더 길게 반복해 장기 기억을 다집니다. `test-srs.ts`도 새 정책으로 갱신.

---

## Phase 9 — 신뢰도·무중단·적응 보강 ✅ (완료)

> 외부 코드리뷰(Codex) 피드백 반영. **"학습은 어떤 환경에서도 멈추지 않는다"** 원칙을 깨던 졸업 차단 버그를 최우선 수정하고, 진단·출제 품질과 클라우드 누적성을 끌어올림. **DB 스키마 변경 없음**(전부 클라이언트 로직·기존 태그 파생).

| 단위 | 내용 | 상태 | 검증 |
|------|------|------|------|
| A1 | typingOnly 졸업 차단 버그 수정 | ✅ | `QuestionResult.shadowMode` 기록. `srs.ts` `isPass`/`isFail`/`computeProgressUpdate`를 모드 인지형으로: **typingOnly는 타이핑만으로 졸업 가능**, 발음 미응시(자발적 스킵)는 `pass_count` 리셋 없는 **중립** 처리. 실패(하트 소진/약한 발음)만 리셋·복습. |
| A3 | graduatedCount 승급 반영 | ✅ | `suggestLevelFromHistory`에 졸업 누적(≥5) 조건 추가 — 정답률만 높고 실제 졸업이 없으면 상향 제안 보류. |
| A4 | 빌드 경고 0 | ✅ | `userData.ts`의 unused 구조분해를 `omitKeys` 유틸로 교체(ESLint 0). |
| B1 | 저빈도 출제 상한 | ✅ | 기본 세션 신규 출제에서 `frequency=low`(niche)를 ≤10%로 제한(`limitLowFrequency`). 카테고리 학습은 선택 존중해 제외. |
| B2 | 앵커 진단 블루프린트 | ✅ | `buildAnchorTest.ts` 재설계 — 레벨별 chunk_type 슬롯(L1 단어 / L2 연어·구동사·문장틀 / L3 연어·구동사·문장틀·관용구) + 카테고리 분산(≥8). `anchorTest.json` 재생성(**11개 카테고리·고급 청크 포함**). |
| B3 | 레벨테스트 다축 점수 | ✅ | `levelScore.ts`: 단일 ratio에 더해 **레벨별 ratio·청크유형별 점수·강약 피드백**("단어는 탄탄, 덩어리 표현 연습" 등). 결과 화면에 격려 카드 노출. |
| B4 | 카테고리 미니 시나리오 | ✅ | `orderByCategoryFlow`에 use_case 흐름(공항→호텔→길찾기…) 2차 정렬 추가. |
| C1 | 클라우드 롤링 승급 | ✅ | `loadRecentSessions`로 `study_sessions` 최근 5세트를 로그인 시 시드 → **기기 간 승급 판단 일관**. 세션 종료 시 메모리 윈도우에 이어붙임. 로컬 캐시는 게스트/오프라인 보조. |
| C2 | 커리큘럼 레이어 | ✅ | 재태깅 없이 기존 태그에서 `curriculumLayer`(survival/daily/work/advanced) 파생. 초급(Lv.1 <30문항)은 생존·일상 표현 우선 출제(`orderByCurriculum`). |
| C3 | 발음 난이도·포커스 | ✅ | `pronunciationDifficulty`(th·r/l·v/f·자음군 휴리스틱) + 세션 발화 약점을 모아 결과 화면 **"발음 포커스"** 노출(`focusWords`). |

**검증 방법**: `npm run test:srs`(**12/12**, typingOnly·listening·중립 케이스 추가) + `npm run test:phase8`(**34/34**, B1·B3·B4·C2·C3 추가) + `npm run test:phase7`(23/23) + 섀도잉 채점(6/6) + 통계(7/7) + `npm run build`·`npm run lint`(경고 0).

> ℹ️ **마이그레이션 불필요**: Phase 9 본편은 새 DB 컬럼을 추가하지 않습니다(weakWords는 세션 메모리에서만 사용). C1은 기존 `study_sessions`를 읽기만 합니다. → **Phase 9-1에서 보류 항목을 마저 구현**(아래).

### Phase 9-1 — 보류 항목 구현(주간 발음 리포트 + 발음 전수 분석) ✅

| 단위 | 내용 | 상태 | 검증 |
|------|------|------|------|
| 9-1a | 영속 주간 발음 리포트 | ✅ | `study_sessions.weak_words`(text[]) 추가(**v9 마이그레이션**). `commitSession`이 세션 약점 단어를 요약에 적재, `saveStudySession`은 컬럼 부재 시 떼고 재시도(무중단). `aggregate.ts`가 이번 주 약점을 **빈도×난이도 랭킹**(`rankWeakWords`)+**음소 요소 집계**(`topPhonemeFeatures`)로 산출, 주간 리포트 카드에 "이번 주 발음 약점" 섹션 노출. |
| 9-1b | 발음 난이도 전수 분석·태깅 | ✅ | `pronunciation.ts`에 `pronunciationFeatures`(th·r/l·v/f·z·자음군) + `PHONEME_LABEL`. `scripts/tagPronunciation.ts`(`npm run tag:pronunciation`)가 **2,520단어 전수 분류** → `docs/pronunciation-coverage.md`(난이 요소 1개+ 단어 **1,363개=54%**, 기존 `difficulty_axis=pronunciation` 23개 대비 대폭 확대). 런타임은 동일 함수로 파생 계산하므로 **DB 컬럼·시드 불필요**. |

**검증 방법(9-1)**: `npm run test:phase8`(**37/37**, 9-1a/9-1b 케이스 추가) + `npm run test:stats`(**8/8**, 주간 발음 약점 케이스 추가) + `npm run tag:pronunciation`(커버리지 리포트) + `npm run build`·`npm run lint`(경고 0).

> ⚠️ **운영 반영 필수(수동 1회)**: 9-1a는 `study_sessions` 스키마를 확장하므로 **Supabase SQL Editor에 `supabase/migrations/v9_session_weak_words.sql`을 1회 실행**해야 약점 단어가 클라우드에 저장됩니다. **미실행이어도 무중단**(`userData.ts`가 `weak_words` 컬럼 부재 시 떼고 저장) — 단, 적용 전에는 주간 발음 리포트가 비어 있을 수 있음(게스트 모드는 로컬 통계라 영향 없음).

---

## 실행 방법
```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # 프로덕션 빌드 + 타입/lint 검증
npm run seed     # (Supabase 설정 후) words 2,520행 적재
npm run validate:words   # 콘텐츠 전수 검수(필드·빈칸채움=tts·placeholder·중복·셀70) — 오류 0
npm run dedup:report     # 중복 answer 분석 → docs/duplicate-answer-report.md (오염 0종)
npm run assemble:words   # generated/*.json → src/data/words.json 재조립(id 재할당+검증)
npm run build:anchors    # 레벨테스트 앵커 12문항 재생성 → src/data/anchorTest.json (Phase 7-1/9-B2)
npm run tag:pronunciation # 발음 난이도 전수 분석 → docs/pronunciation-coverage.md (Phase 9-1b)
npm run test:phase7      # Phase 7 진단·채점 단위 테스트(23/23)
npm run test:phase8      # Phase 8+9 적응·신뢰도 단위 테스트(37/37)
npm run test:srs         # SRS 졸업/간격 규칙(12/12, 8-1·9-A1 정책 반영)
npm run check:schema     # Supabase v7·v8 마이그레이션 컬럼 적용 여부 점검
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
- **Supabase 실연동 활성화 상태** — 앱이 로그인-퍼스트 모드로 동작. **words 2,520행(v6 스키마) 적재 완료**(구 900행에서 확충, Phase 6). 배포 시 운영 도메인의 콜백 URL을 Google OAuth 승인 리디렉션 + Supabase Redirect URLs에 추가 필요.
- **(Phase 2) `onboarded` 컬럼 마이그레이션 1회 필요** — Supabase SQL Editor에서 `alter table public.user_state add column if not exists onboarded boolean not null default false;` 실행(또는 `supabase/schema.sql` 재실행). 미실행 시 로그인 유저의 레벨 테스트 완료 저장이 동작하지 않음(게스트 모드는 영향 없음).
- **(Phase 7) `user_state` 보정 컬럼 마이그레이션 1회 필요** — `supabase/migrations/v7_user_state_calibration.sql`(`level_provisional`·`calibration_questions`·`calibration_correct`)을 SQL Editor에서 1회 실행. ✅ **적용 완료**(`npm run check:schema`로 확인). **미실행이어도 무중단**(`userData.ts`가 컬럼 부재 시 핵심 필드만 재저장).
- **(Phase 8) `progress` 3요소 점수 컬럼 마이그레이션 1회 필요** — `supabase/migrations/v8_progress_components.sql`(`meaning_recall_score`·`spelling_score`·`pronunciation_score`)을 SQL Editor에서 1회 실행. **미실행이어도 무중단**(`userData.ts`가 컬럼 부재 시 점수 컬럼만 떼고 재저장) — 단, 적용 전에는 3요소 점수가 클라우드에 저장되지 않음(게스트 모드는 영향 없음). 적용 확인: `npm run check:schema`.
- **(Phase 9-1) `study_sessions` 약점 단어 컬럼 마이그레이션 1회 필요** — `supabase/migrations/v9_session_weak_words.sql`(`weak_words text[]`)을 SQL Editor에서 1회 실행. **미실행이어도 무중단**(`userData.ts`가 컬럼 부재 시 `weak_words`만 떼고 세션 저장) — 단, 적용 전에는 주간 발음 리포트가 비어 있을 수 있음(게스트 모드는 로컬 통계라 영향 없음).
- Next.js는 15.5.4 사용. `npm audit`에 표시되는 권고들은 대부분 미사용 기능(middleware/image optimizer/server actions) 대상이라 로컬 학습 MVP 동작에 영향 없음. 배포 전 16.x 안정 라인으로 일괄 업그레이드 검토.
- 다크 모드 토글 UI는 0-5에서 구현 완료(홈/학습/샘플 헤더). 전 화면 일괄 점검은 Phase 5 최종 QA에서.
