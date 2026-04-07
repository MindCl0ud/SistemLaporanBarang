import React from 'react'
import { prisma } from '@/lib/prisma'
import { Calendar, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default async function BookingsPage() {
  const bookings = await prisma.booking.findMany({
    include: {
      asset: true,
      user: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <main className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-black tracking-tight text-slate-900">Peminjaman Saya</h1>

      <div className="grid gap-4">
        {bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-slate-200 p-8 text-center">
            <Calendar className="h-12 w-12 text-slate-300" />
            <div>
              <p className="text-sm font-bold text-slate-400">Belum ada peminjaman</p>
              <p className="text-xs text-slate-300">Buat booking pertama Anda hari ini!</p>
            </div>
          </div>
        ) : (
          bookings.map((booking) => (
            <div 
              key={booking.id}
              className="flex flex-col gap-4 rounded-3xl border border-slate-50 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-2xl",
                    booking.status === 'ONGOING' ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
                  )}>
                    {booking.status === 'ONGOING' ? <AlertCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{booking.asset.name}</p>
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{booking.asset.type.replace('_', ' ')}</p>
                  </div>
                </div>
                <div className={cn(
                  "rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-tight",
                  booking.status === 'ONGOING' ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"
                )}>
                  {booking.status}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Jadwal</p>
                  <p className="text-xs font-bold text-slate-600">
                    {new Date(booking.startDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} • 08:00 - Selesai
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </div>

              {booking.status === 'ONGOING' && (
                <button className="w-full rounded-2xl bg-slate-900 py-3 text-xs font-bold text-white shadow-lg active:scale-95">
                  Kembalikan Barang
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </main>
  )
}
