import React from 'react'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Box, MapPin, AlertTriangle, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default async function AdminDashboard() {
  const stats = {
    totalItems: await prisma.item.count(),
    lowStock: await prisma.item.count({ where: { tipe: 'HABIS_PAKAI', currentStok: { lt: 10 } } }), // Example threshold
    activeBookings: await prisma.booking.count({ where: { status: 'ONGOING' } }),
    totalBidang: await prisma.bidang.count(),
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Panel Admin</h1>
        <p className="text-sm font-medium text-slate-500">
          Kelola aset dan persediaan operasional hari ini.
        </p>
      </div>

      {/* Scorecard (Modul 8 preview) */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm dark:bg-slate-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2 shadow-none">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">Total Barang</CardTitle>
            <Box className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{stats.totalItems}</div>
            <p className="text-[10px] text-slate-400">Terdaftar di SIPINJAM</p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm dark:bg-slate-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2 shadow-none">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-rose-500">Stok Menipis</CardTitle>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-rose-600">{stats.lowStock}</div>
            <p className="text-[10px] text-slate-400">Butuh pengadaan segera</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm dark:bg-slate-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2 shadow-none">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-amber-500">Peminjaman Aktif</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-amber-600">{stats.activeBookings}</div>
            <p className="text-[10px] text-slate-400">Kendaraan & Fasilitas</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm dark:bg-slate-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2 shadow-none">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">Unit Bidang</CardTitle>
            <MapPin className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{stats.totalBidang}</div>
            <p className="text-[10px] text-slate-400">Tersebar di berbagai lokasi</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area (Modul 2 Master Data Quick View) */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-none shadow-sm dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Aktivitas Gudang</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
              <ClipboardList className="h-12 w-12 text-slate-200" />
              <p className="text-sm font-medium text-slate-400 italic">Belum ada aktivitas stok hari ini.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ClipboardList(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </svg>
  )
}
