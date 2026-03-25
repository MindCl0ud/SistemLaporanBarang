import { getBkuRecords } from "@/app/actions/bkuActions"
export const dynamic = 'force-dynamic'
import { BookOpen, Plus, FileSpreadsheet } from "lucide-react"
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
        {/* Left Col: Insert Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <h2 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-400" />
              Tambah Data Manual
            </h2>
            <BkuForm currentMonth={currentMonth} currentYear={currentYear} />
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-blue-500/5 border border-indigo-500/20">
             <h2 className="text-sm font-medium text-indigo-300 mb-2 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Import Excel/CSV
             </h2>
             <p className="text-xs text-slate-400 mb-4">Fitur import massal data BKU dari sistem lama (Segera Hadir).</p>
             <button disabled className="w-full py-2.5 bg-white/5 border border-white/10 text-slate-500 rounded-xl text-sm font-medium cursor-not-allowed">
               Import Data (WIP)
             </button>
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
