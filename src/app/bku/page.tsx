import { getBkuRecords, getBkuComparison } from "@/app/actions/bkuActions"
export const dynamic = 'force-dynamic'
import { BookOpen, Plus, TrendingUp, TrendingDown } from "lucide-react"
import BkuForm from "./BkuForm"
import BkuList from "./BkuList"
import BkuFilter from "./BkuFilter"

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
  
  const percentage = stats.prevExpense === 0 ? 0 : Math.round(Math.abs((stats.currentExpense - stats.prevExpense) / stats.prevExpense) * 100)
  const isIncrease = stats.currentExpense >= stats.prevExpense

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)
  }

  return (
    <div className="w-full max-w-[1800px] mx-auto px-4 space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-wrap justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-300 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-blue-400" />
            Buku Kas Umum (BKU)
          </h1>
          <p className="text-slate-400 mt-1">Kelola data pembukuan bulanan sebagai acuan AI mencocokkan dokumen pengeluaran.</p>
        </div>
        
        <BkuFilter currentMonth={currentMonth} currentYear={currentYear} />
      </header>

      {/* Top Row: Insert Form & Stats Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tambah Data BKU Card */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
          <h2 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-400" />
            Tambah Data BKU
          </h2>
          <BkuForm currentMonth={currentMonth} currentYear={currentYear} />
        </div>

        {/* Ringkasan Stats Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-900/40 border border-white/10 backdrop-blur-md flex flex-col justify-between">
           <div>
             <h2 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Ringkasan Bulan Ini
             </h2>
             
             <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Total Pengeluaran</p>
                  <p className="text-3xl font-bold text-rose-400 tracking-tight">{formatCurrency(stats.currentExpense)}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Bulan Lalu</p>
                  <p className="text-3xl font-bold text-white tracking-tight opacity-60">{formatCurrency(stats.prevExpense)}</p>
                </div>
             </div>
           </div>

           <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-sm ${isIncrease ? (stats.currentExpense > 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300') : 'bg-emerald-500/20 text-emerald-300'}`}>
                  {isIncrease ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {percentage}%
                </div>
                <span className="text-xs text-slate-400">Pebandingan dengan periode sebelumnya</span>
              </div>
              
              <div className="text-[10px] text-slate-500 uppercase font-medium bg-white/5 px-2 py-1 rounded">Update Real-time</div>
           </div>
        </div>
      </div>

      {/* Bottom Section: Data List Table (Full Width) */}
      <div className="w-full">
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md min-h-[500px]">
           <div className="flex justify-between items-center mb-8">
             <div className="flex items-center gap-3">
               <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
               <h2 className="text-xl font-semibold text-white tracking-tight">Data Transaksi BKU</h2>
               <span className="bg-blue-500/10 text-blue-300 text-[10px] px-2 py-0.5 rounded-full border border-blue-500/20 uppercase font-bold">Periode: {currentMonth}/{currentYear}</span>
             </div>
           </div>
           <BkuList initialRecords={records} />
        </div>
      </div>
    </div>
  )
}
