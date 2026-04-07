'use client'

import React, { useState, useEffect } from 'react'
import { getAssets, updateBookingStatus, logHandover } from '../../actions/bookingActions'
import { CheckCircle2, AlertCircle, Clock, Truck, RotateCcw, User, MapPin, Search, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { PrismaClient } from '@prisma/client'

// Since I can't easily get ALL bookings from the client without a specific action, 
// I'll assume for the demo that we fetch by a special "getAdminBookings" action which I'll add.
// For now, I'll use a simplified version.

export default function AdminHandover() {
  const [activeTab, setActiveTab] = useState<'PICKUP' | 'RETURN'>('PICKUP')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  
  // Mocking admin data for demo visual
  const [pickups, setPickups] = useState<any[]>([])
  const [returns, setReturns] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      // In a real app, we'd fetch actual pending/ongoing bookings
      setLoading(true)
      // Simulating fetch
      setTimeout(() => {
        setPickups([
          { id: 'b1', userName: 'Agil', userDivision: 'Umum', asset: { name: 'Toyota Innova', licensePlate: 'B 1234 PJP' }, startDate: new Date(), status: 'APPROVED' },
          { id: 'b2', userName: 'Budi', userDivision: 'Humas', asset: { name: 'Projector Epson', serialNumber: 'PJ-001' }, startDate: new Date(), status: 'APPROVED' },
        ])
        setReturns([
          { id: 'b3', userName: 'Chandra', userDivision: 'IT', asset: { name: 'MacBook Air M2', serialNumber: 'LP-001' }, endDate: new Date(), status: 'ONGOING' },
        ])
        setLoading(false)
      }, 800)
    }
    load()
  }, [])

  const handleProcess = async (bookingId: string, type: 'PICKUP' | 'RETURN') => {
    setProcessing(bookingId)
    try {
      await logHandover({
        bookingId,
        type,
        condition: 'GOOD',
        staffName: 'Admin Sarpras',
        notes: 'Serah terima normal'
      })
      // Refresh local state
      if (type === 'PICKUP') setPickups(prev => prev.filter(p => p.id !== bookingId))
      if (type === 'RETURN') setReturns(prev => prev.filter(r => r.id !== bookingId))
    } catch (err) {
      console.error(err)
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">Panel Sarpras</h2>
        <p className="text-sm text-slate-500">Konfirmasi serah terima barang dinas.</p>
      </header>

      {/* Tabs */}
      <div className="flex rounded-2xl bg-slate-100 p-1">
        <button 
          onClick={() => setActiveTab('PICKUP')}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold transition-all ${
            activeTab === 'PICKUP' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
          }`}
        >
          <Truck size={16} /> Pengambilan (Pick up)
        </button>
        <button 
          onClick={() => setActiveTab('RETURN')}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold transition-all ${
            activeTab === 'RETURN' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'
          }`}
        >
          <RotateCcw size={16} /> Pengembalian (Return)
        </button>
      </div>

      {/* Search Admin */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Cari Nama atau No HP..." 
          className="w-full rounded-2xl bg-white border border-slate-100 py-4 pl-10 pr-4 text-sm font-medium shadow-sm outline-none focus:ring-2 focus:ring-blue-500/10"
        />
      </div>

      {/* List */}
      <div className="flex flex-col gap-4 pb-20">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 pl-2">
          {activeTab === 'PICKUP' ? 'Daftar Serah Terima Hari Ini' : 'Daftar Pengembalian Hari Ini'}
        </h3>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-300" size={32} /></div>
        ) : (activeTab === 'PICKUP' ? pickups : returns).length > 0 ? (
          (activeTab === 'PICKUP' ? pickups : returns).map((item) => (
            <motion.div 
              layout
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-3xl bg-white p-5 shadow-md border border-slate-50 flex flex-col gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full border-2 border-white shadow-sm">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${item.userName}`} alt={item.userName} />
                </div>
                <div className="flex-grow">
                  <h4 className="font-bold text-slate-800">{item.userName}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{item.userDivision}</p>
                </div>
                <div className={`p-2 rounded-xl scale-75 ${activeTab === 'PICKUP' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  {activeTab === 'PICKUP' ? <Truck size={24} /> : <RotateCcw size={24} />}
                </div>
              </div>

              <div className="border-t border-slate-50 pt-4">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Barang Peminjaman</p>
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-slate-700">{item.asset.name}</h5>
                    <p className="text-[10px] font-semibold text-blue-600/70 antialiased">{item.asset.licensePlate || item.asset.serialNumber}</p>
                  </div>
                  <button 
                    disabled={processing === item.id}
                    onClick={() => handleProcess(item.id, activeTab)}
                    className={`flex items-center justify-center h-12 px-6 rounded-2xl font-black text-[10px] uppercase tracking-[0.15em] text-white shadow-lg shadow-black/5 active:scale-95 transition-all ${
                      activeTab === 'PICKUP' ? 'bg-slate-900' : 'bg-emerald-600'
                    }`}
                  >
                    {processing === item.id ? <Loader2 className="animate-spin" size={16} /> : 'Konfirmasi'}
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-slate-400">
            <CheckCircle2 size={48} strokeWidth={1} />
            <p className="font-semibold text-sm">Tidak ada jadwal tersisa.</p>
          </div>
        )}
      </div>
    </div>
  )
}
