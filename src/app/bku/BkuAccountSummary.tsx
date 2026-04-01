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

export default function BkuAccountSummary({ records }: { records: any[] }) {
  // Aggregation level: 'full' (all segments) or 'prefix' (first 6 segments)
  const [aggrLevel, setAggrLevel] = useState<'prefix' | 'full'>('prefix')

  const summary = useMemo(() => {
    const map = new Map<string, { total: number, name: string }>()
    
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
        const current = map.get(key) || { total: 0, name: '' }
        current.total += amt
        // Determine name if not set
        if (!current.name) {
          current.name = extractName(r.description, aggrLevel === 'full')
        }
        map.set(key, current)
      }
    })
    
    return Array.from(map.entries())
      .sort((a,b) => b[1].total - a[1].total) // Sort descending by amount
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
        {summary.map(([code, data], idx) => (
          <div key={code} className={`flex items-start justify-between p-3 rounded-lg hover:bg-indigo-500/10 transition-colors gap-4 ${idx !== summary.length - 1 ? 'border-b border-border/50' : ''}`}>
            <div className="flex flex-col gap-1 min-w-0">
               <span className="text-sm font-bold text-foreground truncate">{data.name}</span>
               <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                 <ListTree className="w-3 h-3 opacity-70" /> {code}
               </span>
            </div>
            <span className="text-sm font-black text-rose-600 dark:text-rose-400 whitespace-nowrap mt-0.5">{formatCurrency(data.total)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
