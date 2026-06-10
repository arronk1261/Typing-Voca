"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { LoadingDots } from "@/components/ui/LoadingDots";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { configured, loading, session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!configured) return;
    if (!loading && !session) router.replace("/welcome");
  }, [configured, loading, session, router]);

  if (!configured) return <>{children}</>;

  if (loading || !session) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center">
        <LoadingDots />
      </main>
    );
  }

  return <>{children}</>;
}
