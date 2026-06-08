# 발음 난이도 전수 분석 (Phase 9-1b)

> `scripts/tagPronunciation.ts`가 표면형에서 파생 추정한 결과. 런타임은 `pronunciationDifficulty`/`pronunciationFeatures`로 동일하게 계산하므로 별도 DB 컬럼·시드 없이 동작한다.

- 총 단어: **2520**
- 발음 난이 요소 1개 이상 포함: **1363** (54%)
- (참고) 기존 `difficulty_axis=pronunciation` 태그: 23개 → 파생 분석으로 커버리지 대폭 확대

## 음소 요소별 분포
- v / f 발음: 693
- 자음군 (str·spl 등): 532
- th 발음 (the·think): 382
- r / l 구분: 375
- z 발음 (zoo·busy): 21

## 난이도(요소 개수)별 분포
- 0개 요소: 1157
- 1개 요소: 864
- 2개 요소: 371
- 3개 요소: 115
- 4개 요소: 13
