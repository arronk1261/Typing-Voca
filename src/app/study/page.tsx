import { AuthGuard } from "@/components/auth/AuthGuard";
import { StudySession } from "@/components/study/StudySession";

export default function StudyPage() {
  return (
    <AuthGuard>
      <StudySession />
    </AuthGuard>
  );
}
