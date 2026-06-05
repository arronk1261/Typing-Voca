# 단어 콘텐츠 스펙 v6 (최종 서비스 DB)

> Typing-Voca 단어 DB의 **단일 콘텐츠 규격**. 생성·검수·시드 모두 이 문서를 기준으로 한다.
> 목표 규모: **12 카테고리 × 3 레벨 × 70개 = 2,520개**.

## 1. 레코드 스키마 (v6)

```jsonc
{
  "category": "restaurant",          // 12개 카테고리 슬러그 중 하나 (고정)
  "level": 2,                         // 1 | 2 | 3
  "cefr": "B1",                       // L1="A1-A2", L2="B1", L3="B2-C1"
  "answer": "make a reservation",     // 학습 표현 = sentence_en의 ___ 자리에 들어갈 정답
  "sentence_en": "I'd like to ___ for Friday.",  // 빈칸(___) 포함 예문 (빈칸은 정확히 언더바 3개)
  "sentence_ko": "금요일로 예약하고 싶어요.",        // tts_text(완성 문장)의 자연스러운 한국어 번역
  "meaning": "예약하다",                // answer 자체의 한국어 뜻 (문장 전체 X)
  "tts_text": "I'd like to make a reservation for Friday.",  // 빈칸 채운 완성 문장 = 섀도잉 대상
  "display_sentence": "I'd like to make a reservation for Friday.", // 자연 예문(보통 tts_text와 동일)

  // --- v6 신규 태그 ---
  "frequency": "high",                // high | mid | low (실제 회화 사용 빈도)
  "chunk_type": "collocation",        // single_word | collocation | phrasal_verb | idiom | sentence_frame
  "difficulty_axis": "usage",         // spelling | meaning | usage | pronunciation (이 표현의 주된 난이도 축)
  "use_case": ["restaurant", "booking"] // 상황 태그 배열 (소문자 슬러그, 1~3개)
}
```

* `id`는 **부여하지 않는다.** 조립 단계에서 전역 1..2520으로 일괄 부여.
* 모든 필드 필수. `use_case`는 문자열 배열, 나머지는 문자열/숫자.

## 2. 절대 품질 규칙 (위반 = 불합격)

1. **빈칸 채움 = 완성 문장.** `sentence_en`의 `___`를 `answer`로 치환하면 **정확히 `tts_text`와 글자 단위로 일치**해야 한다(대문자/구두점 포함).
2. **문법 완전성.** `tts_text`는 원어민이 실제로 쓰는 자연스러운 문장이어야 한다. 시제·관사·수일치 오류 금지. (예: ❌ "Something come up at work." → ✅ "Something has come up at work.")
3. **placeholder 금지.** `answer`나 문장에 `someone / something / somebody / one's / things(관용구 제외)`를 **목적어 자리채움으로 남기지 않는다.** 목적어가 필요한 구동사·관용구는 **실제 목적어를 문장에 넣고** answer는 핵심 청크만 둔다.
   * ❌ answer `"win someone over"`, tts `"It took time to win someone over."`
   * ✅ answer `"win over"`, sentence `"It took time to ___ the whole team."`, tts `"It took time to win over the whole team."`
   * ❌ answer `"ping someone"`, tts `"I'll ping someone you on the app."`
   * ✅ answer `"ping"`, sentence `"I'll ___ you on the app."`, tts `"I'll ping you on the app."`
4. **단일 빈칸.** `sentence_en`에는 `___`(언더바 3개)가 **정확히 1번**만 나타난다.
5. **카테고리 내 answer 중복 금지.** 같은 카테고리 안에서 동일 `answer`(정규화 후) 재사용 금지. 의도적 재노출이 필요하면 다른 맥락의 문장이어도 answer 자체는 달라야 한다.
6. **번역 정확.** `sentence_ko`는 `tts_text` 전체의 자연 번역, `meaning`은 `answer`만의 뜻.
7. **문두 빈칸 대문자.** 빈칸이 문장 맨 앞이면 `answer`/`tts_text` 첫 글자 대문자.
8. **자연 예문 우선.** 억지스러운 문장 금지. 성인 일상 회화에서 실제로 들릴 법한 문장만.

## 3. 레벨 보정 가이드 (단어 수 아님 — 빈도·청크·난이도 기준)

| 레벨 | CEFR | frequency 주류 | chunk_type 주류 | 성격 |
|---|---|---|---|---|
| L1 | A1-A2 | high | single_word (+소수 collocation) | 생존·고빈도. 1단어 빈칸 위주 |
| L2 | B1 | high~mid | collocation / phrasal_verb | 일상 유창성. 1~3단어 청크 |
| L3 | B2-C1 | mid (+소수 low) | collocation / phrasal_verb / idiom / sentence_frame | **자주 쓰는 고급 표현**. idiom은 전체의 **40% 이하**로 제한, 나머지는 실용 콜로케이션/구동사 |

* L3가 난해한 관용구로만 채워지면 안 됨(성인 일반회화 목표). "실제로 자주 쓰는" 고급 표현 위주.
* 같은 카테고리에서 L1→L2→L3로 갈수록 표현이 자연스럽게 어려워지도록 설계.

## 4. 12개 카테고리

`greeting`(인사·스몰토크) `shopping`(쇼핑·결제) `restaurant`(음식·레스토랑) `travel`(여행·교통) `work`(직장·업무) `phone_email`(전화·이메일) `emotion`(감정·의견) `schedule`(약속·일정) `health`(건강·병원) `daily`(일상 루틴) `social`(인간관계·소셜) `it`(IT·실무)

## 5. 셀당 구성 (70개)

각 (카테고리, 레벨) 70개 = 기존 검증 항목(25개) 승격 + 신규 45개. frequency는 high를 다수로 하되 레벨에 맞게 mid/low 혼합. 동일 표현·문형 반복을 피하고 상황(use_case)을 골고루 분산.
