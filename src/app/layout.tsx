import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Typing-Voca",
  description: "한글 뜻을 보고 영어 예문 빈칸을 타이핑으로 채우는 영어 회화 학습",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#6366f1",
};

const themeScript = `(function(){try{var m=localStorage.getItem('tv:theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(m==='dark'||((m==='system'||!m)&&d)){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
