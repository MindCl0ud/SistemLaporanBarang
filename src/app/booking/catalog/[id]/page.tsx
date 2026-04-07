'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getAssets, createBooking } from '../../../actions/bookingActions'
import { ArrowLeft, Calendar, Clock, MapPin, User, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { format, addDays, setHours, setMinutes } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

type Asset = Awaited<ReturnType<typeof getAssets>>[0]

export default function BookingForm() {
  const params = useParams()
  const router = useRouter()
  const assetId = params.id as string

  const [asset, setAsset] = useState<Asset | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form State
  const [userName, setUserName] = useState('Agil') // Default for demo
  const [userDivision, setUserDivision] = useState('Bidang Umum')
  const [startDate, setStartDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'))
  const [startTime, setStartTime] = useState('08:00')
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'))
  const [endTime, setEndTime] = useState('17:00')
  const [purpose, setPurpose] = useState('')

  useEffect(() => {
    async function load() {
      const assets = await getAssets()
      const found = assets.find((a: any) => a.id === assetId)
      if (found) setAsset(found)
      setLoading(false)
    }
    load()
  }, [assetId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const start = new Date(`${startDate}T${startTime}`)
      const end = new Date(`${endDate}T${endTime}`)

      if (end <= start) {
        throw new Error('Waktu selesai harus setelah waktu mulai.')
      }

      await createBooking({
        assetId,
        userName,
        userDivision,
        startDate: start,
        endDate: end,
        purpose
      })

      setSuccess(true)
      setTimeout(() => router.push('/booking/history'), 2000)
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memproses booking.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="flex h-[60vh] items-center justify-center">
      <Loader2 className="animate-spin text-blue-600" size={32} />
    </div>
  )

  if (!asset) return (
    <div className="flex flex-col items-center gap-4 py-20 text-slate-400">
      <AlertCircle size={48} />
      <p>Barang tidak ditemukan.</p>
      <Link href="/booking/catalog" className="text-blue-600 font-bold">Kembali ke Katalog</Link>
    </div>
  )

  return (
    <div className="flex flex-col gap-6 pb-20">
      {/* Back Button & Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="rounded-full bg-white p-2 shadow-sm text-slate-600 active:scale-90 transition-transform">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold text-slate-800">Detail & Booking</h2>
      </div>

      {/* Asset Hero Card */}
      <section className="overflow-hidden rounded-3xl bg-white shadow-lg">
        <div className="relative h-48 w-full bg-slate-100">
          <img 
            src={asset.imageUrl === '/assets/mobil_dinas.png' ? 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=600' : 
                 asset.type === 'VEHICLE' ? 'https://images.unsplash.com/photo-1601611029199-7927e57c6a99?auto=format&fit=crop&q=80&w=600' :
                 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=600'} 
            alt={asset.name} 
            className="h-full w-full object-cover"
          />
          <div className="absolute bottom-4 right-4 rounded-full bg-white/90 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-blue-600 shadow-xl backdrop-blur-md">
            {asset.type}
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-1">
             <div className={`h-2 w-2 rounded-full ${asset.status === 'AVAILABLE' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
             <span className={`text-[10px] font-bold uppercase tracking-wider ${asset.status === 'AVAILABLE' ? 'text-emerald-600' : 'text-amber-600'}`}>
              {asset.status === 'AVAILABLE' ? 'Tersedia Sekarang' : 'Sedang Dipakai'}
             </span>
          </div>
          <h3 className="text-2xl font-bold text-slate-800">{asset.name}</h3>
          <p className="mb-4 text-sm font-semibold text-blue-600">{asset.licensePlate || asset.serialNumber || 'SN: ' + asset.id.slice(-6)}</p>
          <p className="text-xs leading-relaxed text-slate-500">{asset.description}</p>
        </div>
      </section>

      {/* Booking Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 rounded-3xl bg-white p-6 shadow-lg border border-slate-100">
        <h4 className="border-b border-slate-100 pb-3 text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Calendar size={16} /> Formulir Peminjaman
        </h4>

        {/* Date/Time Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 pl-1">Mulai Tanggal</label>
            <input 
              type="date" 
              className="rounded-xl bg-slate-50 p-3 text-sm font-semibold outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-blue-500/20"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 pl-1">Jam Mulai</label>
            <input 
              type="time" 
              className="rounded-xl bg-slate-50 p-3 text-sm font-semibold outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-blue-500/20"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 pl-1">Selesai Tanggal</label>
            <input 
              type="date" 
              className="rounded-xl bg-slate-50 p-3 text-sm font-semibold outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-blue-500/20"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 pl-1">Jam Selesai</label>
            <input 
              type="time" 
              className="rounded-xl bg-slate-50 p-3 text-sm font-semibold outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-blue-500/20"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Purpose */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 pl-1">Keperluan / Tujuan</label>
          <textarea 
            rows={3}
            placeholder="Contoh: Rapat Koordinasi ke Kantor Gubernur..."
            className="rounded-xl bg-slate-50 p-3 text-sm font-medium outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-blue-500/20"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            required
          />
        </div>

        {/* User Info (Readonly for demo) */}
        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-blue-100 p-2 text-blue-600">
            <User size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">{userName}</p>
            <p className="text-[10px] font-medium text-slate-500">{userDivision}</p>
          </div>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-600"
          >
            <AlertCircle size={16} /> {error}
          </motion.div>
        )}

        <button 
          type="submit"
          disabled={submitting || success}
          className={`relative mt-4 flex items-center justify-center gap-2 rounded-2xl py-4 font-bold text-white shadow-xl transition-all active:scale-95 ${
            success ? 'bg-emerald-500' : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-70'
          }`}
        >
          {submitting ? (
            <Loader2 className="animate-spin" size={20} />
          ) : success ? (
            <>
              <CheckCircle2 size={20} /> Booking Berhasil!
            </>
          ) : (
            'Ajukan Peminjaman'
          )}
        </button>
      </form>
    </div>
  )
}
