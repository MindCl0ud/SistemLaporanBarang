'use client'

import { useState, useMemo } from 'react'
import { PieChart } from 'lucide-react'

export default function BkuAccountSummary({ records }: { records: any[] }) {
  // Aggregation level: 'full' (all segments) or 'prefix' (first 6 segments)
  const [aggrLevel, setAggrLevel] = useState<'prefix' | 'full'>('prefix')

  const summary = useMemo(() => {
    const map = new Map<string, number>()
    
    records.forEach(r => {
      let code = r.code || ''
      if (!code) return
      
      let key = code
      if (aggrLevel === 'prefix') {
        const parts = code.split('.')
        // Typical sub-kegiatan has 6 parts, e.g., 5.01.01.2.08.0002
        if (parts.length >= 6) {
          key = parts.slice(0, 6).join('.')
        }
      }
      
      const amt = r.expenseTotal || 0
      if (amt > 0) {
        map.set(key, (map.get(key) || 0) + amt)
      }
    })
    
    return Array.from(map.entries())
      .sort((a,b) => b[1] - a[1]) // Sort descending by amount
  }, [records, aggrLevel])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)
  }

  if (summary.length === 0) return (
     <div className="mt-8 pt-4 border-t border-border flex items-center justify-between">
       <span className="text-xs text-slate-500 italic">Belum ada data pengeluaran dengan kode rekening.</span>
     </div>
  )

  return (
    <div className="mt-6 pt-6 border-t border-border animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <PieChart className="w-4 h-4 text-indigo-500" />
          Pengeluaran per Rekening
        </h3>
        <div className="flex bg-input/40 border border-border p-1 rounded-lg">
           <button 
             onClick={() => setAggrLevel('prefix')}
             className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${aggrLevel === 'prefix' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-foreground'}`}
           >
             Agregat Sub-Kegiatan
           </button>
           <button 
             onClick={() => setAggrLevel('full')}
             className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${aggrLevel === 'full' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-foreground'}`}
           >
             Full Detail
           </button>
        </div>
      </div>
      
      <div className="bg-input/10 border border-border rounded-xl p-1 max-h-[220px] overflow-y-auto custom-scrollbar">
        {summary.map(([code, total], idx) => (
          <div key={code} className={`flex items-center justify-between p-3 rounded-lg hover:bg-indigo-500/10 transition-colors ${idx !== summary.length - 1 ? 'border-b border-border/50' : ''}`}>
            <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{code}</span>
            <span className="text-sm font-black text-rose-600 dark:text-rose-400">{formatCurrency(total)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
