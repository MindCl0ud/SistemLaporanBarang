import { FileText, CheckCircle2, AlertTriangle, Activity, RefreshCw } from "lucide-react"
export const dynamic = 'force-dynamic'
import { getDashboardStats } from "@/app/actions/matchActions"
import MatchRunner from "@/components/MatchRunner"
import Link from "next/link"
// FINAL TRIGGER: Master Barang & Smart OCR Update - v2
import React from 'react'

export default async function Home() {
  const stats = await getDashboardStats()

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <header>
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-white dark:to-slate-400">
          Overview Dashboard
        </h1>
        <p className="text-foreground/60 mt-2 font-medium">Ringkasan status pencocokan dokumen vs BKU bulan ini.</p>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Dokumen"
          value={stats.totalDocs.toString()}
          icon={<FileText className="w-5 h-5 text-blue-400" />}
          trend="Semua dari sistem"
        />
        <StatCard
          title="Tercocokkan"
          value={stats.matchedDocs.toString()}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          trend="Dengan BKU"
        />
        <StatCard
          title="Belum Berdokumen"
          value={stats.bkuWithoutDocs.toString()}
          icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}
          trend="Transaksi BKU"
        />
        <StatCard
          title="Akurasi AI"
          value={`${stats.accuracy}%`}
          icon={<Activity className="w-5 h-5 text-indigo-400" />}
          trend="Tingkat Kecocokan"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart / Area */}
        <div className="lg:col-span-2 relative p-6 rounded-2xl bg-card border border-border backdrop-blur-sm overflow-hidden group shadow-sm">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -z-10 group-hover:bg-indigo-500/20 transition-all duration-700"></div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Aktivitas Pencocokan Terkini</h2>
          
          {stats.recentMatches.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 mt-4 border border-dashed border-border rounded-xl bg-input/50">
              <p className="text-foreground/50 text-sm font-medium">Belum ada data pencocokan aktif. Silakan unggah dokumen atau BKU.</p>
            </div>
          ) : (
            <div className="space-y-3 mt-4">
              {stats.recentMatches.map(match => (
                <div key={match.id} className="p-4 rounded-xl bg-input/30 border border-border/50 flex items-center justify-between hover:bg-input/50 transition-colors">
                  <div>
                     <p className="text-sm font-semibold text-foreground">{match.bkuTransaction.description}</p>
                     <p className="text-xs text-foreground/50 mt-1 font-medium italic">Dicocokkan dengan {match.document.type} - Dok #{match.document.docNumber || 'Tanpa Nomor'}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">{(match.confidence * 100).toFixed(0)}% Conf</p>
                     <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest">Otomatis</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Panel */}
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-blue-500/5 dark:from-indigo-500/20 dark:to-blue-500/10 border border-indigo-500/20 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">Matching Engine</h3>
            <p className="text-sm text-foreground/70 mt-2 mb-6 font-medium leading-relaxed">Jalankan AI untuk membaca semua dokumen tak terikat dan mencocokkannya dengan BKU.</p>
            <MatchRunner />
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border shadow-sm">
            <h3 className="text-sm font-semibold text-foreground mb-3">Tindakan Cepat</h3>
            <div className="space-y-2">
              <Link href="/documents" className="flex items-center gap-3 p-3 rounded-xl bg-input/50 hover:bg-input transition-all text-sm text-foreground/70 font-medium border border-transparent hover:border-border">
                <FileText className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                Unggah Dokumen Baru
              </Link>
              <Link href="/bku" className="flex items-center gap-3 p-3 rounded-xl bg-input/50 hover:bg-input transition-all text-sm text-foreground/70 font-medium border border-transparent hover:border-border">
                <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                Tinjau BKU Tanpa Bukti ({stats.bkuWithoutDocs})
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, trend }: { title: string, value: string, icon: React.ReactNode, trend: string }) {
  return (
    <div className="p-6 rounded-2xl bg-card border border-border backdrop-blur-sm hover:bg-input/50 transition-all relative overflow-hidden group shadow-sm">
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-card rounded-full blur-2xl group-hover:bg-input transition-all duration-500 -z-10"></div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-foreground/70 uppercase tracking-widest">{title}</h3>
        <div className="p-2 rounded-lg bg-input border border-border shadow-inner">
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <h2 className="text-3xl font-black text-foreground tracking-tight">{value}</h2>
      </div>
      <p className="text-[10px] text-foreground/70 mt-2 font-bold uppercase tracking-widest">{trend}</p>
    </div>
  )
}
