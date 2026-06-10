"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { LandingPage } from "@/components/landing/LandingPage";

export function WelcomeView() {
  const { configured, loading, session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!configured) {
      router.replace("/");
      return;
    }
    if (!loading && session) router.replace("/");
  }, [configured, loading, session, router]);

  return <LandingPage />;
}
