import { getBkuRecords, getBkuComparison } from "@/app/actions/bkuActions"
import BkuForm from "./BkuForm"
import BkuList from "./BkuList"
import BkuFilter from "./BkuFilter"
import { Suspense } from "react"
import { BookOpen, Plus, TrendingUp, TrendingDown, Loader2 } from "lucide-react"

export const dynamic = 'force-dynamic'

export default async function BkuPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string, year?: string }>
}) {
  const awaitedParams = await searchParams
  const currentDate = new Date()
  const currentMonth = awaitedParams.month ? parseInt(awaitedParams.month) : currentDate.getMonth() + 1
  const currentYear = awaitedParams.year ? parseInt(awaitedParams.year) : currentDate.getFullYear()

  const records = await getBkuRecords(currentMonth, currentYear)
  const stats = await getBkuComparison(currentMonth, currentYear)
  
  const getPercentage = (curr: number, prev: number) => {
    if (prev === 0) return 0
    return Math.round(Math.abs((curr - prev) / prev) * 100)
  }

  const expPct = getPercentage(stats.currentExpense, stats.prevExpense)
  const recPct = getPercentage(stats.currentReceipt, stats.prevReceipt)
  const balPct = getPercentage(stats.currentBalance, stats.prevBalance)

  const isExpUp = stats.currentExpense >= stats.prevExpense
  const isRecUp = stats.currentReceipt >= stats.prevReceipt
  const isBalUp = stats.currentBalance >= stats.prevBalance

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)
  }

  return (
    <div className="w-full max-w-[1800px] mx-auto px-4 space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-wrap justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-300 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Buku Kas Umum (BKU)
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium">Kelola data pembukuan bulanan sebagai acuan AI mencocokkan dokumen pengeluaran.</p>
        </div>
        
        <BkuFilter currentMonth={currentMonth} currentYear={currentYear} />
      </header>

      {/* Top Row: Insert Form & Stats Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tambah Data BKU Card */}
        <div className="p-6 rounded-3xl bg-card border border-border backdrop-blur-md shadow-sm">
          <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Tambah Data BKU
          </h2>
          <BkuForm currentMonth={currentMonth} currentYear={currentYear} />
        </div>

        {/* Ringkasan Stats Card */}
        <div className="p-6 rounded-3xl bg-card border border-border backdrop-blur-md shadow-sm">
           <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Ringkasan Keuangan
           </h2>
           
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Bulan berjalan */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>
                  <h3 className="text-[10px] font-black text-blue-600 dark:text-blue-300 uppercase tracking-widest">Bulan berjalan</h3>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex justify-between items-center p-3.5 rounded-xl bg-input/40 border border-border shadow-sm">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Total Penerimaan</span>
                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.currentReceipt + stats.openingBalance)}</p>
                  </div>
                  <div className="flex justify-between items-center p-3.5 rounded-xl bg-input/40 border border-border shadow-sm">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Total Pengeluaran</span>
                    <p className="text-lg font-black text-rose-600 dark:text-rose-400">{formatCurrency(stats.currentExpense)}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-indigo-600 dark:bg-indigo-500 border border-indigo-700 dark:border-indigo-600 shadow-lg shadow-indigo-500/20">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-indigo-100 dark:text-indigo-200 font-black uppercase tracking-widest">Total Saldo</span>
                    </div>
                    <p className="text-2xl font-black text-white">{formatCurrency(stats.closingBalance)}</p>
                  </div>
                </div>
              </div>

              {/* Right Column: Bulan sebelumnya */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-4 bg-slate-400 rounded-full"></div>
                  <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Bulan sebelumnya</h3>
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
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-1">Total Saldo</span>
                    <p className="text-xl font-bold text-foreground opacity-80">{formatCurrency(stats.openingBalance)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-border flex items-center justify-between">
              <span className="text-xs text-slate-500 italic">Data di sebelah kiri mewakili periode {currentMonth}/{currentYear}</span>
              <div className="text-[10px] text-slate-500 uppercase font-black bg-input px-2 py-1 rounded tracking-widest border border-border">Analisis Komparatif</div>
            </div>
        </div>
      </div>

      {/* Bottom Section: Data List Table (Full Width) */}
      <div className="w-full">
        <div className="p-6 rounded-3xl bg-card border border-border min-h-[500px] shadow-sm">
           <div className="flex justify-between items-center mb-8">
             <div className="flex items-center gap-3">
               <div className="w-1.5 h-6 bg-blue-600 dark:bg-blue-500 rounded-full"></div>
               <h2 className="text-xl font-bold text-foreground tracking-tight">Data Transaksi BKU</h2>
               <span className="bg-blue-500/10 text-blue-700 dark:text-blue-300 text-[10px] px-2 py-0.5 rounded-full border border-blue-500/20 uppercase font-bold">Periode: {currentMonth}/{currentYear}</span>
             </div>
           </div>
           
           <Suspense fallback={<div className="flex flex-col items-center justify-center p-12 text-slate-500 dark:text-slate-400"><Loader2 className="w-8 h-8 animate-spin mb-4" /> Memuat data...</div>}>
              <BkuList initialRecords={records} openingBalance={stats.openingBalance} />
           </Suspense>
        </div>
      </div>
    </div>
  )
}
