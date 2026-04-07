import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "700", "900"] });

export const metadata: Metadata = {
  title: "SIPINJAM | Manajemen Aset",
  description: "Sistem Manajemen Aset & Persediaan Pemerintah",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={cn(inter.className, "antialiased")}>
        <AuthProvider>
          <div className="mx-auto min-h-screen max-w-lg bg-slate-50 shadow-2xl shadow-slate-200 dark:bg-slate-900 md:max-w-none md:shadow-none">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
