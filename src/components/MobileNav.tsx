"use client"

import React from 'react'
import { Home, Calendar, Package, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { icon: Home, label: 'Beranda', href: '/' },
  { icon: Calendar, label: 'Booking', href: '/booking' },
  { icon: Package, label: 'Aset', href: '/assets' },
  { icon: User, label: 'Profil', href: '/profile' },
]

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-20 items-center justify-around border-t bg-white/80 pb-4 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-900/80">
      {navItems.map((item) => {
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
  )
}
