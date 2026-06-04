"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { GoogleLoginCard } from "@/components/auth/GoogleLoginCard";

export default function LoginPage() {
  const { configured, session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!configured) {
      router.replace("/");
      return;
    }
    if (!loading && session) router.replace("/");
  }, [configured, session, loading, router]);

  return <GoogleLoginCard />;
}
