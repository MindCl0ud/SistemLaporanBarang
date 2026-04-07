'use client'

import React, { useState, useEffect } from 'react'
import { getMyBookings } from '../../actions/bookingActions'
import Link from 'next/link'
import { Calendar, Clock, CheckCircle2, AlertCircle, Clock3, MoreHorizontal, ArrowRight, UserCheck } from 'lucide-react'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'

type Booking = Awaited<ReturnType<typeof getMyBookings>>[0]

export default function BookingHistory() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const userName = 'Agil' // Fixed for demo

  useEffect(() => {
    async function load() {
      const data = await getMyBookings(userName)
      setBookings(data)
      setLoading(false)
    }
    load()
  }, [])

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'APPROVED': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'ONGOING': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'COMPLETED': return 'bg-slate-100 text-slate-500 border-slate-200'
      case 'CANCELLED': return 'bg-red-100 text-red-700 border-red-200'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock3 size={14} />
      case 'APPROVED': return <CheckCircle2 size={14} />
      case 'ONGOING': return <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}><Clock size={14} /></motion.div>
      case 'COMPLETED': return <CheckCircle2 size={14} />
      case 'CANCELLED': return <AlertCircle size={14} />
      default: return <Clock3 size={14} />
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">Jadwal Saya</h2>
        <p className="text-sm text-slate-500">Riwayat dan status peminjaman Anda.</p>
      </header>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-blue-600 p-4 text-white shadow-lg shadow-blue-200">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Aktif/Menunggu</p>
          <h3 className="text-2xl font-bold">{bookings.filter(b => ['PENDING', 'APPROVED', 'ONGOING'].includes(b.status)).length}</h3>
        </div>
        <div className="rounded-2xl bg-white p-4 text-slate-800 shadow-sm border border-slate-100">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Terselesaikan</p>
          <h3 className="text-2xl font-bold">{bookings.filter(b => b.status === 'COMPLETED').length}</h3>
        </div>
      </div>

      {/* List */}
      <div className="flex flex-col gap-4 pb-10">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 w-full animate-pulse rounded-2xl bg-white shadow-sm" />
          ))
        ) : bookings.length > 0 ? (
          bookings.map((booking) => (
            <motion.div 
              key={booking.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative overflow-hidden rounded-3xl bg-white p-4 shadow-md border border-slate-50"
            >
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <div className={`mb-1 flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest ${getStatusStyle(booking.status)}`}>
                    {getStatusIcon(booking.status)} {booking.status}
                  </div>
                  <h4 className="text-lg font-bold text-slate-800">{booking.asset.name}</h4>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{booking.asset.licensePlate || booking.asset.serialNumber || 'Aset Dinas'}</p>
                </div>
                <button className="rounded-full bg-slate-50 p-2 text-slate-400">
                  <MoreHorizontal size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 rounded-2xl bg-slate-50/80 p-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">Mulai</span>
                  <p className="text-[10px] font-bold text-slate-700">{format(new Date(booking.startDate), 'dd MMM yyyy, HH:mm', { locale: idLocale })}</p>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">Selesai</span>
                  <p className="text-[10px] font-bold text-slate-700">{format(new Date(booking.endDate), 'dd MMM yyyy, HH:mm', { locale: idLocale })}</p>
                </div>
              </div>

              {booking.status === 'APPROVED' && (
                <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-3">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-blue-100 p-1 text-blue-600">
                      <UserCheck size={14} />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500">Ambil barang di Sarpras</span>
                  </div>
                  <button className="flex items-center gap-1 rounded-xl bg-blue-600 px-4 py-2 text-[10px] font-bold text-white shadow-md active:scale-95 transition-all">
                    Lihat Token <ArrowRight size={12} />
                  </button>
                </div>
              )}

              {booking.status === 'ONGOING' && (
                <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-3">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-emerald-100 p-1 text-emerald-600">
                      <Clock size={14} />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500">Sedang Digunakan</span>
                  </div>
                  <button className="flex items-center gap-1 rounded-xl bg-slate-800 px-4 py-2 text-[10px] font-bold text-white shadow-md active:scale-95 transition-all">
                    Kembalikan <ArrowRight size={12} />
                  </button>
                </div>
              )}
            </motion.div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-slate-400">
            <Calendar size={48} strokeWidth={1} />
            <p className="font-semibold text-sm">Belum ada peminjaman.</p>
            <Link href="/booking/catalog" className="rounded-full bg-blue-600 px-6 py-3 text-xs font-bold text-white shadow-lg">Cari Barang</Link>
          </div>
        )}
      </div>
    </div>
  )
}
