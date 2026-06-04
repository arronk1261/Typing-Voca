"use client";

import { Keyboard } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

export function GoogleLoginCard() {
  const { signInWithGoogle } = useAuth();

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-between px-6 py-12">
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-[var(--radius-card)] bg-brand text-white shadow-lg shadow-brand/30">
          <Keyboard size={40} aria-hidden />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-ink">Typing-Voca</h1>
          <p className="mt-2 leading-relaxed text-ink-soft">
            한글 뜻을 보고 영어 빈칸을 채우고
            <br />
            따라 말하며 외우는 영어 회화 학습
          </p>
        </div>
      </div>

      <div className="w-full">
        <button
          type="button"
          onClick={signInWithGoogle}
          className="flex min-h-[52px] w-full items-center justify-center gap-3 rounded-2xl border border-line bg-surface px-6 text-base font-semibold text-ink shadow-sm transition-colors active:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <GoogleMark />
          Google로 계속하기
        </button>
        <p className="mt-4 text-center text-xs leading-relaxed text-ink-soft">
          같은 구글 계정이면 기기 간 학습이 이어져요.
          <br />
          이메일·이름·프로필 사진만 사용합니다.
        </p>
      </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.22V7.04H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}
