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
    <div className="flex flex-wrap items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md">
      <div className="flex items-center gap-2 text-blue-400">
        <Calendar className="w-5 h-5" />
        <span className="text-sm font-semibold uppercase tracking-wider text-slate-400">Periode</span>
      </div>
      
      <div className="flex items-center gap-2">
        <select 
          value={currentMonth} 
          onChange={(e) => updateFilter(parseInt(e.target.value), currentYear)}
          className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
        >
          {months.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>

        <select 
          value={currentYear} 
          onChange={(e) => updateFilter(currentMonth, parseInt(e.target.value))}
          className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
