import { Award, Flame, PartyPopper, Snowflake, Target, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";
import { SectionHeading } from "@/components/landing/SectionHeading";

interface Fun {
  icon: LucideIcon;
  title: string;
  body: string;
  tone: string;
  bg: string;
}

const ITEMS: Fun[] = [
  {
    icon: Flame,
    title: "연속 학습 스트릭 🔥",
    body: "하루하루 쌓이는 불꽃. 이어갈수록 더 크게 타올라요.",
    tone: "text-accent",
    bg: "bg-accent/10",
  },
  {
    icon: Award,
    title: "배지 26종 수집",
    body: "연속·누적·기량·챌린지·탐험까지, 모으는 재미가 있어요.",
    tone: "text-brand",
    bg: "bg-brand-soft",
  },
  {
    icon: Target,
    title: "학습 3링 채우기",
    body: "학습·복습·발음 링을 매일 꽉 채우는 애플 활동 스타일.",
    tone: "text-success",
    bg: "bg-success-soft",
  },
  {
    icon: PartyPopper,
    title: "정답 컨페티",
    body: "퍼펙트 발음과 정답마다 톡 터지는 즉각 보상.",
    tone: "text-star",
    bg: "bg-star/15",
  },
  {
    icon: Snowflake,
    title: "스트릭 동결권",
    body: "하루 못 했어도 동결권으로 불꽃을 지켜줘요. 부담은 줄이고.",
    tone: "text-brand",
    bg: "bg-brand-soft",
  },
  {
    icon: Trophy,
    title: "위클리 챌린지",
    body: "주간 목표를 달성하며 꾸준함에 보상을 더해요.",
    tone: "text-accent",
    bg: "bg-accent/10",
  },
];

export function FunGallery() {
  return (
    <section className="bg-surface px-5 py-14">
      <SectionHeading
        eyebrow="Stay motivated"
        title="작심삼일을 막는 재미 장치"
        description="혼나는 학습은 없어요. 잘한 순간마다 칭찬하고, 못 한 날은 부드럽게 붙잡아 매일 돌아오게 만듭니다."
      />

      <div className="mx-auto grid max-w-md grid-cols-2 gap-3">
        {ITEMS.map((item, i) => (
          <Reveal key={item.title} delay={(i % 2) * 0.06}>
            <div className="flex h-full flex-col rounded-2xl border border-line bg-surface p-4">
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.bg}`}
              >
                <item.icon size={18} className={item.tone} aria-hidden />
              </span>
              <p className="mt-3 text-sm font-bold text-ink">{item.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                {item.body}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
