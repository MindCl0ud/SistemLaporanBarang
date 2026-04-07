'use server'

import React from 'react'
import { getAssets, seedDemoAssets } from '../actions/bookingActions'
import Link from 'next/link'
import { Car, Monitor, Laptop, ArrowRight, CheckCircle2, AlertCircle, Clock } from 'lucide-react'

export default async function BookingDashboard() {
  // Ensure we have data
  await seedDemoAssets()
  
  const assets = await getAssets()
  const availableCount = assets.filter(a => a.status === 'AVAILABLE').length
  const bookedCount = assets.filter(a => a.status === 'BOOKED').length

  const categories = [
    { name: 'Kendaraan', icon: Car, color: 'bg-blue-500', count: assets.filter(a => a.type === 'VEHICLE').length },
    { name: 'Proyektor', icon: Monitor, color: 'bg-emerald-500', count: assets.filter(a => a.type === 'PROJECTOR').length },
    { name: 'Laptop', icon: Laptop, color: 'bg-indigo-500', count: assets.filter(a => a.type === 'LAPTOP').length },
  ]

  return (
    <div className="flex flex-col gap-8">
      {/* Welcome Card - Glassmorphism */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 p-8 text-white shadow-2xl">
        <div className="relative z-10">
          <h2 className="mb-2 text-2xl font-bold">Halo, Agil! 👋</h2>
          <p className="mb-6 text-slate-400">Siap untuk tugas dinas hari ini?</p>
          
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-emerald-400">{availableCount}</span>
              <span className="text-xs uppercase tracking-wider text-slate-500">Tersedia</span>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-amber-400">{bookedCount}</span>
              <span className="text-xs uppercase tracking-wider text-slate-500">Dipakai</span>
            </div>
          </div>
        </div>

        {/* Abstract Background Shapes */}
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute -bottom-10 right-20 h-20 w-20 rounded-full bg-emerald-600/10 blur-2xl" />
      </section>

      {/* Categories Grid */}
      <section>
        <h3 className="mb-4 text-lg font-bold text-slate-800">Kategori Utama</h3>
        <div className="grid grid-cols-3 gap-3">
          {categories.map((cat) => (
            <div key={cat.name} className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-white p-4 shadow-sm transition-transform active:scale-95">
              <div className={`p-3 rounded-xl ${cat.color} text-white shadow-lg`}>
                <cat.icon size={24} />
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{cat.name}</p>
                <p className="text-sm font-semibold text-slate-800">{cat.count} Item</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Action - Suggested Asset */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">Sering Dipinjam</h3>
          <Link href="/booking/catalog" className="text-sm font-semibold text-blue-600 flex items-center gap-1">
            Lihat Semua <ArrowRight size={16} />
          </Link>
        </div>

        <div className="space-y-4">
          {assets.slice(0, 2).map((asset) => (
            <Link key={asset.id} href={`/booking/catalog/${asset.id}`} className="group flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
              <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100 border border-slate-100">
                <img 
                  src={asset.imageUrl === '/assets/mobil_dinas.png' ? 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=200' : 
                       asset.type === 'VEHICLE' ? 'https://images.unsplash.com/photo-1601611029199-7927e57c6a99?auto=format&fit=crop&q=80&w=200' :
                       'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=200'} 
                  alt={asset.name} 
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="flex-grow">
                <div className="flex items-center gap-2 mb-1">
                   <div className={`h-2 w-2 rounded-full ${asset.status === 'AVAILABLE' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500'}`} />
                   <span className={`text-[10px] font-bold uppercase tracking-wider ${asset.status === 'AVAILABLE' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {asset.status === 'AVAILABLE' ? 'Tersedia' : 'Dipakai'}
                   </span>
                </div>
                <h4 className="font-bold text-slate-800">{asset.name}</h4>
                <p className="text-xs text-slate-500 truncate max-w-[200px]">{asset.licensePlate || asset.serialNumber || asset.description}</p>
              </div>
              <div className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                <ArrowRight size={20} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Info Card - Prosedur */}
      <section className="mb-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
        <div className="flex gap-3">
          <AlertCircle className="text-blue-600 flex-shrink-0" size={24} />
          <div>
            <h4 className="mb-1 text-sm font-bold text-blue-900">Prosedur Peminjaman</h4>
            <p className="text-xs leading-relaxed text-blue-700/80">
              Setiap peminjaman wajib melakukan <strong>Check-out</strong> (Serah Terima) di Ruang Sarpras maksimal 30 menit sebelum keberangkatan.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
