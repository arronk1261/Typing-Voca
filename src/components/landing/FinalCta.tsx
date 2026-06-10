import { GoogleCta } from "@/components/landing/GoogleCta";
import { Reveal } from "@/components/landing/Reveal";

export function FinalCta() {
  return (
    <section className="px-5 pb-14 pt-6">
      <Reveal className="mx-auto max-w-md">
        <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-brand/20 bg-brand-soft p-7 text-center">
          <h2 className="text-2xl font-extrabold leading-snug text-ink">
            오늘 10단어부터
            <br />
            시작해 볼까요?
          </h2>
          <p className="mx-auto mt-3 max-w-[18rem] text-sm leading-relaxed text-ink-soft">
            가입은 클릭 한 번. 신용카드도, 설치도 필요 없어요.
          </p>
          <div className="mx-auto mt-6 max-w-xs">
            <GoogleCta label="Google로 시작하기" />
          </div>
          <p className="mt-3 text-xs text-ink-soft">
            이메일·이름·프로필 사진만 사용합니다
          </p>
        </div>
      </Reveal>
    </section>
  );
}
