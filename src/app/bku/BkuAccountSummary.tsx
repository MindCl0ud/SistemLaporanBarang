'use client'

import { useState, useMemo } from 'react'
import { PieChart, ListTree } from 'lucide-react'

// Helper function to extract names from descriptions
function extractName(description: string, isFull: boolean): string {
  if (!description) return "Belanja Lainnya"
  
  // Basic prefix cleaning
  let name = description
    .replace(/^(bayar biaya belanja|bayar biaya|bayar honorarium|pembayaran|biaya belanja|belanja)\s+/i, 'Belanja ')
    .replace(/^(jkk)\s+/i, 'Belanja JKK ')
    .replace(/^(penerimaan sp2d.*)$/i, 'Penerimaan SP2D')

  // Clean trailing info
  name = name.split(/\s+(Tahun \d{4}|Bulan|dari Sub Kegiatan|kepada|An\.|Pada Kantor|Tahap)\s+/i)[0].trim()

  if (!isFull) {
    // Attempt to extract broad categories
    const lower = name.toLowerCase()
    
    if (lower.includes("makanan dan minuman")) return "Belanja Makanan dan Minuman"
    if (lower.includes("kawat/faksimili/internet/tv") || lower.includes("jasa komunikasi")) return "Belanja Jasa Komunikasi / Internet"
    if (lower.includes("honorarium") || lower.includes("honor")) return "Belanja Honorarium"
    if (lower.includes("jasa pengelolaan")) return "Belanja Jasa Pengelolaan"
    if (lower.includes("perjalanan dinas")) return "Belanja Perjalanan Dinas"
    if (lower.includes("alat tulis kantor") || lower.includes("atk")) return "Belanja Alat Tulis Kantor"
    if (lower.includes("bahan bakar minyak") || lower.includes("bbm")) return "Belanja BBM"
    if (lower.includes("pemeliharaan") && lower.includes("kendaraan")) return "Belanja Pemeliharaan Kendaraan Dinas"
    if (lower.includes("pemeliharaan") && lower.includes("angkutan")) return "Belanja Pemeliharaan Alat Angkutan"
    if (lower.includes("listrik") || lower.includes("air")) return "Belanja Daya Air dan Listrik"
    if (lower.includes("penggandaan") || lower.includes("fotokopi")) return "Belanja Penggandaan"
    if (lower.includes("jkk")) return "Belanja JKK"
    if (lower.includes("bpjs")) return "Pembayaran BPJS"
    if (lower.includes("tunjangan")) return "Pembayaran Tunjangan"

    // If no match, just take up to first 4 words
    const words = name.split(' ')
    if (words.length > 4) {
      return words.slice(0, 4).join(' ') + '...'
    }
  }

  return name
}

export default function BkuAccountSummary({ 
  monthlyRecords, 
  yearlyRecords, 
  accountMappings 
}: { 
  monthlyRecords: any[], 
  yearlyRecords: any[], 
  accountMappings: any[] 
}) {
  // Aggregation level: 'full' (all segments) or 'prefix' (first 6 segments)
  const [aggrLevel, setAggrLevel] = useState<'prefix' | 'full'>('prefix')

  const mappingMap = useMemo(() => {
    const m = new Map<string, string>()
    accountMappings.forEach(am => m.set(am.code, am.name))
    return m
  }, [accountMappings])

  const summary = useMemo(() => {
    const map = new Map<string, { monthlyTotal: number, yearlyTotal: number, name: string }>()
    
    // Process yearly records first
    yearlyRecords.forEach(r => {
      let code = r.code || ''
      if (!code) return
      
      let key = code
      if (aggrLevel === 'prefix') {
        const parts = code.split('.')
        if (parts.length >= 6) {
          key = parts.slice(0, 6).join('.')
        }
      }
      
      const amt = r.expenseTotal || 0
      if (amt > 0) {
        const current = map.get(key) || { monthlyTotal: 0, yearlyTotal: 0, name: '' }
        current.yearlyTotal += amt
        if (!current.name) {
          // Use mapping if exists, else extract from description
          current.name = mappingMap.get(key) || extractName(r.description, aggrLevel === 'full')
        }
        map.set(key, current)
      }
    })

    // Process monthly records for current month subtotal
    monthlyRecords.forEach(r => {
      let code = r.code || ''
      if (!code) return
      
      let key = code
      if (aggrLevel === 'prefix') {
        const parts = code.split('.')
        if (parts.length >= 6) {
          key = parts.slice(0, 6).join('.')
        }
      }
      
      const amt = r.expenseTotal || 0
      if (amt > 0) {
         const current = map.get(key)
         if (current) current.monthlyTotal += amt
      }
    })
    
    return Array.from(map.entries())
      .sort((a,b) => b[1].yearlyTotal - a[1].yearlyTotal) // Sort descending by yearly amount
  }, [monthlyRecords, yearlyRecords, aggrLevel])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)
  }

  if (summary.length === 0) return (
     <div className="flex items-center justify-between">
       <span className="text-xs text-muted italic">Belum ada data pengeluaran dengan kode rekening.</span>
     </div>
  )

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <PieChart className="w-5 h-5 text-primary" />
          Pengeluaran per Rekening
        </h3>
        <div className="flex bg-input/40 border border-border p-1 rounded-lg">
           <button 
             onClick={() => setAggrLevel('prefix')}
             className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${aggrLevel === 'prefix' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-foreground'}`}
           >
             Agregat Sub-Kegiatan
           </button>
           <button 
             onClick={() => setAggrLevel('full')}
             className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${aggrLevel === 'full' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-foreground'}`}
           >
             Full Detail
           </button>
        </div>
      </div>
      
      <div className="overflow-x-auto custom-scrollbar border border-border rounded-2xl bg-card shadow-sm">
        <table className="w-full text-sm border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-input/50">
              <th className="px-4 py-4 text-left text-[10px] uppercase font-black tracking-widest text-muted border-b border-border w-48">Kode Rekening</th>
              <th className="px-4 py-4 text-left text-[10px] uppercase font-black tracking-widest text-muted border-b border-border">Nama / Uraian Kustom</th>
              <th className="px-4 py-4 text-right text-[10px] uppercase font-black tracking-widest text-muted border-b border-border w-40">Bulan Ini</th>
              <th className="px-4 py-4 text-right text-[10px] uppercase font-black tracking-widest text-muted border-b border-border w-40">Total Tahunan</th>
            </tr>
          </thead>
          <tbody>
            {summary.map(([code, data]) => (
              <tr key={code} className="hover:bg-primary/5 transition-colors border-b border-border/50 last:border-0 group">
                <td className="px-4 py-4 font-mono text-[11px] text-primary font-black">
                  <div className="flex items-center gap-2">
                    <ListTree className="w-3.5 h-3.5 opacity-50" />
                    {code}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="font-bold text-foreground text-sm leading-tight">
                    {data.name}
                  </div>
                </td>
                <td className="px-4 py-4 text-right font-black text-rose-600 dark:text-rose-400">
                  {formatCurrency(data.monthlyTotal)}
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="inline-flex flex-col items-end">
                    <span className="font-black text-rose-700 dark:text-rose-500">{formatCurrency(data.yearlyTotal)}</span>
                    <div className="w-full h-1 bg-rose-500/10 rounded-full mt-1 overflow-hidden">
                       <div 
                         className="h-full bg-rose-500" 
                         style={{ width: `${Math.min((data.monthlyTotal / data.yearlyTotal) * 100, 100)}%` }}
                       />
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
