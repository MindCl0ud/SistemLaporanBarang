import BkuFilter from "./BkuFilter"
import BkuDashboardContent from "./BkuDashboardContent"
import { BookOpen } from "lucide-react"
import { getBkuRecords, getBkuComparison, getYearlyBkuRecords, getAccountMappings } from "@/app/actions/bkuActions"

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

  // Fetch data on server
  const records = await getBkuRecords(currentMonth, currentYear)
  const stats = await getBkuComparison(currentMonth, currentYear)
  const yearlyRecords = await getYearlyBkuRecords(currentYear)
  const accountMappings = await getAccountMappings()

  return (
    <div className="w-full max-w-[1800px] mx-auto px-4 space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-wrap justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-foreground flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-primary" />
            Buku Kas Umum (BKU)
          </h1>
          <p className="text-muted mt-1 text-sm font-semibold">Kelola data pembukuan bulanan sebagai acuan AI mencocokkan dokumen pengeluaran.</p>
        </div>
        
        <BkuFilter currentMonth={currentMonth} currentYear={currentYear} />
      </header>

      <BkuDashboardContent 
        month={currentMonth} 
        year={currentYear} 
        records={records}
        stats={stats}
        yearlyRecords={yearlyRecords}
        accountMappings={accountMappings}
      />
    </div>
  )
}
