import { FileText, CheckCircle2, AlertTriangle, Activity, RefreshCw, Sparkles, Settings, MessageSquare, ArrowRight, TrendingUp } from "lucide-react"
import { getDashboardStats } from "@/app/actions/matchActions"
import MatchRunner from "@/components/MatchRunner"
import Link from "next/link"
import React from 'react'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const stats = await getDashboardStats()

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in pb-20">
      {/* AI PULSE / WELCOME HEADER */}
      <div className="relative overflow-hidden p-10 rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-indigo-900 text-primary-foreground shadow-2xl shadow-primary/20 group">
        {/* Animated Background Elements */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-[100px] -z-0 group-hover:bg-white/20 transition-all duration-1000"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-[80px] -z-0"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 border border-white/20 rounded-full backdrop-blur-md">
               <Sparkles className="w-3.5 h-3.5 text-amber-300" />
               <span className="text-[10px] font-black uppercase tracking-widest opacity-90">AI Data Pulse</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
              {stats.aiPulse.split('!')[0]}!
            </h1>
            <p className="text-primary-foreground/80 text-base font-medium leading-relaxed">
              {stats.aiPulse.split('!')[1]?.trim() || "Selamat datang kembali di pusat kendali aset Anda."}
            </p>
          </div>
          <div className="flex flex-col items-center justify-center p-8 bg-white/10 border border-white/20 rounded-3xl backdrop-blur-md min-w-[220px] shadow-inner">
             <span className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-2">Akurasi Pencocokan</span>
             <h2 className="text-5xl font-black tracking-tighter">{stats.accuracy}%</h2>
             <div className="w-full h-2 bg-black/20 rounded-full mt-4 overflow-hidden border border-white/5">
                <div className="h-full bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.6)] transition-all duration-1000" style={{ width: `${stats.accuracy}%` }}></div>
             </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Dokumen"
          value={stats.totalDocs.toString()}
          icon={<FileText className="w-5 h-5" />}
          trend="TERINPUT"
          variant="primary"
        />
        <StatCard
          title="Tercocokkan"
          value={stats.matchedDocs.toString()}
          icon={<CheckCircle2 className="w-5 h-5" />}
          trend="VALIDE"
          variant="success"
        />
        <StatCard
          title="Butuh Bukti"
          value={stats.bkuWithoutDocs.toString()}
          icon={<AlertTriangle className="w-5 h-5" />}
          trend="PENDING"
          variant="warning"
          isAlert={stats.bkuWithoutDocs > 0}
        />
        <StatCard
          title="Status Akurasi"
          value={`${Math.round(stats.accuracy)}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          trend="AI CONFIDENCE"
          variant="info"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* RECENT ACTIVITY */}
        <div className="lg:col-span-2 space-y-4">
           <div className="bg-card border border-border p-8 rounded-3xl shadow-sm relative overflow-hidden h-full">
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-primary">
                       <Activity className="w-5 h-5" />
                    </div>
                    <div>
                       <h2 className="text-xl font-black text-foreground tracking-tight">Aktivitas Pencocokan</h2>
                       <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Update Terakhir Otomatis</p>
                    </div>
                 </div>
                 <Link href="/bku" className="text-xs font-black text-primary hover:underline flex items-center gap-1 group">
                    Buka BKU <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                 </Link>
              </div>

              {stats.recentMatches.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 mt-4 border border-dashed border-border rounded-2xl bg-accent/30 opacity-60">
                   <p className="text-muted-foreground text-sm font-bold">Belum ada data pencocokan aktif.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stats.recentMatches.map(match => (
                    <div key={match.id} className="p-5 rounded-2xl bg-accent/30 border border-border/50 flex items-center justify-between hover:bg-accent/50 transition-all group/item shadow-sm">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-xl bg-card flex flex-col items-center justify-center border border-border shadow-sm group-hover/item:scale-110 transition-transform">
                            <span className="text-[9px] font-black text-muted-foreground uppercase leading-none">Conf</span>
                            <span className="text-[14px] font-black text-primary">{(match.confidence * 100).toFixed(0)}%</span>
                         </div>
                         <div>
                            <p className="text-sm font-black text-foreground leading-tight">{match.bkuTransaction.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                               <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-black uppercase tracking-tighter">
                                  {match.document.type}
                               </span>
                               <span className="text-[10px] text-muted-foreground font-medium">#{match.document.docNumber || 'Tanpa No'}</span>
                            </div>
                         </div>
                      </div>
                      <div className="hidden sm:block text-right">
                         <p className="text-sm font-black text-foreground/80 tabular-nums">
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(match.document.totalAmount || 0)}
                         </p>
                         <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter mt-0.5">{match.bkuTransaction.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
           </div>
        </div>

        {/* Action Panel */}
        <div className="space-y-6">
          <div className="p-8 rounded-3xl bg-primary text-primary-foreground shadow-xl shadow-primary/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-20">
               <RefreshCw className="w-20 h-20 animate-[spin_10s_linear_infinite]" />
            </div>
            <div className="relative z-10">
              <h3 className="text-xl font-black tracking-tight mb-2">Matching Engine</h3>
              <p className="text-primary-foreground/80 text-xs font-medium mb-8 leading-relaxed">Jalankan verifikasi otomatis antara dokumen fisik dan transaksi kas.</p>
              <MatchRunner />
            </div>
          </div>

          <div className="p-8 bg-card border border-border rounded-3xl shadow-sm">
            <h3 className="text-sm font-black text-foreground uppercase tracking-widest mb-6">Tindakan Cepat</h3>
            <div className="space-y-3">
              <QuickLink 
                title="Input Dokumen" 
                href="/documents" 
                icon={<FileText className="w-5 h-5 text-blue-500" />} 
                desc="Proses Nota/BA Baru"
              />
              <QuickLink 
                title="Tanya Asisten AI" 
                href="/chat" 
                icon={<MessageSquare className="w-5 h-5" />} 
                desc="Cek Data via Chat"
              />
              <QuickLink 
                title="Pengaturan" 
                href="/settings" 
                icon={<Settings className="w-5 h-5 text-slate-500" />} 
                desc="Identitas & Sistem"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, trend, variant, isAlert }: { title: string, value: string, icon: React.ReactNode, trend: string, variant: 'primary' | 'success' | 'warning' | 'info', isAlert?: boolean }) {
  const variants = {
    primary: "bg-primary/5 border-primary/20 text-primary",
    success: "bg-emerald-500/5 border-emerald-500/20 text-emerald-600",
    warning: "bg-amber-500/5 border-amber-500/20 text-amber-600",
    info: "bg-indigo-500/5 border-indigo-500/20 text-indigo-600",
  }

  return (
    <div className={`p-6 rounded-3xl bg-card border border-border group hover:border-primary/30 transition-all duration-300 shadow-sm relative overflow-hidden ${isAlert ? 'ring-2 ring-destructive/10' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{title}</h3>
        <div className={`p-2.5 rounded-xl ${variants[variant]} border shadow-inner group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-2 relative z-10">
        <h2 className="text-3xl font-black text-foreground tracking-tighter tabular-nums drop-shadow-sm">{value}</h2>
        {isAlert && <div className="w-2 h-2 rounded-full bg-destructive animate-ping"></div>}
      </div>
      <div className="flex items-center gap-1.5 mt-3">
         <span className={`text-[10px] font-black uppercase tracking-widest ${isAlert ? 'text-destructive' : 'text-muted-foreground'}`}>{trend}</span>
      </div>
    </div>
  )
}

function QuickLink({ title, href, icon, desc }: { title: string, href: string, icon: React.ReactNode, desc: string }) {
  return (
    <Link href={href} className="flex items-center gap-4 p-4 rounded-2xl bg-accent/30 hover:bg-accent transition-all border border-transparent hover:border-border group/link">
      <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center group-hover/link:bg-primary group-hover/link:text-primary-foreground transition-all shadow-sm">
         <div className="group-hover/link:scale-110 transition-transform">
            {icon}
         </div>
      </div>
      <div>
         <p className="text-xs font-black text-foreground uppercase tracking-tight">{title}</p>
         <p className="text-[10px] text-muted-foreground font-bold mt-0.5">{desc}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto opacity-0 group-hover/link:opacity-100 group-hover/link:translate-x-1 transition-all" />
    </Link>
  )
}
