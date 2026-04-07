import React from 'react'
import { Car, Monitor, Laptop, Plus, ArrowRight, User as UserIcon, Calendar, CheckCircle2, Clock } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { prisma } from '@/lib/prisma'

export default async function Home() {
  const categoriesCount = await prisma.asset.groupBy({
    by: ['type'],
    _count: {
      id: true
    }
  })

  const getCount = (type: string) => categoriesCount.find(c => c.type === type)?._count.id || 0

  const categories = [
    { name: 'Kendaraan', icon: Car, color: 'bg-blue-500', count: getCount('KENDARAAN_DINAS'), type: 'KENDARAAN_DINAS' },
    { name: 'Peralatan', icon: Monitor, color: 'bg-indigo-500', count: getCount('PERALATAN_KOMPUTER'), type: 'PERALATAN_KOMPUTER' },
    { name: 'Perlengkapan', icon: Laptop, color: 'bg-purple-500', count: getCount('PERLENGKAPAN_KOMPUTER'), type: 'PERLENGKAPAN_KOMPUTER' },
  ]

  const recentBookings = await prisma.booking.findMany({
    take: 3,
    orderBy: { createdAt: 'desc' },
    include: {
      asset: true,
      user: true
    }
  })

  return (
    <main className="flex flex-col gap-6 p-6">
      {/* Header / Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Halo, <span className="text-primary">Admin</span> 👋
          </h1>
          <p className="text-sm font-medium text-slate-500">
            Selamat datang di SIPINJAM V2.0
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 ring-1 ring-slate-200">
          <UserIcon className="h-6 w-6 text-slate-600" />
        </div>
      </div>

      {/* Quick Action Button */}
      <Link 
        href="/booking/new"
        className="flex items-center justify-between rounded-3xl bg-primary p-5 text-white shadow-xl shadow-primary/20 transition-transform active:scale-95"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
            <Plus className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-bold">Buat Booking</p>
            <p className="text-xs opacity-80">Pinjam aset dengan cepat</p>
          </div>
        </div>
        <ArrowRight className="h-5 w-5 opacity-60" />
      </Link>

      {/* Categories Horizontal Scroll */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Kategori Aset</h2>
          <Link href="/assets" className="text-sm font-semibold text-primary">Lihat Semua</Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat) => (
            <div 
              key={cat.name}
              className="flex min-w-[140px] flex-col gap-3 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:border-slate-200 hover:shadow-md"
            >
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl text-white", cat.color)}>
                <cat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">{cat.name}</p>
                <p className="text-[10px] font-medium text-slate-400">{cat.count} Aset Tersedia</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Activity */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Aktivitas Terakhir</h2>
          <Clock className="h-5 w-5 text-slate-400" />
        </div>
        <div className="space-y-3">
          {recentBookings.length === 0 ? (
            <p className="text-center text-xs font-medium text-slate-400 py-4">Belum ada aktivitas baru.</p>
          ) : (
            recentBookings.map((booking) => (
              <div 
                key={booking.id}
                className="flex items-center gap-4 rounded-3xl border border-slate-50 bg-slate-50/50 p-4"
              >
                <div className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-2xl",
                  booking.status === 'ONGOING' ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
                )}>
                  {booking.status === 'ONGOING' ? <Calendar className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{booking.asset.name}</p>
                  <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
                    <span className="truncate">{booking.user.name}</span>
                    <span>•</span>
                    <span className="shrink-0">{new Date(booking.startDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Footer Branding */}
      <div className="mt-4 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
          MindCloud Advanced Agentic Coding
        </p>
      </div>
    </main>
  )
}
