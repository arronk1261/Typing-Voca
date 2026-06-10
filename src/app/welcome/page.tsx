import type { Metadata } from "next";
import { WelcomeView } from "@/components/landing/WelcomeView";

export const metadata: Metadata = {
  title: "Typing-Voca · 치고 말하며 외우는 영어 회화",
  description:
    "한글 뜻을 보고 영어 문장 빈칸을 타이핑하고, 그 문장을 따라 말하며 외우는 모바일 영어 회화 학습. 망각 곡선에 맞춘 간격 반복으로 오래 기억됩니다. 무료.",
  openGraph: {
    title: "Typing-Voca · 치고 말하며 외우는 영어 회화",
    description:
      "직접 타이핑하고 따라 말하는 능동 학습 + 망각 곡선 기반 복습. 하루 10단어로 시작하세요.",
    type: "website",
  },
};

export default function WelcomePage() {
  return <WelcomeView />;
}
