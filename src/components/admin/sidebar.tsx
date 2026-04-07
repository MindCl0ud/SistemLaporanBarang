"use client"

import React from 'react'
import { LayoutDashboard, Box, MapPin, ClipboardList, LogOut } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { signOut } from 'next-auth/react'

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
  { icon: Box, label: 'Master Barang', href: '/admin/items' },
  { icon: MapPin, label: 'Master Bidang', href: '/admin/locations' },
  { icon: ClipboardList, label: 'Laporan', href: '/admin/reports' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-white p-6 dark:bg-slate-900 md:flex">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/20">
            <Box className="h-6 w-6" />
          </div>
          <span className="text-xl font-black tracking-tight">SIPINJAM</span>
        </div>
        
        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all",
                  isActive 
                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <button 
          onClick={() => signOut()}
          className="mt-auto flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-rose-500 transition-all hover:bg-rose-50"
        >
          <LogOut className="h-5 w-5" />
          Keluar
        </button>
      </aside>

      {/* Mobile Bottom Bar (Override legacy if needed) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-20 items-center justify-around border-t bg-white/80 pb-4 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-900/80 md:hidden">
        {menuItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-6 w-6", isActive && "fill-primary/10")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
