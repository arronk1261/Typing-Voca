import { Suspense } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { StudySession } from "@/components/study/StudySession";
import { LoadingDots } from "@/components/ui/LoadingDots";

export default function StudyPage() {
  return (
    <AuthGuard>
      <Suspense
        fallback={
          <main className="flex min-h-[100dvh] items-center justify-center">
            <LoadingDots />
          </main>
        }
      >
        <StudySession />
      </Suspense>
    </AuthGuard>
  );
}
