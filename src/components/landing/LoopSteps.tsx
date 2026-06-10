import { Ear, Keyboard, Mic } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";
import { SectionHeading } from "@/components/landing/SectionHeading";

interface Step {
  icon: LucideIcon;
  no: string;
  title: string;
  body: string;
  tone: string;
}

const STEPS: Step[] = [
  {
    icon: Ear,
    no: "01",
    title: "한글 뜻을 먼저 떠올려요",
    body: "문장의 한글 뜻을 보고 '이걸 영어로 어떻게 말하지?' 스스로 인출하는 순간 기억이 시작됩니다.",
    tone: "text-brand",
  },
  {
    icon: Keyboard,
    no: "02",
    title: "빈칸을 직접 타이핑해요",
    body: "핵심 단어를 손으로 한 글자씩 채웁니다. 객관식으로 찍는 것과 달리 철자까지 정확히 익혀져요.",
    tone: "text-success",
  },
  {
    icon: Mic,
    no: "03",
    title: "문장을 따라 말해요",
    body: "정답 문장을 듣고 그대로 발화합니다. 눈·손·입을 모두 쓰면 회화에서 바로 튀어나옵니다.",
    tone: "text-accent",
  },
];

export function LoopSteps() {
  return (
    <section className="px-5 py-14">
      <SectionHeading
        eyebrow="How it works"
        title="외우는 게 아니라, 직접 꺼내 씁니다"
        description="보고 넘기는 학습은 금방 잊혀요. Typing-Voca는 매 단어를 직접 인출·입력·발화하게 만드는 3단계 루프로 돌아갑니다."
      />

      <div className="mx-auto flex max-w-md flex-col gap-4">
        {STEPS.map((step, i) => (
          <Reveal key={step.no} delay={i * 0.08}>
            <div className="flex gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-sm">
              <div className="flex flex-col items-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft">
                  <step.icon size={20} className={step.tone} aria-hidden />
                </div>
                {i < STEPS.length - 1 && (
                  <span className="mt-2 w-px flex-1 bg-line" aria-hidden />
                )}
              </div>
              <div className="flex-1 pb-1">
                <span className={`font-mono text-xs font-bold ${step.tone}`}>
                  STEP {step.no}
                </span>
                <h3 className="mt-1 text-base font-bold text-ink">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                  {step.body}
                </p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
