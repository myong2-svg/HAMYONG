import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "문창호 환자들 비용 관리",
  description: "문창호 환자들 회비 및 지출 관리 시스템",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <div className="flex h-screen bg-slate-50">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            <div className="p-6 max-w-7xl mx-auto">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
