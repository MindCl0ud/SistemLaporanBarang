"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  Package,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  ListTree,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Dokumen", href: "/documents", icon: FileText },
  { name: "BKU Bulanan", href: "/bku", icon: BookOpen },
  { name: "Master Rekening", href: "/settings/accounts", icon: ListTree },
  { name: "Master Barang", href: "/master-barang", icon: Package },
  { name: "Tanya AI", href: "/chat", icon: MessageSquare },
  { name: "Pengaturan", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

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

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <aside className={`h-screen sticky top-0 bg-card backdrop-blur-xl border-r border-border flex flex-col py-6 text-foreground transition-all duration-300 z-50 ${isCollapsed ? 'w-[var(--sidebar-collapsed)]' : 'w-[var(--sidebar-width)]'}`}>
      <div className="px-6 mb-8 flex items-center justify-between">
        {!isCollapsed && (
          <div>
            <h1 className="text-xl font-black text-foreground tracking-tight whitespace-nowrap">
              DocuMatch AI
            </h1>
            <p className="text-[10px] text-primary mt-1 whitespace-nowrap tracking-wider font-extrabold uppercase">SISTEM LAPORAN BARANG</p>
          </div>
        )}
        <button 
          onClick={toggleSidebar} 
          className="p-1.5 rounded-lg bg-input hover:bg-accent text-foreground/70 hover:text-foreground transition-all border border-border shadow-sm active:scale-95 transition-all duration-200"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-1.5 rounded-xl transition-all duration-300 relative group ${
                isActive ? "text-indigo-700 dark:text-white font-black" : "text-muted hover:text-primary dark:hover:text-white"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-primary/10 dark:bg-indigo-500/20 border border-primary/20 dark:border-indigo-500/40 rounded-2xl -z-10"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon
                className={`w-5 h-5 shrink-0 transition-transform duration-300 ${
                  isActive ? "text-primary" : "group-hover:text-primary group-hover:scale-110"
                } ${isCollapsed ? 'mx-auto' : ''}`}
              />
              {!isCollapsed && <span className="text-sm font-medium whitespace-nowrap transition-opacity duration-300">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 mt-auto mb-4">
        <button
          onClick={toggleTheme}
          className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl transition-all duration-300 hover:bg-input border border-transparent hover:border-border group ${isCollapsed ? 'justify-center' : ''}`}
        >
          {theme === "dark" ? (
            <Sun className="w-5 h-5 text-amber-400 group-hover:rotate-45 transition-transform" />
          ) : (
            <Moon className="w-5 h-5 text-foreground/60 group-hover:-rotate-12 transition-transform" />
          )}
          {!isCollapsed && (
            <span className="text-sm font-medium text-foreground/60 group-hover:text-foreground transition-colors">
              {theme === "dark" ? "Mode Terang" : "Mode Gelap"}
            </span>
          )}
        </button>
      </div>

      {mounted && !isCollapsed && (
        <div className="px-6 space-y-3">
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
            <h4 className="text-[10px] font-black text-primary mb-1 uppercase tracking-widest">Status Sistem</h4>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.3)] shrink-0"></div>
              <p className="text-[11px] text-foreground font-bold tracking-tight">AI Engine Ready</p>
            </div>
          </div>
          
          {/* VERSION PROOF BADGE */}
          <div className="px-1 py-1 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-center">
            <span className="text-[9px] font-black text-primary uppercase tracking-tighter">V2.5 - DATA ARITHMETIC PRO</span>
          </div>
        </div>
      )}
      {mounted && isCollapsed && (
        <div className="px-4 flex justify-center">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" title="AI Engine: Ready"></div>
        </div>
      )}
    </aside>
  );
}
