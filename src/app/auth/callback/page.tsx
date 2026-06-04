"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { LoadingDots } from "@/components/ui/LoadingDots";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      router.replace("/study");
      return;
    }
    supabase.auth.getSession().then(() => router.replace("/study"));
  }, [router]);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center">
      <LoadingDots />
    </main>
  );
}
