import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import MobileNav from "@/components/MobileNav";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "700", "900"] });

export const metadata: Metadata = {
  title: "SIPINJAM - Sistem Peminjaman Barang Dinas",
  description: "Manajemen peminjaman kendaraan dan inventaris dinas yang cerdas dan efisien.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={cn("h-full", "font-sans", geist.variable)}>
      <body className={cn(inter.className, "min-h-full bg-slate-50 dark:bg-slate-950 pb-24")}>
        <div className="mx-auto max-w-md bg-white min-h-screen shadow-sm dark:bg-slate-900">
          {children}
        </div>
        <MobileNav />
      </body>
    </html>
  );
}
