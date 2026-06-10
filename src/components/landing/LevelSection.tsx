import { Gauge, Layers, Wand2 } from "lucide-react";
import { CATEGORIES } from "@/lib/words/categories";
import { Reveal } from "@/components/landing/Reveal";
import { SectionHeading } from "@/components/landing/SectionHeading";

const LEVELS = [
  { tag: "Lv.1", label: "기초 회화", desc: "일상에서 가장 자주 쓰는 표현부터" },
  { tag: "Lv.2", label: "생활 회화", desc: "상황별로 말을 이어가는 문장" },
  { tag: "Lv.3", label: "유창 회화", desc: "뉘앙스까지 살리는 표현" },
];

export function LevelSection() {
  return (
    <section className="px-5 py-14">
      <SectionHeading
        eyebrow="Your level"
        title="딱 내 수준에서 시작해요"
        description="짧은 레벨 테스트로 시작점을 잡고, 학습하는 동안 정답률·발음 점수를 보며 난이도를 자동으로 조정합니다."
      />

      <div className="mx-auto flex max-w-md flex-col gap-3">
        {LEVELS.map((lv, i) => (
          <Reveal key={lv.tag} delay={i * 0.07}>
            <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-sm font-bold text-white">
                {lv.tag}
              </span>
              <div>
                <p className="text-base font-bold text-ink">{lv.label}</p>
                <p className="text-sm text-ink-soft">{lv.desc}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal className="mx-auto mt-4 max-w-md">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Mini icon={Gauge} title="적응형 난이도" body="잘하면 올리고, 버거우면 부드럽게 낮춰요" />
          <Mini icon={Layers} title="신규 70% · 복습 30%" body="새 단어와 복습이 균형 있게 섞여요" />
          <Mini icon={Wand2} title="중복 없는 세션" body="한 세션 안에서 같은 단어가 겹치지 않아요" />
        </div>
      </Reveal>

      <Reveal className="mx-auto mt-8 max-w-md">
        <p className="mb-3 text-center text-sm font-semibold text-ink">
          12개 생활 카테고리에서 골라 학습
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {CATEGORIES.map((c) => (
            <span
              key={c.key}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-soft"
            >
              <c.icon size={13} className="text-brand" aria-hidden />
              {c.label}
            </span>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

function Mini({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Gauge;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface-muted p-4 text-center">
      <Icon size={18} className="mx-auto text-brand" aria-hidden />
      <p className="mt-2 text-sm font-bold text-ink">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}
