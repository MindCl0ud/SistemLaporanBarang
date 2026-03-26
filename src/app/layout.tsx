import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DocuMatch AI - Sistem Laporan Barang",
  description: "AI-powered document analyzer and BKU matching application.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-50 min-h-screen selection:bg-indigo-500/30`}>
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-8 min-h-screen w-full transition-all duration-300">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
