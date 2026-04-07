import React from 'react'
import { prisma } from '@/lib/prisma'
import { Car, Monitor, Laptop, Search, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

export default async function AssetsPage() {
  const assets = await prisma.asset.findMany({
    orderBy: { type: 'asc' }
  })

  const getIcon = (type: string) => {
    switch (type) {
      case 'KENDARAAN_DINAS': return Car
      case 'PERALATAN_KOMPUTER': return Monitor
      case 'PERLENGKAPAN_KOMPUTER': return Laptop
      default: return Laptop
    }
  }

  return (
    <main className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Daftar Aset</h1>
        <div className="flex h-10 w-10 items-center justify-center bg-slate-100 rounded-2xl ring-1 ring-slate-200">
          <Filter className="h-5 w-5 text-slate-500" />
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input 
          type="text" 
          placeholder="Cari aset..." 
          className="w-full rounded-2xl border-none bg-slate-100 py-3 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
        />
      </div>

      <div className="grid gap-4">
        {assets.map((asset) => {
          const Icon = getIcon(asset.type)
          const isAvailable = asset.status === 'AVAILABLE'
          return (
            <div 
              key={asset.id}
              className="flex items-center gap-4 rounded-3xl border border-slate-50 bg-white p-4 shadow-sm transition-all active:scale-[0.98]"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-600 ring-1 ring-slate-100">
                <Icon className="h-7 w-7" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">{asset.name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{asset.type.replace('_', ' ')}</span>
                  {asset.licensePlate && (
                    <span className="text-[10px] font-bold text-slate-300">• {asset.licensePlate}</span>
                  )}
                </div>
              </div>
              <div className={cn(
                "rounded-full px-3 py-1 text-[10px] font-bold tracking-tight",
                isAvailable ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
              )}>
                {isAvailable ? 'Tersedia' : 'Dipinjam'}
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
