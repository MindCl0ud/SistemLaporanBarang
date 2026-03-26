"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Dokumen", href: "/documents", icon: FileText },
  { name: "BKU Bulanan", href: "/bku", icon: BookOpen },
  { name: "Tanya AI", href: "/chat", icon: MessageSquare },
  { name: "Pengaturan", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("sidebarCollapsed");
    if (saved) setIsCollapsed(JSON.parse(saved));
  }, []);

  const toggleSidebar = () => {
    const newVal = !isCollapsed;
    setIsCollapsed(newVal);
    localStorage.setItem("sidebarCollapsed", JSON.stringify(newVal));
  };

  return (
    <aside className={`h-screen sticky top-0 bg-[#0a0f1c]/80 backdrop-blur-xl border-r border-white/5 flex flex-col py-6 text-white transition-all duration-300 z-50 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className="px-6 mb-8 flex items-center justify-between">
        {!isCollapsed && (
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent tracking-tight whitespace-nowrap">
              DocuMatch AI
            </h1>
            <p className="text-[10px] text-slate-400 mt-1 whitespace-nowrap">Sistem Laporan Barang</p>
          </div>
        )}
        <button 
          onClick={toggleSidebar} 
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors border border-white/5"
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
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
                className={`w-5 h-5 shrink-0 transition-transform duration-300 ${
                  isActive ? "text-blue-400" : "group-hover:text-blue-300 group-hover:scale-110"
                } ${isCollapsed ? 'mx-auto' : ''}`}
              />
              {!isCollapsed && <span className="text-sm font-medium whitespace-nowrap transition-opacity duration-300">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {mounted && !isCollapsed && (
        <div className="px-6 mt-auto">
          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border border-indigo-500/20 backdrop-blur-md">
            <h4 className="text-xs font-semibold text-indigo-300 mb-1">Status Sistem</h4>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)] shrink-0"></div>
              <p className="text-[11px] text-slate-300">AI Engine: Ready</p>
            </div>
          </div>
        </div>
      )}
      {mounted && isCollapsed && (
        <div className="px-4 mt-auto flex justify-center">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]" title="AI Engine: Ready"></div>
        </div>
      )}
    </aside>
  );
}
