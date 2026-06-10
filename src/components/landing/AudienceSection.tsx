import { CloudOff, MicOff, Smartphone } from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";
import { SectionHeading } from "@/components/landing/SectionHeading";

export function AudienceSection() {
  return (
    <section className="px-5 py-14">
      <SectionHeading
        eyebrow="Who it's for"
        title="이런 분께 잘 맞아요"
      />

      <Reveal className="mx-auto max-w-md">
        <ul className="flex flex-col gap-2.5">
          {[
            "여행·직장·일상에서 입이 트이는 영어 회화가 목표인 성인 학습자",
            "단어장은 많이 봤지만 막상 말이 안 나오던 분",
            "출퇴근길 자투리 시간에 하루 10단어씩 가볍게 이어가고 싶은 분",
            "암기보다 '직접 쓰고 말하는' 능동 학습이 잘 맞는 분",
          ].map((line) => (
            <li
              key={line}
              className="flex items-start gap-2.5 rounded-2xl border border-line bg-surface p-4 text-sm leading-relaxed text-ink"
            >
              <span className="mt-0.5 text-brand" aria-hidden>
                ✓
              </span>
              {line}
            </li>
          ))}
        </ul>
      </Reveal>

      <Reveal className="mx-auto mt-8 max-w-md">
        <div className="rounded-[var(--radius-card)] border border-line bg-surface-muted p-5">
          <p className="text-center text-sm font-bold text-ink">
            안심하고 쓰세요
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Trust
              icon={CloudOff}
              title="끊기지 않는 학습"
              body="오프라인이어도 학습은 계속되고, 연결되면 자동 동기화돼요."
            />
            <Trust
              icon={MicOff}
              title="목소리는 저장 안 함"
              body="발음 채점은 그 자리에서만 쓰이고 녹음을 남기지 않아요."
            />
            <Trust
              icon={Smartphone}
              title="기기 간 이어가기"
              body="같은 구글 계정이면 폰·PC 어디서나 진도가 이어집니다."
            />
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Trust({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof CloudOff;
  title: string;
  body: string;
}) {
  return (
    <div className="text-center">
      <Icon size={18} className="mx-auto text-brand" aria-hidden />
      <p className="mt-2 text-sm font-bold text-ink">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}
