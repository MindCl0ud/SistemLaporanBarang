'use client'

import React, { useState, useEffect } from 'react'
import { getAssets } from '../../actions/bookingActions'
import Link from 'next/link'
import { Search, Filter, Car, Monitor, Laptop, ArrowRight, CheckCircle2, MoreHorizontal } from 'lucide-react'
import { motion } from 'framer-motion'

type Asset = Awaited<ReturnType<typeof getAssets>>[0]

export default function AssetCatalog() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'ALL' | 'VEHICLE' | 'PROJECTOR' | 'LAPTOP'>('ALL')

  useEffect(() => {
    async function load() {
      const data = await getAssets()
      setAssets(data)
      setLoading(false)
    }
    load()
  }, [])

  const filteredAssets = assets.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase()) || 
                         (a.licensePlate?.toLowerCase().includes(search.toLowerCase())) ||
                         (a.serialNumber?.toLowerCase().includes(search.toLowerCase()))
    const matchesFilter = filter === 'ALL' || a.type === filter
    return matchesSearch && matchesFilter
  })

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">Katalog Barang</h2>
        <p className="text-sm text-slate-500">Pilih aset yang ingin dipinjam.</p>
      </header>

      {/* Search & Filter Bar */}
      <div className="sticky top-20 z-20 flex flex-col gap-3 rounded-2xl bg-white/80 p-3 shadow-md backdrop-blur-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Cari Mobil, Proyektor..." 
            className="w-full rounded-xl bg-slate-100 py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { id: 'ALL', label: 'Semua', icon: null },
            { id: 'VEHICLE', label: 'Mobil', icon: Car },
            { id: 'PROJECTOR', label: 'Proyektor', icon: Monitor },
            { id: 'LAPTOP', label: 'Laptop', icon: Laptop },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id as any)}
              className={`flex flex-shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all shadow-sm ${
                filter === item.id 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-slate-600 border border-slate-100 hover:bg-slate-50'
              }`}
            >
              {item.icon && <item.icon size={14} />}
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Asset List */}
      <div className="grid grid-cols-1 gap-4 overflow-y-auto pb-10">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 w-full animate-pulse rounded-2xl bg-white shadow-sm" />
          ))
        ) : filteredAssets.length > 0 ? (
          filteredAssets.map((asset) => (
            <Link 
              key={asset.id} 
              href={`/booking/catalog/${asset.id}`} 
              className="group relative overflow-hidden rounded-2xl bg-white p-4 shadow-md transition-all active:scale-[0.98]"
            >
              <div className="flex gap-4">
                <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100 border border-slate-100">
                  <img 
                    src={asset.imageUrl === '/assets/mobil_dinas.png' ? 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=200' : 
                         asset.type === 'VEHICLE' ? 'https://images.unsplash.com/photo-1601611029199-7927e57c6a99?auto=format&fit=crop&q=80&w=200' :
                         'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=200'} 
                    alt={asset.name} 
                    className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  {asset.status === 'AVAILABLE' && (
                    <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
                      <CheckCircle2 size={12} strokeWidth={3} />
                    </div>
                  )}
                </div>

                <div className="flex flex-col justify-between py-1 flex-grow">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                        asset.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {asset.status === 'AVAILABLE' ? 'Tersedia' : 'Dipakai'}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{asset.type}</span>
                    </div>
                    <h4 className="line-clamp-1 font-bold text-slate-800 text-lg">{asset.name}</h4>
                    <p className="text-xs font-semibold text-blue-600/70 antialiased">{asset.licensePlate || asset.serialNumber || 'SN: ' + asset.id.slice(-6)}</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-slate-400 antialiased line-clamp-1 italic">{asset.description?.slice(0, 40)}...</p>
                    <button className={`p-2 rounded-full transition-all ${
                      asset.status === 'AVAILABLE' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'
                    }`}>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-slate-400">
            <Search size={48} strokeWidth={1} />
            <p className="font-semibold text-sm">Tidak ada barang ditemukan.</p>
          </div>
        )}
      </div>
    </div>
  )
}
