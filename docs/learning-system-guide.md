# Typing-Voca 학습 시스템 상세 가이드

> 이 문서는 **학습 한 바퀴가 어떻게 돌아가는지**, 그리고 **단어 점수·졸업이 어떤 규칙으로 매겨지고 어떻게 하면 점수가 올라가는지**를 코드 기준으로 정리한 단일 참조 문서입니다.
> 모든 수치·산식은 실제 구현(`src/lib/srs.ts`, `src/lib/shadowing/score.ts`, `src/lib/words/*`, `src/stores/*`)에서 가져왔습니다. 정책을 바꿀 땐 이 문서와 해당 파일·테스트(`scripts/test-srs.ts`, `scripts/test-phase8.ts`)를 함께 갱신하세요.

---

## 0. 한눈에 보는 학습 루프

```
대시보드
  └─[오늘의 10단어 / 카테고리 학습 / 오답 노트]
        └─ 한 세트 = 10문항, 각 문항은 ↓
              ① 타이핑(빈칸 채우기)  ── 하트 3개
                   ├─ 첫 시도 정답 → ② 섀도잉
                   ├─ 오답 → 격려 + 단계별 힌트 → 재입력
                   └─ 하트 소진 → [정답 복구 루프] → ② 섀도잉
              ② 섀도잉(따라 말하기)  ── full / listening / typingOnly 3모드
                   ├─ full: 마이크 채점(별 1~3) / 2회 미인식 → 중립
                   ├─ listening: 자가체크(잘했어요/다시)
                   └─ typingOnly: 발음 단계 없음(자동 통과)
              → 다음 문항(좌우 슬라이드, 또는 3초 자동 진행)
        └─ 10문항 완료 → 결과창(별점·복습 단어·Streak·축하) → Supabase 배치 저장
```

핵심 원칙(절대 규칙):
- **학습은 절대 막히지 않는다.** 섀도잉은 보너스 레이어이며 미지원·실패·오프라인이면 자동 강등하고 항상 `[건너뛰기]`를 제공한다.
- **발음은 평가가 아니라 도전이다.** 미인식·저신뢰는 0점이 아니라 "다시 한 번" 분기로 처리하고, 부정·경고 표현을 쓰지 않는다.
- **세션 중에는 메모리(Zustand)에서만 갱신**하고, 세션 종료/주요 분기에서만 변경분을 Supabase에 배치 저장한다.

---

## 1. 한 문항의 흐름

한 단어(문항)는 **두 단계**로 구성됩니다.

| 단계 | 무엇을 하나 | 측정하는 능력 |
|------|-------------|----------------|
| ① 타이핑 | 한글 뜻 + 빈칸 영어 예문에서 빈칸 단어를 타이핑 | **뜻 회상** + **철자** |
| ② 섀도잉 | 정답 문장을 듣고(TTS) 따라 말하기(STT 채점) | **발음** |

문항 단계 상태는 `sessionStore`의 `stage: "typing" | "shadowing"`로 관리되고, 타이핑이 끝나면(`completeTyping`) `shadowing`으로, 섀도잉이 끝나면(`advance`) 다음 문항으로 넘어갑니다.

### 섀도잉 3단계 모드 (기능 감지 폴백)

`hooks/useSpeechSupport.ts`가 브라우저 음성 기능을 감지해 모드를 정합니다.

| 모드 | 조건 | 섀도잉 동작 |
|------|------|-------------|
| `full` | TTS + STT 모두 지원 (Chrome/Edge 등) | 마이크로 발화 채점 → 별 1~3 |
| `listening` | TTS만 지원 | 듣고 따라 말한 뒤 **자가 체크**(잘했어요=⭐2 / 다시=⭐1) |
| `typingOnly` | 음성 미지원 · iOS PWA · 오프라인 | 발음 단계 없음 → 자동 통과(중립), 타이핑만으로 학습 |

---

## 2. 타이핑 단계 상세

### 2.1 정답 인정 규칙 (`lib/typing/answerCheck.ts`)
입력과 정답을 `canonicalAnswer()`로 정규화해 비교합니다. 다음 차이는 **흡수(정답 인정)**됩니다.
- 대소문자, 앞뒤 공백, 연속 공백
- 아포스트로피 종류(`'’`ʼ` 등), 하이픈(`-–—` → 공백), 구두점
- 축약형 ↔ 풀어쓰기: `it's = it is`, `don't = do not`, `can't = cannot = can not` 등
- 관사 `an → a` 동일 취급
- 단어별 추가 정답 `word.accepted_answers[]`(콘텐츠 태그)도 정규화 후 일치하면 정답

> 즉 **핵심 철자**만 맞으면 되고, 형식 차이로는 틀리지 않습니다.

### 2.2 하트와 오답 힌트 (`components/study/QuestionView.tsx`, `lib/typing/hints.ts`)
- 문항 시작 시 **하트 3개**(`MAX_HEARTS = 3`).
- 오답마다 하트 1개 차감 + 부드러운 격려 + **단계별 힌트**(`stagedHint`):

| 오답 회차 | 힌트 종류 | 예시 |
|-----------|-----------|------|
| 1회차 | 첫 글자 | `H` |
| 2회차 | 글자 수 / 단어 수 + 머리글자 | `5글자 · he…` / `2개 단어 · T O` |
| 3회차+ | 청크 / 절반 공개 | `take ____` / `hel…` |

- **하트 3개 소진** → 정답 복구 루프(아래 2.3)로 진입.

### 2.3 오답 후 정답 복구 루프 (9-3e)
하트가 모두 소진되면 **바로 섀도잉으로 넘기지 않고**:
1. 정답을 화면에 노출(`정답 hello`)
2. 그 단어를 **한 번 그대로 따라 입력**하게 함(`recovering` 상태)
   - 이 단계는 **하트 차감·오답 판정 없음**(틀리면 입력창이 살짝 흔들릴 뿐)
   - `[건너뛰기]`로 언제든 통과 가능(학습 무중단)
3. 완료/건너뛰기 모두 결과에 `answerRevealed: true`로 기록 → 뜻 회상 점수에 반영(§5)

목적: "틀린 단어를 손으로 한 번 정확히 써보는" 과정으로 오답이 기억에 남게 함.

---

## 3. 섀도잉 단계 상세

### 3.1 흐름 (`components/study/ShadowingView.tsx`)
1. 타이핑 정답 직후 정답 문장을 **TTS 자동 재생**(`word.tts_text`). `[느리게 다시 듣기]`(rate 0.7) 제공.
2. `full` 모드: `[따라 말하기 🎤]` → STT로 발화 텍스트·신뢰도 수집 → `scoreShadowing`로 채점.
3. 결과 별점 표시 후 `[다음 문제]` 또는 **3초 자동 진행**(`AUTO_ADVANCE_MS = 3000`).

### 3.2 발음 채점 알고리즘 (`lib/shadowing/score.ts`)
정답 문장(`original`)과 사용자가 말한 텍스트(`spoken`), STT 신뢰도(`confidence`)로 0~100점을 산출합니다.

**① 재시도(점수 없음) 게이트**
- `spoken`이 비었거나 `confidence < 0.3`이면 → `status: "retry"`(별 0, 점수 null) = "다시 한 번"(실패 아님).

**② 정규화 (`clean`)**
- 소문자화 → 구두점 제거 → 공백 정리 → 토큰화
- 축약형 전개(`don't → do not` 등)

**③ 단어 정렬 + 단어별 점수 (`wordScore`)**
정답의 각 단어를, 사용자 발화에서 **가장 잘 맞는(미사용) 단어 1개**와 매칭해 부분 점수(0~1)를 매깁니다.

| 일치 정도 | 점수 |
|-----------|------|
| 완전 일치 | `1.0` |
| 동음이의/축약 정규형 일치(`see/sea`, `their/there`, `two/to`…) | `0.95` |
| 그 외 | `max(문자유사도, 음소근사)` |

- **문자유사도**(`charSim`): Levenshtein 거리 기반 `1 - edit/maxLen`.
- **음소근사**(`phonetic`): soundex류 4자리 코드가 같으면 `0.8`. 들리는 대로 비슷하면 인정.
- 단어 점수 `< 0.6`이면 **약점 단어(weakWords)**로 수집(발음 포커스·주간 리포트 원천).

**④ 삽입 패널티 + 최종 점수**
- 정답에 없는데 끼어든 단어(매칭 안 된 발화 단어) `extra`개당 `0.03` 감점, 최대 `0.15`.
- `score = round((평균 단어점수 − 패널티) × 100)`, 0 미만은 0.

**⑤ 별점 (`starsFromScore`)**

| 점수 | 별 | 라벨 |
|------|----|------|
| `≥ 85` | ⭐⭐⭐ | Perfect Echo! (+컨페티) |
| `≥ 60` | ⭐⭐ | Nice! |
| `< 60` | ⭐ | Keep going (weakWords 강조) |
| 미인식·저신뢰 | 🎤 | 다시 한 번(무한 재시도, 실패 아님) |

> **신뢰도(confidence)는 재시도 게이트로만** 쓰고 점수를 부풀리는 데 쓰지 않습니다(동음 오인식이 0점이 되지 않게).

### 3.3 STT 반복 실패 피로도 완화 (9-3b)
- 미인식(retry)이 **2회 연속**(`MAX_MISSES = 2`)이면 `fatigue` 단계로 자동 전환:
  - "🙂 인식이 잘 안 되는 환경 같아요. 오늘은 듣고 넘어가도 좋아요" + 중립 종료(점수·약점 영향 0) + 자동 진행.
  - **발음 약점이 아니라 환경 이슈**로 처리(벌점 없음).

### 3.4 listening / 건너뛰기
- `listening`: `[잘 했어요]`(⭐2, 70점 상당) / `[다시]`(⭐1, 50점 상당) 자가 체크.
- 모든 모드에서 `[건너뛰기]` 제공 → `shadowSkipped: true`(중립).

---

## 4. 한 문항이 남기는 결과 (`QuestionResult`)

타이핑+섀도잉이 끝나면 한 문항은 아래 객체로 요약됩니다(`types/index.ts`).

| 필드 | 의미 |
|------|------|
| `firstTryCorrect` | 타이핑 첫 시도에 정답이었는가 |
| `heartsDepleted` | 하트 3개를 모두 소진했는가(타이핑 실패) |
| `attempts` | 타이핑 시도 횟수 |
| `shadowStars` | 섀도잉 별점(1~3) 또는 `null`(미응시/건너뜀) |
| `shadowScore` | 섀도잉 0~100점 또는 `null` |
| `shadowSkipped` | 섀도잉을 건너뛰었는가 |
| `shadowMode` | `full` / `listening` / `typingOnly` |
| `hintsUsed` | 사용한 힌트 수 (9-3c) |
| `responseMs` | 타이핑 응답 시간(ms) (9-3c) |
| `answerRevealed` | 정답을 보고 복구 입력했는가 (9-3e) |
| `weakWords` | 발음 약점 단어 목록 |

---

## 5. 점수화 정책 — 3요소 점수 (`lib/srs.ts`)

한 문항은 **뜻 회상 / 철자 / 발음** 세 점수로 분리 기록됩니다(`progress` 테이블의 `meaning_recall_score`·`spelling_score`·`pronunciation_score`).

### 5.1 뜻 회상 점수 `meaningRecallScore` (9-3c 정밀화)
```
heartsDepleted          → 0
answerRevealed(정답 봄)  → 30
그 외                    → max(40, 100 − 힌트수×20 − (응답시간>12초 ? 10 : 0))
```
- **첫 시도에 힌트 없이 맞히면 100점.**
- 힌트 1개당 −20, 응답이 12초(`SLOW_RESPONSE_MS = 12000`)를 넘으면 −10, 하한 40.
- 즉 "여러 번 틀리고 힌트 보고 겨우 맞힘"은 더 이상 100점이 아닙니다.

### 5.2 철자 점수 `spellingScore`
```
heartsDepleted → 0
그 외          → max(0, 100 − (attempts−1)×35)
```
- 첫 시도 정답 100, 1번 더 틀리면 65, 2번 더 틀리면 30…

### 5.3 발음 점수 `pronunciationScore`
- 섀도잉 채점값(`shadowScore`, 0~100)을 그대로 사용. 미응시면 **직전 발음 점수를 보존**(`null`로 덮어쓰지 않음).

---

## 6. 졸업 정책 — 두 트랙 SRS + SM-2 간격 (핵심)

> Phase 9-3d부터 **타이핑(뜻·철자) 졸업**과 **발음 졸업**을 별도 트랙으로 누적하고, Phase 9-4부터 **타이핑 트랙의 복습 간격을 SM-2 알고리즘**이 스케줄합니다.

### 6.1 트랙별 카운터 (`progress` 컬럼)
| 컬럼 | 트랙 | 올라가는 조건 | 리셋 조건 |
|------|------|----------------|-----------|
| `pass_count` (=SM-2 n) | **타이핑** | 맞히면(Again 아님) → +1 | 하트 소진(Again) → 0 |
| `pron_pass_count` | **발음** | 섀도잉 ⭐2 이상 → +1 | 섀도잉 약함(⭐1) → 0 |
| `ease_factor`(EF) | **타이핑 난이도계수** | Easy → ↑ | Hard/Again → ↓ (최소 1.3) |
| `interval_days` | **타이핑 직전 간격(일)** | 통과할수록 ×EF로 증가 | Again → 1 |

발음 미응시(typingOnly·건너뛰기)는 **중립** — 발음 트랙 변화 없음.

### 6.2 문항당 판정 (`computeProgressUpdate`)
- **타이핑 트랙(SM-2)**: 학습 신호를 등급 `q`로 매핑(`gradeFor`) → SM-2 한 스텝(`sm2Update`)으로 `n·EF·interval` 갱신.

  | 등급 | 조건 | q | 효과 |
  |------|------|---|------|
  | **Again** | 하트 소진 | 2 | n·간격 리셋, EF −0.32 |
  | **Hard** | 재시도·힌트로 맞힘 | 3 | n+1, EF −0.14 |
  | **Good** | 첫 시도·힌트 0 | 4 | n+1, EF ±0 |
  | **Easy** | 첫 시도·힌트 0·4초 미만 | 5 | n+1, EF +0.10 |

- **발음 트랙(`shadowOutcome`)**: ⭐2+ = `ok`(+1), ⭐1 = `weak`(→0), 별점 없음 = `absent`(중립).

### 6.3 SM-2 간격 공식 (`sm2Update`)
```
통과(q ≥ 3):
   n==0 → interval = 1
   n==1 → interval = 6
   n≥2  → interval = round(직전 interval × EF)
   n += 1
실패(q < 3, Again):
   n = 0, interval = 1
EF := max(1.3, EF + (0.1 − (5−q)×(0.08 + (5−q)×0.02)))   # 모든 등급에 적용
```
- 잘하는 카드(EF↑)는 간격이 빠르게 벌어지고, 자주 틀리는 카드(EF↓)는 간격이 천천히 늘어 더 자주 복습됩니다.

### 6.4 졸업 임계값
| 항목 | 값 | 비고 |
|------|----|------|
| 타이핑 졸업 통과수 `graduationTarget` | **3회** | Lv.3 **관용구(idiom)**만 **4회** |
| 졸업 지평선 `GRAD_HORIZON_DAYS` | **14일** | 간격이 이 일수 이상일 때만 졸업 |
| 발음 졸업 횟수 `PRON_TARGET` | **2회** | |
| 초기/최소 EF | **2.5 / 1.3** | |
| 빠른 응답 기준 `FAST_RESPONSE_MS` | **4000ms** | Easy 판정 |

### 6.5 복습 상태 전이 (`in_review`, `next_due`)
타이핑 트랙(SM-2)이 능동 복습을 주도합니다.
```
타이핑 졸업( n ≥ graduationTarget  그리고  interval ≥ GRAD_HORIZON_DAYS )?
 ├─ 예  → in_review = false, next_due = null     (능동 복습 종료)
 └─ 아니오 → in_review = true, next_due = 오늘 + interval(SM-2가 계산)
```
- **지평선 조건이 핵심**: 통과 3회라도 EF가 낮아 간격이 14일 미만이면 졸업이 보류되어 더 오래 복습합니다.
- `isDue(p, today)` = `in_review && (next_due 없음 또는 next_due ≤ 오늘)` → 복습 출제 대상.
- `isGraduated(p)` = `!in_review && pass_count ≥ 3` → 졸업 단어(통계·유지 점검 대상).

### 6.6 발음 미완 단어의 저빈도 재등장 — `needsPronCheck` (9-3d)
```
needsPronCheck(p) = !in_review && pass_count ≥ 3 && pron_pass_count < 2
```
- 타이핑은 졸업했지만 발음이 아직인 단어. **능동 복습 더미로 끌려가지 않습니다.**
- `full`/`listening` 모드 세션에서 **세션당 최대 1개**만 "말하기 확인"으로 재등장(`buildSession`의 `pronCapable`).
- 덕분에 typingOnly 환경에서 타이핑만으로 졸업한 단어도, 나중에 마이크 되는 환경에서 발음을 한 번 확인하게 됩니다. (틀려도 벌점 없음)

### 6.7 한 단어의 졸업 여정 (예시)

**예시 A — full 모드, 순조로운 학습 (EF 2.5 유지)**
| 세션 | 타이핑 | 섀도잉 | pass_count(n) | interval | pron_pass | in_review |
|------|--------|--------|-----------|----------|-----------|-----------|
| 1 | 첫시도✓(Good) | ⭐3 | 1 | 1일 | 1 | true |
| 2 | 첫시도✓(Good) | ⭐2 | 2 | 6일 | 2 | true |
| 3 | 첫시도✓(Good) | ⭐3 | **3** | **15일** | 3 | **false(졸업)** |
→ 3회 통과 + 간격 15일(≥14) → 졸업. (Easy로 풀면 EF↑로 간격이 더 빨리 벌어짐)

**예시 A' — 약한 카드 (Hard 반복으로 EF↓)**
| 세션 | 등급 | n | interval |
|------|------|---|----------|
| 1 | Hard | 1 | 1일 |
| 2 | Hard | 2 | 6일 |
| 3 | Hard | 3 | round(6×1.36)=8일 → **14 미만, 졸업 보류** |
| 4 | Good | 4 | round(8×1.36)=11일 → 보류 |
| 5 | Good | 5 | round(11×1.46)=16일 → **졸업** |
→ 자주 헤매는 단어는 EF가 낮아 간격이 천천히 늘고, 더 여러 번 복습한 뒤 졸업합니다.

**예시 B — typingOnly 환경(마이크 없음)**
| 세션 | 타이핑 | 섀도잉 | pass_count | pron_pass | in_review | needsPronCheck |
|------|--------|--------|-----------|-----------|-----------|----------------|
| 1~3 | 첫시도✓ | (없음) | 1→2→**3** | 0 | **false(타이핑 졸업)** | **true** |
→ 능동 복습은 끝났지만, 이후 full/listening 세션에서 저빈도로 1회 재등장해 발음 확인.

**예시 C — 타이핑은 됐는데 발음이 약함**
| 세션 | 타이핑 | 섀도잉 | pass_count | pron_pass | 결과 |
|------|--------|--------|-----------|-----------|------|
| 졸업 후 재등장 | 첫시도✓ | ⭐1(weak) | (유지) | **0** | in_review 그대로 false, needsPronCheck 유지(저빈도 재확인) |
→ 약한 발음이 단어를 무거운 복습으로 되돌리지 않음(발음은 보너스 레이어).

---

## 7. "점수를 올리려면" — 실전 규칙 요약

학습자가 점수·졸업을 빨리 올리는 길은 명확합니다.

1. **타이핑은 첫 시도에 맞히기.** 재시도로 맞혀도 통과수(n)는 오르지만(Hard), **EF가 깎여 다음 복습 간격이 짧아지고** 뜻 회상·철자 점수도 감점됩니다. 첫 시도 정답(Good/Easy)이라야 간격이 길게 벌어집니다.
2. **힌트를 덜 보기.** 힌트 1개당 뜻 회상 −20점.
3. **너무 오래 끌지 않기.** 12초 넘으면 뜻 회상 −10점.
4. **발음은 또렷하게, ⭐2 이상 노리기.** ⭐2+만 발음 트랙(`pron_pass_count`)을 올립니다.
5. **동음/축약은 걱정 말기.** `see/sea`, `it's/it is` 등은 정규화로 정답·고득점 처리됩니다.
6. **안 들리면 그냥 다시.** 미인식은 0점이 아니라 재시도이고, 2회면 자동으로 넘어갑니다(불이익 없음).
7. **틀린 단어는 복구 루프에서 한 번 정확히 입력**하고 넘어가면 다음 복습에서 유리합니다.

졸업까지: **(타이핑 첫 시도 정답 3회) + (섀도잉 ⭐2+ 2회)**. typingOnly면 타이핑 3회로 능동 복습 졸업, 발음은 추후 확인.

---

## 8. 세션 출제 로직 (`lib/words/getWords.ts` · `lib/words/adaptive.ts`)

한 세트 10문항(`SET_SIZE = 10`)을 어떻게 고르는가.

### 8.1 기본(오늘의 10단어) 세션
1. **복습 비율**(`adaptiveReviewRatio`)을 상태에 따라 동적 결정:
   | 상황 | 복습 비율 |
   |------|-----------|
   | 스트릭 끊겼다 복귀(`streakBroken`) | 0.7 |
   | 복습 백로그 ≥ 6 | 0.6 |
   | Lv.1 + 학습 30개 미만 | 0.5 |
   | 안정 구간 | 0.3 |
2. **유지 점검**: 졸업 후 30일+ 안 본 단어 최대 1개(`pickMaintenanceWords`).
3. **due 복습**: `isDue`인 단어를 `next_due` 오름차순으로. **레벨이 올라가도 이전 레벨 due 복습을 합류**시킴(`crossLevelDueIds`, 9-3a).
4. **말하기 확인**: `pronCapable`이면 `needsPronCheck` 단어 최대 1개(9-3d).
5. **신규**: 미학습 우선(초급 Lv.1은 생존·일상 표현 먼저 `orderByCurriculum`, 저빈도 표현은 상한 `limitLowFrequency`).
6. 부족하면 오래전 본 단어로 충원. **한 세션 내 중복 출제 없음.**

### 8.2 카테고리 세션 — 미니 시나리오 (9-3f)
- 선택 카테고리 풀을 `use_case` **흐름 순서**로 정렬(`orderByCategoryFlow`).
- `pickScenarioWindow`가 **학습 가치(미학습+복습)가 가장 높은 연속 구간**을 골라 하나의 상황 흐름으로 구성. (예: 여행 = 공항 → 이동 → 길찾기 → 숙소)
- 카테고리 모드는 SRS 비율보다 **시나리오 일관성**을 우선.
- 현재 레벨 단어가 부족하면 인접 레벨에서 같은 카테고리로 충원.

### 8.3 오답 노트 세션
- **현재 틀린 상태**인 단어(`isLapsed` = `in_review && pass_count === 0`, 즉 가장 최근 시도에서 하트 소진으로 통과 누적이 리셋된 단어)로만 구성(`buildReviewSession`).
- 정답으로 진행 중(pass_count ≥ 1)이거나 졸업한 단어는 **제외** — '맞힌 문제'가 오답 노트에 섞이지 않음. (일반 세션의 SRS 복습 혼합은 `isDue` 기준이라 별개)

---

## 9. 레벨 보정·승급 제안 (강제 없음)

### 9.1 온보딩 → provisional → 확정 (`lib/words/calibration.ts`)
- 최초 앵커 테스트로 잠정 레벨(provisional) 결정.
- 이후 **누적 30문항**(`CALIBRATION_TARGET = 30`)까지 정답률을 모아 확정:
  - 정답률 `≥ 0.85` → 한 단계 상향, `< 0.45` → 한 단계 하향, 그 외 유지.

### 9.2 롤링 윈도우 승급/하향 제안 (`suggestLevelFromHistory`)
최근 ≤5세트(누적 ≥30문항)로 **부드러운 제안**(토스트, 강제 X). 세션 결과창에서 호출.

| 방향 | 조건(전부 충족) |
|------|------------------|
| **상향(up)** | 레벨<3 · 첫시도 정답률 `≥0.85` · 복습 진입률 `≤0.15` · 평균 별점 `≥2.2` · 누적 졸업 `≥5` |
| **하향(down)** | 레벨>1 · (정답률 `<0.5` 또는 복습 진입률 `≥0.4`) |

- **복습 진입률(reviewEntries)**은 "이번 세션에 새로 복습 진입(실패)한 수"로 계산(9-2a) — 잘 맞히는 복습 단어가 비율을 부풀리지 않음.
- 누적 졸업(`graduatedCount`)은 `isGraduated`(타이핑 졸업) 단어 수.

---

## 10. 저장·동기화 (`stores/userStore.ts` · `lib/sync/*`)

- 세션 중에는 Zustand 메모리에서만 갱신. **세션 종료 시 `commitSession`**이:
  1. 각 문항을 `computeProgressUpdate`로 `progress` 행에 반영
  2. `study_sessions`에 세션 요약 1행(난이·평균 별점·복습 진입 수·약점 단어 등)
  3. `user_state`(streak·총 학습 수·레벨·보정값) 갱신
  4. 로그인 상태면 Supabase에 **배치 upsert**, 오프라인이면 LocalStorage 큐 → 복귀 시 flush
- 통계(`lib/stats/aggregate.ts`)의 카테고리 숙련도·졸업 수는 `pass_count ≥ 2 && !in_review`를 "익힘"으로 집계.

---

## 11. 상수·함수 빠른 참조

| 상수 | 값 | 위치 |
|------|----|------|
| `MAX_HEARTS` | 3 | `stores/sessionStore.ts` |
| `SET_SIZE` | 10 | `stores/sessionStore.ts` |
| `graduationTarget` | 3 (Lv.3 idiom=4) | `lib/srs.ts` |
| `GRAD_HORIZON_DAYS` | 14 | `lib/srs.ts` |
| `SM2_INITIAL_EF` / `SM2_MIN_EF` | 2.5 / 1.3 | `lib/srs.ts` |
| `FAST_RESPONSE_MS`(Easy) | 4000 | `lib/srs.ts` |
| `PRON_TARGET` | 2 | `lib/srs.ts` |
| `SLOW_RESPONSE_MS` | 12000 | `lib/srs.ts` |
| 별점 임계 | 85 / 60 | `lib/shadowing/score.ts` |
| STT 신뢰도 게이트 | 0.3 | `lib/shadowing/score.ts` |
| `MAX_MISSES`(피로도) | 2 | `components/study/ShadowingView.tsx` |
| `AUTO_ADVANCE_MS` | 3000 | `components/study/ShadowingView.tsx` |
| `CALIBRATION_TARGET` | 30 | `lib/words/calibration.ts` |
| 보정 상/하향 | 0.85 / 0.45 | `lib/words/calibration.ts` |
| 롤링 상향 | corr≥0.85, rev≤0.15, star≥2.2, grad≥5 | `lib/words/adaptive.ts` |

| 핵심 함수 | 역할 | 위치 |
|-----------|------|------|
| `computeProgressUpdate` | 문항 결과 → progress 행(두 트랙 + SM-2 간격) | `lib/srs.ts` |
| `gradeFor` / `sm2Update` | 학습 신호 → SM-2 등급(q) / SM-2 한 스텝 | `lib/srs.ts` |
| `isPass` / `isFail` / `isReviewTrigger` | 통과/실패/복습 진입 판정 | `lib/srs.ts` |
| `isGraduated` / `needsPronCheck` / `isDue` / `isLapsed` | 졸업·발음확인·복습대상·오답노트 판정 | `lib/srs.ts` |
| `meaningRecallScore` / `spellingScore` / `pronunciationScore` | 3요소 점수 | `lib/srs.ts` |
| `scoreShadowing` | 발음 0~100 채점 + 별점 + 약점 | `lib/shadowing/score.ts` |
| `buildSession` / `pickScenarioWindow` / `crossLevelDueIds` | 출제 구성 | `lib/words/getWords.ts`·`adaptive.ts`·`srs.ts` |
| `adaptiveReviewRatio` / `suggestLevelFromHistory` | 복습 비율·승급 제안 | `lib/words/adaptive.ts` |
| `applyCalibration` | provisional 레벨 확정 | `lib/words/calibration.ts` |

---

## 12. 동기부여 시스템 (Phase 10 — 애플 활동 스타일)

학습 품질과 별개로 **돌아오게 만드는 층**. 애플 활동 앱의 4원리(닫을 고리·과거의 나와 경쟁·즉각 축하·수집욕)를 학습 루프에 얹는다. **기존 학습 데이터를 읽어 판정만** 하며 새 점수 로직은 없다. (`lib/achievements/*`)

### 12.1 학습 링 (`rings.ts` · `LearningRings.tsx`)
- 🟣 학습 / 🟠 복습 / ⭐ 발음 3링. 오늘의 달성치(`dailyRing.ts`, 로컬 일일 누적)를 목표로 나눠 채운다.
- 목표 자동 개인화: `learnGoal = clamp(median(최근 세션 단어수) × 1.05, 10, 40)`, `pronGoal = clamp(learn/2, 5, 20)`, 복습 목표 = 오늘 due/lapsed 수(`clamp 0..10`). 목표 0이면 닫힘 처리.
- 3링 닫힘 → confetti(하루 1회). `prefers-reduced-motion` 존중.

### 12.2 배지 (`catalog.ts` · `engine.ts`)
- 배지 26종, 5묶음: **연속**(3·7·14·30·60·100·365·주말전사·불사조) / **누적**(학습 50~1000·졸업 10~100·카테고리 마스터) / **기량**(퍼펙트 세트·골든 보이스·스피드러너·오답 정복) / **시즌**(이달의 챌린지, 키가 월별 분기 `monthly_days_YYYY-MM`) / **탐험**(카테고리 5종·올빼미·아침형).
- 각 배지는 `progress(ctx) → {current, target}` 하나로 정의 → `current ≥ target`이면 획득. 같은 함수로 컬렉션 진행바도 그린다.
- `evaluate(ctx)`는 세션 종료 시 **새로 딴 배지만** 반환 → 획득 모먼트(`AchievementSheet`)로 톡 등장.

### 12.3 경험치·개인 기록·동결권
- **XP**: `learnedCount×10 + firstTryCorrect×5 + 별점×2 + 새 배지×50`. 누적은 `user_state.xp`.
- **개인 기록**: 최장 연속(`best_streak`)·역대 최고 정확도·최고 평균 별점 경신 시 토스트(과거의 나와 비교 → 항상 긍정).
- **스트릭 동결권**(`applyStreak`): 연속이 7의 배수에 도달할 때 +1(최대 3). 하루(정확히 1일)만 빠졌고 동결권이 있으면 연속 보존 → 이탈 차단. 끊겨도 벌점 없음.

### 12.4 위클리 챌린지 (`weeklyChallenge`)
- 주(월요일 시작) 누적 50단어 목표. 주간 리포트(`/report`)에 진행바, 달성 시 시즌 배지.

### 12.5 데이터·무중단
- v12: `achievements`(공개 읽기)·`user_achievements`(본인 RLS)·`daily_rings`(본인 RLS) + `user_state`(`streak_freezes`·`xp`·`best_streak`).
- 전부 **best-effort**: 테이블/컬럼 부재 또는 저장 실패 시 떼고 재시도하거나 폐기 — 학습 루프는 절대 막지 않는다. 판정은 세션 종료에 1회 배치(키 입력마다 X).

---

*이 문서는 Phase 10(동기부여 시스템) 기준입니다. SRS 정책은 Phase 9-4(SM-2). 정책 변경 시 본 문서 + 해당 `lib/*` + `scripts/test-*.ts`를 함께 업데이트하세요.*
