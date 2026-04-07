'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, Clock, User, ClipboardList } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function BookingLayout({
  children
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const navItems = [
    { name: 'Beranda', path: '/booking', icon: Home },
    { name: 'Katalog', path: '/booking/catalog', icon: ClipboardList },
    { name: 'Jadwal Saya', path: '/booking/history', icon: Calendar },
    { name: 'Profil', path: '/booking/profile', icon: User },
  ]

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-900">
      {/* Header - Glassmorphism */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/20 bg-slate-900/10 px-6 backdrop-blur-md">
        <h1 className="text-xl font-bold tracking-tight text-slate-800">Booking <span className="text-blue-600">Dinas</span></h1>
        <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-white bg-blue-100 shadow-sm">
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Agil" alt="Profile" />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-md px-4 py-6 md:max-w-4xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation - Mobile Optimized */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-slate-200 bg-white px-2 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] md:hidden">
        {navItems.map((item) => {
          const isActive = pathname === item.path
          const Icon = item.icon
          
          return (
            <Link key={item.path} href={item.path} className="relative flex flex-col items-center gap-1 p-2">
              <div className={`p-1 transition-all duration-300 ${isActive ? 'scale-110' : 'text-slate-400 opacity-70'}`}>
                <Icon size={24} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
              </div>
              <span className={`text-[10px] font-medium uppercase tracking-wider transition-colors duration-300 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                {item.name}
              </span>
              {isActive && (
                <motion.div 
                  layoutId="activeNav"
                  className="absolute -top-1 h-1 w-8 rounded-full bg-blue-600"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Desktop Navigation Link (Hidden on mobile) */}
      <div className="fixed bottom-8 right-8 hidden md:block">
        <Link href="/booking/catalog">
          <button className="flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 font-semibold text-white shadow-xl transition-all hover:bg-blue-700 hover:shadow-2xl">
            <ClipboardList size={20} />
            <span>Pinjam Sekarang</span>
          </button>
        </Link>
      </div>
    </div>
  )
}
