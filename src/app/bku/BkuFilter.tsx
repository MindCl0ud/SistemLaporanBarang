'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Calendar } from 'lucide-react'

const months = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
]

const years = [2024, 2025, 2026, 2027]

export default function BkuFilter({ currentMonth, currentYear }: { currentMonth: number, currentYear: number }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateFilter = (month: number, year: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('month', month.toString())
    params.set('year', year.toString())
    router.push(`/bku?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-4 bg-card border border-border p-4 rounded-3xl backdrop-blur-md shadow-sm">
      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
        <Calendar className="w-5 h-5" />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Periode</span>
      </div>
      
      <div className="flex items-center gap-2">
        <select 
          value={currentMonth} 
          onChange={(e) => updateFilter(parseInt(e.target.value), currentYear)}
          className="bg-input border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
        >
          {months.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>

        <select 
          value={currentYear} 
          onChange={(e) => updateFilter(currentMonth, parseInt(e.target.value))}
          className="bg-input border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
