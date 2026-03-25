"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  MessageSquare,
  Settings,
} from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Dokumen", href: "/documents", icon: FileText },
  { name: "BKU Bulanan", href: "/bku", icon: BookOpen },
  { name: "Tanya AI", href: "/chat", icon: MessageSquare },
  { name: "Pengaturan", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen bg-[#0a0f1c]/80 backdrop-blur-xl border-r border-white/5 flex flex-col pt-8 pb-6 text-white fixed">
      <div className="px-6 mb-12">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent tracking-tight">
          DocuMatch AI
        </h1>
        <p className="text-xs text-slate-400 mt-1">Sistem Laporan Barang</p>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 relative group ${
                isActive ? "text-white font-medium" : "text-slate-400 hover:text-white"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-white/10 border border-white/10 rounded-2xl -z-10"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon
                className={`w-5 h-5 transition-transform duration-300 ${
                  isActive ? "text-blue-400" : "group-hover:text-blue-300 group-hover:scale-110"
                }`}
              />
              <span className="text-sm">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-6 mt-auto">
        <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border border-indigo-500/20 backdrop-blur-md">
          <h4 className="text-xs font-semibold text-indigo-300 mb-1">Status Sistem</h4>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]"></div>
            <p className="text-[11px] text-slate-300">AI Engine: Ready</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
