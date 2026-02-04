import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "シケジューラ | シンプルな日程調整ツール",
  description: "グループのスケジュール調整を簡単に。ログイン不要で誰でも回答できます。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${inter.variable} ${outfit.variable} antialiased bg-[#0f172a] text-slate-200 min-h-screen font-sans`}>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <header className="mb-12 text-center">
            <h1 className="text-4xl font-bold font-outfit bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent inline-block mb-2">
              シケジューラ
            </h1>
            <p className="text-slate-400 text-sm">Simple Schedule Coordinator</p>
          </header>
          <main>{children}</main>
          <footer className="mt-20 py-8 border-t border-slate-800 text-center text-slate-500 text-xs">
            &copy; 2024 Schedule Coordinator App <br/>
            <span className="text-[10px] opacity-30">Sync Test: v1.0.3-test</span>
          </footer>
        </div>
      </body>
    </html>
  );
}
