import { getBkuRecords, getBkuComparison, getYearlyBkuRecords } from "@/app/actions/bkuActions"
import BkuForm from "./BkuForm"
import BkuList from "./BkuList"
import BkuAccountSummary from "./BkuAccountSummary"
import { Plus, TrendingUp, CalendarDays } from "lucide-react"

export default async function BkuDashboardContent({ month, year }: { month: number, year: number }) {
  const records = await getBkuRecords(month, year)
  const stats = await getBkuComparison(month, year)
  const yearlyRecords = await getYearlyBkuRecords(year)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Row: Form + Account Summary on Left, Stats on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEFT COLUMN: Input Form */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-card border border-border backdrop-blur-md shadow-sm h-full">
            <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Tambah Data BKU
            </h2>
            <BkuForm currentMonth={month} currentYear={year} />
          </div>
        </div>

        {/* RIGHT COLUMN: Ringkasan Keuangan */}
        <div className="flex flex-col gap-6">
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
                    <h3 className="text-[10px] font-black text-blue-600 dark:text-blue-300 uppercase tracking-widest">Bulan {month}/{year}</h3>
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

               {/* YEARLY TOTAL */}
              <div className="mt-8 pt-6 border-t border-border">
                 <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-950/30 dark:to-slate-900 border border-rose-200 dark:border-rose-900/50 shadow-inner flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-rose-100 dark:border-rose-900/50">
                        <CalendarDays className="w-6 h-6 text-rose-500" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest">Total Pengeluaran Tahun {year}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Akumulasi dari seluruh bulan dicatat</p>
                      </div>
                    </div>
                    <p className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">{formatCurrency(stats.yearlyExpense)}</p>
                 </div>
              </div>
          </div>
        </div>
      </div>

      {/* Row 2: Account Summary (Full Width) */}
      <div className="p-6 rounded-3xl bg-card border border-border backdrop-blur-md shadow-sm w-full">
        <BkuAccountSummary monthlyRecords={records} yearlyRecords={yearlyRecords} />
      </div>

      {/* Bottom Section: Data List Table (Full Width) */}
      <div className="w-full">
        <div className="p-6 rounded-3xl bg-card border border-border min-h-[500px] shadow-sm">
           <div className="flex justify-between items-center mb-8">
             <div className="flex items-center gap-3">
               <div className="w-1.5 h-6 bg-blue-600 dark:bg-blue-500 rounded-full"></div>
               <h2 className="text-xl font-bold text-foreground tracking-tight">Data Transaksi BKU</h2>
               <span className="bg-blue-500/10 text-blue-700 dark:text-blue-300 text-[10px] px-2 py-0.5 rounded-full border border-blue-500/20 uppercase font-bold">Periode: {month}/{year}</span>
             </div>
           </div>
           
           <BkuList initialRecords={records} openingBalance={stats.openingBalance} />
        </div>
      </div>
    </div>
  )
}
