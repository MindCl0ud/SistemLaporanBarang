import BkuFilter from "./BkuFilter"
import BkuDashboardContent from "./BkuDashboardContent"
import { Suspense } from "react"
import { BookOpen, Loader2 } from "lucide-react"

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

      <Suspense 
        key={`${currentMonth}-${currentYear}`} 
        fallback={
          <div className="flex flex-col items-center justify-center p-32 text-slate-500 dark:text-slate-400 animate-pulse">
            <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-500" /> 
            <p className="font-bold tracking-tight">Menyiapkan Rekapitulasi Pembukuan...</p>
          </div>
        }
      >
        <BkuDashboardContent month={currentMonth} year={currentYear} />
      </Suspense>
    </div>
  )
}
