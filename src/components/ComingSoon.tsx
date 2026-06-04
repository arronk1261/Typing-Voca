"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ComingSoonProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function ComingSoon({ icon: Icon, title, description }: ComingSoonProps) {
  const router = useRouter();
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-[var(--radius-card)] bg-brand-soft text-brand">
        <Icon size={32} aria-hidden />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-ink">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          {description}
        </p>
      </div>
      <Button
        variant="secondary"
        className="w-auto px-6"
        onClick={() => router.push("/")}
      >
        <ArrowLeft size={18} aria-hidden /> 대시보드로
      </Button>
    </main>
  );
}
