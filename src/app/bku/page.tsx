import { getBkuRecords, getBkuComparison } from "@/app/actions/bkuActions"
export const dynamic = 'force-dynamic'
import { BookOpen, Plus, TrendingUp, TrendingDown } from "lucide-react"
import BkuForm from "./BkuForm"
import BkuList from "./BkuList"

export default async function BkuPage({
  searchParams,
}: {
  searchParams: { month?: string, year?: string }
}) {
  const currentDate = new Date()
  const currentMonth = searchParams.month ? parseInt(searchParams.month) : currentDate.getMonth() + 1
  const currentYear = searchParams.year ? parseInt(searchParams.year) : currentDate.getFullYear()

  const records = await getBkuRecords(currentMonth, currentYear)
  const stats = await getBkuComparison(currentMonth, currentYear)
  
  const percentage = stats.prevExpense === 0 ? 0 : Math.round(Math.abs((stats.currentExpense - stats.prevExpense) / stats.prevExpense) * 100)
  const isIncrease = stats.currentExpense >= stats.prevExpense

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-300 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-blue-400" />
            Buku Kas Umum (BKU)
          </h1>
          <p className="text-slate-400 mt-2">Kelola data pembukuan bulanan sebagai acuan AI mencocokkan dokumen pengeluaran.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Insert Form & Stats */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <h2 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-400" />
              Tambah Data BKU
            </h2>
            <BkuForm currentMonth={currentMonth} currentYear={currentYear} />
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-blue-500/5 border border-indigo-500/20">
             <h2 className="text-sm font-medium text-indigo-300 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Ringkasan Bulan Ini
             </h2>
             <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-400">Total Pengeluaran</p>
                  <p className="text-2xl font-bold text-rose-400 mt-1">{formatCurrency(stats.currentExpense)}</p>
                </div>
                
                <div className="p-3 bg-black/20 rounded-xl flex items-center justify-between border border-white/5 mt-2">
                  <span className="text-xs text-slate-400">Bulan Lalu:</span>
                  <span className="text-sm font-medium text-white">{formatCurrency(stats.prevExpense)}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md font-medium ${isIncrease ? (stats.currentExpense > 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300') : 'bg-emerald-500/20 text-emerald-300'}`}>
                    {isIncrease ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {percentage}%
                  </span>
                  <span className="text-xs text-slate-500">vs bulan lalu</span>
                </div>
             </div>
          </div>
        </div>

        {/* Right Col: Data Table */}
        <div className="lg:col-span-2">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md min-h-[500px]">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-lg font-medium text-white">Data BKU Bulan {currentMonth}/{currentYear}</h2>
             </div>
             <BkuList initialRecords={records} />
          </div>
        </div>
      </div>
    </div>
  )
}
