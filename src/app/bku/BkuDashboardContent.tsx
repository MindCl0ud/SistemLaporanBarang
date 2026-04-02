'use client'

import { useState, useEffect, useMemo } from 'react'
import BkuForm from "./BkuForm"
import BkuList from "./BkuList"
import BkuAccountSummary from "./BkuAccountSummary"
import { Plus, TrendingUp, CalendarDays, List, PieChart, ShieldCheck, Loader2 } from "lucide-react"
import { getBudgetMode } from '@/app/actions/settingsActions'
import { getBkuRecords, getBkuComparison, getYearlyBkuRecords, getAccountMappings } from "@/app/actions/bkuActions"

export default function BkuDashboardContent({ 
  month, 
  year, 
  records: initialRecords, 
  stats: initialStats, 
  yearlyRecords: initialYearlyRecords,
  accountMappings: initialAccountMappings 
}: { 
  month: number, 
  year: number,
  records?: any[],
  stats?: any,
  yearlyRecords?: any[],
  accountMappings?: any[]
}) {
  const [activeTab, setActiveTab] = useState<'transactions' | 'summary'>('transactions')
  const [useRevisedBudgetMode, setUseRevisedBudgetMode] = useState(false)
  
  // Data States
  const [records, setRecords] = useState<any[]>(initialRecords || [])
  const [stats, setStats] = useState<any>(initialStats || null)
  const [yearlyRecords, setYearlyRecords] = useState<any[]>(initialYearlyRecords || [])
  const [accountMappings, setAccountMappings] = useState<any[]>(initialAccountMappings || [])
  const [isSyncing, setIsSyncing] = useState(false)

  // Load from Cache on mount or period change
  useEffect(() => {
    const cacheKey = `bku_cache_${month}_${year}`
    const saved = localStorage.getItem(cacheKey)
    if (saved && !initialRecords) {
      try {
        const parsed = JSON.parse(saved)
        setRecords(parsed.records || [])
        setStats(parsed.stats || null)
        setYearlyRecords(parsed.yearlyRecords || [])
        setAccountMappings(parsed.accountMappings || [])
      } catch (e) {
        console.error("Failed to parse BKU cache", e)
      }
    }

    const fetchData = async () => {
      setIsSyncing(true)
      try {
        const [r, s, y, a, mode] = await Promise.all([
          getBkuRecords(month, year),
          getBkuComparison(month, year),
          getYearlyBkuRecords(year),
          getAccountMappings(),
          getBudgetMode()
        ])
        
        setRecords(r)
        setStats(s)
        setYearlyRecords(y)
        setAccountMappings(a)
        setUseRevisedBudgetMode(mode)

        // Save to cache
        localStorage.setItem(cacheKey, JSON.stringify({
          records: r,
          stats: s,
          yearlyRecords: y,
          accountMappings: a
        }))
      } catch (e) {
        console.error("Failed to sync BKU data", e)
      } finally {
        setIsSyncing(false)
      }
    }

    fetchData()

    // Listen for manual refresh requests
    window.addEventListener('bku-data-changed', fetchData)
    
    // Listen for changes in other tabs or within the same page
    window.addEventListener("storage", (e) => {
      if (e.key === cacheKey) fetchData()
    });

    return () => {
      window.removeEventListener('bku-data-changed', fetchData)
    }
  }, [month, year, initialRecords])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
  }

  if (!stats) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
         <div className="flex flex-col items-center gap-4">
           <div className="relative flex items-center justify-center">
             <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
             <div className="w-16 h-16 bg-card border border-border rounded-2xl flex items-center justify-center shadow-xl relative z-10 animate-in zoom-in-95 duration-500">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
             </div>
           </div>
           <div className="text-center">
              <h3 className="text-sm font-black text-foreground/80 tracking-tight">
                Sinkronisasi Data...
              </h3>
              <p className="text-[9px] text-muted font-black tracking-[0.2em] uppercase mt-1">
                Sistem Laporan Terpadu
              </p>
           </div>
         </div>
      </div>
    )
  }

  const yearlyPagu = accountMappings.reduce((sum, acc) => {
    const revised = acc.revisedBudget || 0
    const original = acc.budget || 0
    // Gunakan Pagu Perubahan jika mode aktif DAN nilai > 0
    const effectiveBudget = (useRevisedBudgetMode && revised > 0) ? revised : original
    return sum + effectiveBudget
  }, 0)

  const remainingPagu = yearlyPagu - stats.yearlyExpense
  const usagePercentage = yearlyPagu > 0 ? (stats.yearlyExpense / yearlyPagu) * 100 : 0

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      {isSyncing && (
        <div className="absolute -top-4 right-0 flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full animate-pulse">
           <Loader2 className="w-3 h-3 text-primary animate-spin" />
           <span className="text-[8px] font-black text-primary uppercase tracking-widest">Sinkronisasi...</span>
        </div>
      )}

      {/* Top Row: Form + Account Summary on Left, Stats on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEFT COLUMN: Input Form */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-card border border-border backdrop-blur-md shadow-sm h-full flex flex-col">
            <h2 className="text-lg font-black text-foreground mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Tambah Data BKU
            </h2>
            <div className="flex-1 min-h-0">
              <BkuForm currentMonth={month} currentYear={year} />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Ringkasan Keuangan */}
        <div className="flex flex-col gap-6">
          <div className="p-6 rounded-3xl bg-card border border-border backdrop-blur-md shadow-sm">
             <h2 className="text-lg font-black text-foreground mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Ringkasan Keuangan
             </h2>
             
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Bulan berjalan */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-4 bg-primary rounded-full"></div>
                    <h3 className="text-[10px] font-black text-primary uppercase tracking-widest">Bulan {month}/{year}</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex justify-between items-center p-3.5 rounded-xl bg-input/40 border border-border shadow-sm">
                      <span className="text-xs text-muted font-black uppercase tracking-wider">Total Penerimaan</span>
                      <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.currentReceipt + stats.openingBalance)}</p>
                    </div>
                    <div className="flex justify-between items-center p-3.5 rounded-xl bg-input/40 border border-border shadow-sm">
                      <span className="text-xs text-muted font-black uppercase tracking-wider">Total Pengeluaran</span>
                      <p className="text-lg font-black text-rose-600 dark:text-rose-400">{formatCurrency(stats.currentExpense)}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-primary border border-primary/20 shadow-lg shadow-primary/20">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-white/80 font-black uppercase tracking-widest">Total Saldo</span>
                      </div>
                      <p className="text-2xl font-black text-white">{formatCurrency(stats.closingBalance)}</p>
                    </div>
                  </div>
                </div>

                {/* Right Column: Bulan sebelumnya */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-4 bg-muted/40 rounded-full"></div>
                    <h3 className="text-[10px] font-black text-muted uppercase tracking-widest">Bulan sebelumnya</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-3 opacity-70">
                    <div className="flex justify-between items-center p-3.5 rounded-xl bg-input/20 border border-border border-dashed">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Total Penerimaan</span>
                      <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">{formatCurrency(stats.prevReceipt + (stats.prevOpeningBalance || 0))}</p>
                    </div>
                    <div className="flex justify-between items-center p-3.5 rounded-xl bg-input/20 border border-border border-dashed">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Total Pengeluaran</span>
                      <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">{formatCurrency(stats.prevExpense)}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-input/40 border border-border">
                      <span className="text-xs text-muted font-bold uppercase tracking-wider block mb-1">Total Saldo</span>
                      <p className="text-xl font-black text-foreground">{formatCurrency(stats.openingBalance)}</p>
                    </div>
                  </div>
                </div>
              </div>

               {/* YEARLY TOTAL & PAGU */}
              <div className="mt-8 pt-6 border-t border-border space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-indigo-100 dark:border-indigo-900/50">
                            <PieChart className="w-6 h-6 text-indigo-500" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-[10px] font-black text-indigo-800 dark:text-indigo-400 uppercase tracking-[0.2em]">Total Pagu Tahun {year}</p>
                              {useRevisedBudgetMode && (
                                <span className="px-1 py-0.5 rounded-full bg-indigo-500 text-white text-[7px] font-black uppercase tracking-widest flex items-center gap-0.5">
                                  <ShieldCheck className="w-2 h-2" /> REVISED
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted font-bold mt-0.5">
                              {useRevisedBudgetMode ? 'Memprioritaskan Pagu Perubahan' : 'Menggunakan Pagu Awal'}
                            </p>
                          </div>
                        </div>
                        <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">{formatCurrency(yearlyPagu)}</p>
                    </div>

                    <div className={`p-5 rounded-2xl border flex items-center justify-between shadow-sm transition-colors ${usagePercentage > 90 ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50' : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/50'}`}>
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-inherit">
                            <TrendingUp className={`w-6 h-6 ${usagePercentage > 90 ? 'text-rose-500' : 'text-emerald-500'}`} />
                          </div>
                          <div>
                            <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${usagePercentage > 90 ? 'text-rose-800 dark:text-rose-400' : 'text-emerald-800 dark:text-emerald-400'}`}>Sisa Pagu (Anggaran)</p>
                            <p className="text-[10px] text-muted font-bold mt-0.5">Selisih Pagu - Pengeluaran</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-xl font-black tracking-tight ${usagePercentage > 90 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{formatCurrency(remainingPagu)}</p>
                          <p className={`text-[9px] font-black opacity-50 uppercase tracking-tighter ${usagePercentage > 90 ? 'text-rose-800' : 'text-emerald-800'}`}>{usagePercentage.toFixed(1)}% Terpakai</p>
                        </div>
                    </div>
                 </div>

                 <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between overflow-hidden relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-4 relative z-10">
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <CalendarDays className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-foreground/70 uppercase tracking-[0.2em]">Total Pengeluaran Tahun {year}</p>
                        <p className="text-[10px] text-muted font-bold mt-0.5">Akumulasi dari seluruh transaksi tercatat</p>
                      </div>
                    </div>
                    <p className="text-2xl font-black text-foreground tracking-tight relative z-10">{formatCurrency(stats.yearlyExpense)}</p>
                 </div>
              </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-input/40 p-1 rounded-2xl w-fit border border-border">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all ${activeTab === 'transactions' ? 'bg-primary text-white shadow-lg' : 'text-muted hover:bg-accent'}`}
        >
          <List className="w-4 h-4" />
          Daftar Transaksi
        </button>
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all ${activeTab === 'summary' ? 'bg-primary text-white shadow-lg' : 'text-muted hover:bg-accent'}`}
        >
          <PieChart className="w-4 h-4" />
          Ringkasan Rekening
        </button>
      </div>

      {activeTab === 'transactions' ? (
        <div className="w-full animate-in fade-in zoom-in-95 duration-300">
          <div className="p-6 rounded-3xl bg-card border border-border min-h-[500px] shadow-sm">
             <div className="flex justify-between items-center mb-8">
               <div className="flex items-center gap-3">
                 <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                 <h2 className="text-xl font-black text-foreground tracking-tight">Data Transaksi BKU</h2>
                 <span className="bg-primary/10 text-primary text-[10px] px-2 py-1 rounded-full border border-primary/20 uppercase font-black">Periode: {month}/{year}</span>
               </div>
             </div>
             
             <BkuList initialRecords={records} openingBalance={stats.openingBalance} />
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-3xl bg-card border border-border backdrop-blur-md shadow-sm w-full animate-in fade-in zoom-in-95 duration-300">
          <BkuAccountSummary monthlyRecords={records} yearlyRecords={yearlyRecords} accountMappings={accountMappings} />
        </div>
      )}
    </div>
  )
}
