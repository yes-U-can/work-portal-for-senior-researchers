import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Work Portal for Senior Researchers",
  description: "Unified senior-friendly workspace across BAND, Google Drive, Gmail, and Naver Mail."
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko">
      <body>
        <a className="skip-link" href="#main-content">
          본문으로 바로가기
        </a>
        {children}
      </body>
    </html>
  );
}
