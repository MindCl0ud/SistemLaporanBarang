'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Calendar, Loader2 } from 'lucide-react'
import { useTransition, useEffect } from 'react'

const months = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
]

const years = [2024, 2025, 2026, 2027]

export default function BkuFilter({ currentMonth, currentYear }: { currentMonth: number, currentYear: number }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Sync URL state with local storage to persist session
  useEffect(() => {
    const month = searchParams.get('month')
    const year = searchParams.get('year')
    const hasParams = !!(month && year)

    if (hasParams) {
      // If URL has params, sync them to local storage
      localStorage.setItem('bku_month', month)
      localStorage.setItem('bku_year', year)
    } else {
      // If URL has no params but we have a saved session, apply it
      const savedMonth = localStorage.getItem('bku_month')
      const savedYear = localStorage.getItem('bku_year')
      
      if (savedMonth && savedYear) {
        // Sync Sidebar
        window.dispatchEvent(new CustomEvent('bku-params-updated'));
        
        const params = new URLSearchParams(searchParams.toString())
        params.set('month', savedMonth)
        params.set('year', savedYear)
        // Use replace but avoid it if we're already on the way
        router.replace(`/bku?${params.toString()}`)
      }
    }
  }, [searchParams, router])

  const updateFilter = (month: number, year: number) => {
    // Save to local storage immediately for snappy persistence
    localStorage.setItem('bku_month', month.toString())
    localStorage.setItem('bku_year', year.toString())
    
    // Notify sidebar and other components to update their links
    window.dispatchEvent(new CustomEvent('bku-params-updated'));
    
    const params = new URLSearchParams(searchParams.toString())
    params.set('month', month.toString())
    params.set('year', year.toString())
    startTransition(() => {
      router.push(`/bku?${params.toString()}`)
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-4 bg-card border border-border p-4 rounded-3xl backdrop-blur-md shadow-sm relative">
      <div className="flex items-center gap-2 text-primary">
        <Calendar className="w-5 h-5 text-primary" />
        <span className="text-[10px] font-black uppercase tracking-widest text-muted">Periode</span>
      </div>
      
      <div className="flex items-center gap-2">
        <select 
          value={currentMonth} 
          onChange={(e) => updateFilter(parseInt(e.target.value), currentYear)}
          disabled={isPending}
          className="bg-input border border-border rounded-xl px-3 py-2 text-sm text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer disabled:opacity-50"
        >
          {months.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>

        <select 
          value={currentYear} 
          onChange={(e) => updateFilter(currentMonth, parseInt(e.target.value))}
          disabled={isPending}
          className="bg-input border border-border rounded-xl px-3 py-2 text-sm text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer disabled:opacity-50"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        {isPending && (
          <Loader2 className="w-5 h-5 animate-spin text-blue-500 ml-2" />
        )}
      </div>
    </div>
  )
}
