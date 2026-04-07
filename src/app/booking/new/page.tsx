import React from 'react'
import { prisma } from '@/lib/prisma'
import { Calendar, Clock, FileText, ChevronRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export default async function NewBookingPage() {
  const assets = await prisma.asset.findMany({
    where: { status: 'AVAILABLE' },
    orderBy: { type: 'asc' }
  })

  return (
    <main className="flex flex-col gap-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Buat Booking</h1>
        <p className="text-sm font-medium text-slate-500">Isi detail peminjaman di bawah ini.</p>
      </div>

      <form className="space-y-6">
        {/* Asset Selection */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-slate-700">Pilih Aset</label>
          <div className="grid gap-3">
            {assets.map((asset) => (
              <label 
                key={asset.id}
                className="relative flex cursor-pointer items-center gap-4 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-primary/20 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
              >
                <input type="radio" name="assetId" value={asset.id} className="peer hidden" />
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-600 ring-1 ring-slate-100 peer-checked:bg-primary peer-checked:text-white">
                  <Check className="hidden h-5 w-5 peer-checked:block" />
                  <div className="h-2 w-2 rounded-full bg-slate-300 peer-checked:hidden" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800">{asset.name}</p>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{asset.type.replace('_', ' ')}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Purpose */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-slate-700">Keperluan</label>
          <div className="relative">
            <FileText className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
            <textarea 
              rows={3}
              placeholder="Contoh: Rapat Koordinasi di Provinsi..." 
              className="w-full rounded-2xl border-none bg-slate-100 py-4 pl-12 pr-4 text-sm font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Date & Time (Simplified for UI) */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-700">Mulai</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input type="date" className="w-full rounded-2xl border-none bg-slate-100 py-3 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-700">Jam</label>
            <div className="relative">
              <Clock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input type="time" className="w-full rounded-2xl border-none bg-slate-100 py-3 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-primary" />
            </div>
          </div>
        </div>

        <button 
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-3xl bg-primary py-4 text-lg font-bold text-white shadow-xl shadow-primary/20 transition-transform active:scale-95"
        >
          Konfirmasi Pinjaman
          <ChevronRight className="h-5 w-5" />
        </button>
      </form>
    </main>
  )
}
