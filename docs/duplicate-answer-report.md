# 중복 answer 검수 로그 (Phase 6-3)

> 생성: `npm run dedup:report` · 대상 2520행 · plan.md 6-3

## 요약

- 총 중복 그룹: **238종**
- 카테고리 내 중복(오염): **0종** (6-1 검수기가 차단 — 0이어야 정상)
- 카테고리 간 중복(맥락 재노출): **238종**
- 오염성(교체/제거 권고): **0종**

## 판정 기준

- **의도적 재노출(유지):** 서로 다른 카테고리에서 *서로 다른 예문*으로 등장 → 간격 반복으로 장기 기억에 유익.
- **오염(교체/제거):** ①같은 카테고리 내 중복(검수기 차단) 또는 ②다른 카테고리지만 *동일 예문* 단순 복제(맥락 차별화 없음).

## ✅ 오염성 중복 0종

모든 중복이 서로 다른 카테고리에서 서로 다른 예문으로 재노출되어 학습상 유익합니다. 교체/제거 대상 없음.

## 카테고리 간 재노출 전체 목록 (유지)

| answer | 횟수 | 카테고리 |
| --- | --- | --- |
| busy | 6 | greeting, work, phone_email, schedule, daily, social |
| free | 5 | greeting, shopping, restaurant, schedule, social |
| on the same page | 5 | greeting, work, phone_email, social, it |
| wrap up | 5 | restaurant, work, phone_email, schedule, daily |
| bring up | 4 | work, phone_email, emotion, social |
| call | 4 | greeting, work, phone_email, social |
| late | 4 | travel, work, schedule, daily |
| open | 4 | shopping, restaurant, phone_email, it |
| pick up | 4 | shopping, travel, phone_email, daily |
| share | 4 | restaurant, phone_email, social, it |
| a hidden gem | 3 | shopping, restaurant, travel |
| again | 3 | greeting, phone_email, schedule |
| bridge the gap | 3 | greeting, work, social |
| calendar | 3 | phone_email, schedule, it |
| call it a day | 3 | travel, work, daily |
| catch up on | 3 | work, phone_email, daily |
| change | 3 | shopping, restaurant, schedule |
| check | 3 | restaurant, phone_email, schedule |
| check in | 3 | restaurant, travel, it |
| circle back | 3 | greeting, work, phone_email |
| confirm | 3 | work, phone_email, schedule |
| cut down on | 3 | restaurant, health, daily |
| cut off | 3 | phone_email, social, it |
| dinner | 3 | restaurant, daily, social |
| drop by | 3 | greeting, schedule, social |
| email | 3 | work, phone_email, it |
| evening | 3 | greeting, schedule, daily |
| fit in | 3 | greeting, schedule, social |
| get together | 3 | greeting, schedule, social |
| help | 3 | shopping, work, social |
| hungry | 3 | greeting, restaurant, daily |
| in the pipeline | 3 | work, schedule, it |
| keep in touch | 3 | greeting, phone_email, social |
| keep me posted | 3 | greeting, phone_email, schedule |
| look forward to | 3 | greeting, emotion, daily |
| lunch | 3 | restaurant, schedule, daily |
| meet | 3 | greeting, schedule, social |
| message | 3 | phone_email, social, it |
| miss | 3 | emotion, schedule, social |
| morning | 3 | greeting, schedule, daily |
| phone | 3 | phone_email, daily, it |
| play it by ear | 3 | travel, phone_email, schedule |
| popular | 3 | shopping, restaurant, social |
| ready | 3 | restaurant, work, schedule |
| schedule | 3 | work, schedule, daily |
| set up | 3 | work, social, it |
| sign off on | 3 | work, phone_email, it |
| sorry | 3 | greeting, emotion, social |
| tired | 3 | emotion, health, daily |
| touch base | 3 | greeting, work, phone_email |
| update | 3 | work, phone_email, it |
| wait | 3 | restaurant, schedule, social |
| weekend | 3 | greeting, schedule, daily |
| work | 3 | greeting, work, daily |
| a bottleneck | 2 | work, it |
| a steep learning curve | 2 | work, it |
| afternoon | 2 | greeting, schedule |
| appointment | 2 | schedule, health |
| around | 2 | greeting, schedule |
| attach | 2 | phone_email, it |
| attend | 2 | work, schedule |
| available | 2 | phone_email, schedule |
| awful | 2 | restaurant, emotion |
| back to back | 2 | work, schedule |
| bag | 2 | shopping, daily |
| bandwidth | 2 | work, it |
| behind schedule | 2 | work, schedule |
| birthday | 2 | restaurant, social |
| bounced back | 2 | phone_email, health |
| break | 2 | work, schedule |
| break the ice | 2 | greeting, social |
| burn out | 2 | work, daily |
| bus | 2 | travel, daily |
| cancel | 2 | work, schedule |
| cash | 2 | shopping, travel |
| caught me off guard | 2 | greeting, emotion |
| cc | 2 | work, phone_email |
| charge | 2 | phone_email, it |
| check out | 2 | shopping, travel |
| clean | 2 | shopping, daily |
| clear the air | 2 | greeting, social |
| close | 2 | shopping, social |
| coffee | 2 | restaurant, daily |
| cold | 2 | restaurant, health |
| colleague | 2 | greeting, work |
| connect the dots | 2 | work, phone_email |
| cook | 2 | restaurant, daily |
| copy | 2 | work, it |
| cut back on | 2 | work, daily |
| cut corners | 2 | work, it |
| date | 2 | schedule, social |
| deadline | 2 | work, schedule |
| delay | 2 | travel, schedule |
| delete | 2 | phone_email, it |
| dial in | 2 | phone_email, it |
| draft | 2 | work, phone_email |
| drink | 2 | restaurant, health |
| drop off | 2 | travel, daily |
| early | 2 | schedule, daily |
| eat | 2 | restaurant, health |
| feel | 2 | emotion, social |
| file | 2 | work, it |
| fine | 2 | greeting, emotion |
| first thing | 2 | schedule, daily |
| floor | 2 | shopping, daily |
| follow up | 2 | work, schedule |
| fresh | 2 | shopping, restaurant |
| full | 2 | restaurant, travel |
| fun | 2 | emotion, social |
| get a refund | 2 | shopping, travel |
| get back to | 2 | work, phone_email |
| get into the swing of things | 2 | travel, daily |
| get the ball rolling | 2 | greeting, work |
| get to know | 2 | greeting, social |
| get up to speed | 2 | work, it |
| gift | 2 | shopping, social |
| glad | 2 | greeting, emotion |
| go off the grid | 2 | travel, daily |
| goes the extra mile | 2 | work, social |
| grab a bite | 2 | restaurant, daily |
| grab a coffee | 2 | greeting, restaurant |
| grateful | 2 | emotion, social |
| guest | 2 | greeting, social |
| happy | 2 | greeting, emotion |
| healthy | 2 | health, daily |
| hello | 2 | greeting, phone_email |
| here | 2 | greeting, travel |
| hit it off | 2 | greeting, social |
| hit the ground running | 2 | greeting, work |
| holiday | 2 | greeting, schedule |
| hour | 2 | work, schedule |
| in the loop | 2 | work, phone_email |
| introduce | 2 | greeting, social |
| invite | 2 | work, social |
| join | 2 | schedule, social |
| keep tabs on | 2 | work, schedule |
| keep up with | 2 | work, daily |
| later | 2 | greeting, schedule |
| leave | 2 | work, schedule |
| left | 2 | shopping, travel |
| let down | 2 | emotion, social |
| link | 2 | phone_email, it |
| long | 2 | greeting, shopping |
| look around | 2 | shopping, travel |
| loop in | 2 | work, phone_email |
| lose touch | 2 | greeting, social |
| love | 2 | emotion, social |
| mad | 2 | emotion, social |
| make room for | 2 | restaurant, schedule |
| make the most of | 2 | travel, daily |
| mind | 2 | greeting, emotion |
| missed | 2 | greeting, phone_email |
| more | 2 | shopping, restaurant |
| mute | 2 | phone_email, it |
| mutual friend | 2 | greeting, social |
| nap | 2 | health, daily |
| neighbor | 2 | greeting, social |
| nervous | 2 | emotion, social |
| network | 2 | phone_email, it |
| nice | 2 | greeting, social |
| nip it in the bud | 2 | health, social |
| notification | 2 | phone_email, it |
| on a budget | 2 | shopping, work |
| on good terms | 2 | greeting, social |
| on the back burner | 2 | work, schedule |
| on the same wavelength | 2 | work, phone_email |
| onboard | 2 | work, it |
| open up | 2 | emotion, social |
| order | 2 | shopping, restaurant |
| outside | 2 | restaurant, daily |
| pain point | 2 | work, it |
| password | 2 | phone_email, it |
| pay by card | 2 | shopping, restaurant |
| plan | 2 | work, schedule |
| postpone | 2 | work, schedule |
| price | 2 | shopping, restaurant |
| print | 2 | phone_email, it |
| printer | 2 | work, it |
| put off | 2 | work, schedule |
| put on hold | 2 | phone_email, schedule |
| put up with | 2 | emotion, social |
| reach out | 2 | greeting, social |
| reach out to | 2 | work, phone_email |
| read | 2 | phone_email, daily |
| read between the lines | 2 | phone_email, social |
| reconnect with | 2 | greeting, social |
| refund | 2 | shopping, restaurant |
| remind | 2 | schedule, social |
| reschedule | 2 | work, schedule |
| reservation | 2 | restaurant, travel |
| rest | 2 | health, daily |
| return | 2 | shopping, travel |
| right | 2 | greeting, travel |
| roll out | 2 | work, it |
| run out of | 2 | shopping, restaurant |
| running late | 2 | travel, schedule |
| rush hour | 2 | restaurant, travel |
| save | 2 | phone_email, it |
| scope creep | 2 | work, it |
| screen | 2 | phone_email, it |
| see eye to eye | 2 | emotion, social |
| send | 2 | work, phone_email |
| set aside | 2 | schedule, daily |
| set off | 2 | travel, emotion |
| set the table | 2 | restaurant, daily |
| show up | 2 | schedule, social |
| shy | 2 | emotion, social |
| sleep | 2 | health, daily |
| slow | 2 | restaurant, it |
| smile | 2 | greeting, social |
| soon | 2 | greeting, schedule |
| sort out | 2 | work, daily |
| speaker | 2 | phone_email, it |
| split the bill | 2 | shopping, restaurant |
| squeeze in | 2 | schedule, daily |
| stay in touch | 2 | greeting, social |
| store | 2 | shopping, daily |
| sweet | 2 | restaurant, social |
| tablet | 2 | health, it |
| take stock of | 2 | work, daily |
| tea | 2 | restaurant, daily |
| the elephant in the room | 2 | work, social |
| time | 2 | greeting, schedule |
| today | 2 | greeting, schedule |
| together | 2 | greeting, social |
| upload | 2 | phone_email, it |
| upset | 2 | emotion, social |
| urgent | 2 | work, phone_email |
| vent to | 2 | emotion, social |
| visit | 2 | greeting, social |
| walk | 2 | travel, daily |
| warm up | 2 | restaurant, daily |
| warm up to | 2 | greeting, emotion |
| water | 2 | restaurant, daily |
| wear his heart on his sleeve | 2 | emotion, social |
| wear many hats | 2 | work, daily |
| wear off | 2 | emotion, health |
| welcome | 2 | greeting, social |
