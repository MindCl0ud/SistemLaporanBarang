'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { PieChart, ListTree, Search, ArrowRight, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react'

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

    // If no match, just return the name without word limit
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
  const [search, setSearch] = useState('')
  // Aggregation level: 'full' (all segments) or 'prefix' (first 6 segments)
  const [aggrLevel, setAggrLevel] = useState<'prefix' | 'full'>('prefix')

  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({
    key: 'yearlyTotal',
    direction: 'desc'
  })

  // Column Width Management
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    code: 160,
    name: 400,
    budget: 150,
    yearlyTotal: 150,
    remaining: 180
  })

  // Resizing state
  const resizingCol = useRef<string | null>(null)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const onMouseDownResize = (id: string, e: React.MouseEvent) => {
    resizingCol.current = id
    startX.current = e.clientX
    startWidth.current = columnWidths[id]
    
    document.addEventListener('mousemove', onMouseMoveResize)
    document.addEventListener('mouseup', onMouseUpResize)
    document.body.style.cursor = 'col-resize'
  }

  const onMouseMoveResize = (e: MouseEvent) => {
    if (!resizingCol.current) return
    const delta = e.clientX - startX.current
    const newWidth = Math.max(80, startWidth.current + delta)
    setColumnWidths(prev => ({ ...prev, [resizingCol.current!]: newWidth }))
  }

  const onMouseUpResize = () => {
    resizingCol.current = null
    document.removeEventListener('mousemove', onMouseMoveResize)
    document.removeEventListener('mouseup', onMouseUpResize)
    document.body.style.cursor = 'default'
  }

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const mappingMap = useMemo(() => {
    const m = new Map<string, { name: string, budget: number }>()
    accountMappings.forEach(am => m.set(am.code, { name: am.name, budget: am.budget || 0 }))
    return m
  }, [accountMappings])

  const summary = useMemo(() => {
    const map = new Map<string, { monthlyTotal: number, yearlyTotal: number, name: string, budget: number }>()
    
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
        const current = map.get(key) || { monthlyTotal: 0, yearlyTotal: 0, name: '', budget: 0 }
        current.yearlyTotal += amt
        if (!current.name) {
          const mapping = mappingMap.get(key)
          current.name = mapping?.name || extractName(r.description, aggrLevel === 'full')
          current.budget = mapping?.budget || 0
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
    
    const result = Array.from(map.entries())
    
    // Logika Pengurutan Dinamis
    result.sort((a, b) => {
      const codeA = a[0];
      const codeB = b[0];
      const dataA = a[1];
      const dataB = b[1];
      const remainingA = dataA.budget - dataA.yearlyTotal;
      const remainingB = dataB.budget - dataB.yearlyTotal;

      let valA: any, valB: any;
      switch (sortConfig.key) {
        case 'code': valA = codeA; valB = codeB; break;
        case 'name': valA = dataA.name; valB = dataB; break;
        case 'budget': valA = dataA.budget; valB = dataB.budget; break;
        case 'yearlyTotal': valA = dataA.yearlyTotal; valB = dataB.yearlyTotal; break;
        case 'remaining': valA = remainingA; valB = remainingB; break;
        default: valA = dataA.yearlyTotal; valB = dataB.yearlyTotal;
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [monthlyRecords, yearlyRecords, aggrLevel, mappingMap, sortConfig])

  const filteredSummary = useMemo(() => {
    if (!search.trim()) return summary;
    const lowerSearch = search.toLowerCase();
    return summary.filter(([code, data]) => 
      code.toLowerCase().includes(lowerSearch) || 
      data.name.toLowerCase().includes(lowerSearch)
    );
  }, [summary, search])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)
  }

  if (summary.length === 0) return (
     <div className="flex items-center justify-between">
       <span className="text-xs text-muted italic">Belum ada data pengeluaran dengan kode rekening.</span>
     </div>
  )

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6">
      {/* PREMIUM HEADER & TOOLBAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-slate-100 dark:bg-black/20 border-b-2 border-primary/20 rounded-t-[1.5rem] select-none">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-primary rounded-full"></div>
          <h2 className="text-lg font-black text-foreground tracking-tight flex items-center gap-2">
            <PieChart className="w-5 h-5 text-primary opacity-60" />
            Pengeluaran per Rekening
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* SEARCH BAR INTEGRATED */}
          <div className="relative group mr-2">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input 
              type="text"
              placeholder="Cari Rekening..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-48 bg-white dark:bg-card border border-border py-2 pl-9 pr-4 rounded-xl text-[11px] font-black outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary transition-all shadow-sm"
            />
          </div>

          <div className="flex bg-white dark:bg-card border border-border p-1 rounded-xl shadow-sm">
             <button 
               onClick={() => setAggrLevel('prefix')}
               className={`px-4 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${aggrLevel === 'prefix' ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-100' : 'text-muted hover:text-foreground scale-95'}`}
             >
               Agregat Sub-Kegiatan
             </button>
             <button 
               onClick={() => setAggrLevel('full')}
               className={`px-4 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${aggrLevel === 'full' ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-100' : 'text-muted hover:text-foreground scale-95'}`}
             >
               Full Detail
             </button>
          </div>
        </div>
      </div>
      
      <div className="border border-border bg-white dark:bg-black/10 overflow-hidden relative shadow-2xl shadow-indigo-500/5 select-none rounded-b-[1.5rem]">
        <div className="overflow-x-auto custom-scrollbar max-h-[700px]">
          <table className="w-full text-sm border-collapse min-w-full table-fixed">
            <thead className="sticky top-0 z-[10] shadow-sm">
              <tr className="bg-slate-200 dark:bg-slate-800 text-foreground">
                {[
                  { id: 'code', label: 'Kode Rekening' },
                  { id: 'name', label: 'Nama Rekening' },
                  { id: 'budget', label: 'Total Pagu', align: 'text-right' },
                  { id: 'yearlyTotal', label: 'Realisasi', align: 'text-right' },
                  { id: 'remaining', label: 'Sisa / Penyerapan', align: 'text-right' },
                ].map((col) => (
                  <th 
                    key={col.id} 
                    style={{ width: `${columnWidths[col.id]}px` }}
                    className={`px-4 py-4 ${col.align || 'text-left'} text-[10px] uppercase font-black tracking-[0.2em] text-foreground/70 border-r border-border/20 overflow-hidden relative group/header select-none cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors`}
                    onClick={() => requestSort(col.id)}
                  >
                    <div className="flex items-center gap-1">
                      <span className="truncate">{col.label}</span>
                      {sortConfig.key === col.id ? (
                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-primary shrink-0" /> : <ChevronDown className="w-3 h-3 text-primary shrink-0" />
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 opacity-0 group-hover/header:opacity-50 shrink-0 transition-opacity" />
                      )}
                    </div>
                    {/* RESIZE HANDLE */}
                    <div 
                      onMouseDown={(e) => { e.stopPropagation(); onMouseDownResize(col.id, e); }}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/50 active:bg-primary transition-colors z-20"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredSummary.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-30">
                       <Search className="w-12 h-12" />
                       <p className="font-black text-xs uppercase tracking-widest">Data Tidak Ditemukan</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSummary.map(([code, data]) => {
                  const percentage = Math.min((data.monthlyTotal / data.yearlyTotal) * 100, 100) || 0;
                  return (
                    <tr key={code} className="hover:bg-primary/5 transition-all group select-text">
                      <td className="px-4 py-5 font-mono text-[11px] text-primary/80 font-black border-r border-border/10 overflow-hidden" style={{ width: `${columnWidths.code}px` }}>
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-lg bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shrink-0">
                             <ListTree className="w-3.5 h-3.5" />
                          </div>
                          <span className="tracking-tighter truncate">{code}</span>
                        </div>
                      </td>
                      <td className="px-4 py-5 border-r border-border/10 overflow-hidden" style={{ width: `${columnWidths.name}px` }}>
                        <div className="font-bold text-foreground text-sm tracking-tight leading-normal whitespace-normal break-words">
                          {data.name}
                        </div>
                      </td>
                      <td className="px-4 py-5 text-right font-black text-foreground border-r border-border/10 tabular-nums overflow-hidden" style={{ width: `${columnWidths.budget}px` }}>
                        {formatCurrency(data.budget)}
                      </td>
                      <td className="px-4 py-5 text-right font-black text-rose-600 dark:text-rose-400 border-r border-border/10 tabular-nums overflow-hidden" style={{ width: `${columnWidths.yearlyTotal}px` }}>
                        {formatCurrency(data.yearlyTotal)}
                      </td>
                      <td className="px-4 py-5 text-right overflow-hidden" style={{ width: `${columnWidths.remaining}px` }}>
                        <div className="inline-flex flex-col items-end w-full">
                          <div className="flex items-center gap-2 mb-1.5 leading-none">
                             <span className={`font-black tabular-nums transition-colors ${data.budget - data.yearlyTotal < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                               {formatCurrency(data.budget - data.yearlyTotal)}
                             </span>
                             <ArrowRight className="w-3 h-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-all" />
                          </div>
                          
                          {data.budget > 0 ? (
                            <>
                              <div className="w-full max-w-[120px] h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden border border-border/5">
                                 <div 
                                   className={`h-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(225,29,72,0.3)] ${
                                     (data.yearlyTotal / data.budget) > 1 ? 'bg-rose-600' : 
                                     (data.yearlyTotal / data.budget) > 0.8 ? 'bg-amber-500' : 'bg-emerald-500'
                                   }`}
                                   style={{ width: `${Math.min((data.yearlyTotal / data.budget) * 100, 100)}%` }}
                                 />
                              </div>
                              <span className="text-[9px] font-black text-muted-foreground mt-1 opacity-50 whitespace-nowrap">
                                {((data.yearlyTotal / data.budget) * 100).toFixed(1)}% Penyerapan
                              </span>
                            </>
                          ) : (
                            <span className="text-[9px] font-black text-muted-foreground italic opacity-30">Pagu Belum Diatur</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
})
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
