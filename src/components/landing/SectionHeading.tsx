import { Reveal } from "@/components/landing/Reveal";

export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <Reveal className="mb-7 text-center">
      <span className="text-xs font-bold uppercase tracking-wide text-brand">
        {eyebrow}
      </span>
      <h2 className="mt-2 text-2xl font-extrabold leading-snug text-ink">
        {title}
      </h2>
      {description && (
        <p className="mx-auto mt-3 max-w-[22rem] text-sm leading-relaxed text-ink-soft">
          {description}
        </p>
      )}
    </Reveal>
  );
}
