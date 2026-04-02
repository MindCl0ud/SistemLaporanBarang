'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { 
  Download, 
  Search, 
  Plus,
  Trash2,
  Table as TableIcon,
  Columns as ColumnsIcon,
  Check,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  GripVertical
} from 'lucide-react'

// Extended Columns configuration
const AVAILABLE_COLUMNS = [
  { id: 'no', label: 'No.', defaultWidth: 50 },
  { id: 'date', label: 'Tgl Kwitansi/Nota', defaultWidth: 120 },
  { id: 'docNo', label: 'No. Dokumen', defaultWidth: 150 },
  { id: 'baNumber', label: 'Nomor BA', defaultWidth: 150 },
  { id: 'baDate', label: 'Tanggal BA', defaultWidth: 120 },
  { id: 'desc', label: 'Uraian / Deskripsi', defaultWidth: 350 },
  { id: 'vendor', label: 'Vendor / Penyedia', defaultWidth: 200 },
  { id: 'itemCode', label: 'Kode Barang', defaultWidth: 100 },
  { id: 'qty', label: 'Qty', defaultWidth: 70 },
  { id: 'unit', label: 'Satuan', defaultWidth: 80 },
  { id: 'price', label: 'Harga Satuan', defaultWidth: 130 },
  { id: 'total', label: 'Total Harga', defaultWidth: 150 },
  { id: 'bidang', label: 'Bidang', defaultWidth: 120 },
  { id: 'kodeRek', label: 'Kode Rekening', defaultWidth: 120 },
  { id: 'subKeg', label: 'Sub Kegiatan', defaultWidth: 120 },
]

export default function DocumentItemsReport({ documents }: { documents: any[] }) {
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<any[]>([])
  
  // Column Management (ORDER MATTERS)
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['no', 'date', 'desc', 'vendor', 'qty', 'unit', 'price', 'total'])
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    Object.fromEntries(AVAILABLE_COLUMNS.map(c => [c.id, c.defaultWidth]))
  )
  const [showColumnPicker, setShowColumnPicker] = useState(false)
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null)

  // Memoized Column List for Settings Menu
  const orderedMenu = useMemo(() => {
    const visible = visibleColumns.map(id => AVAILABLE_COLUMNS.find(c => c.id === id)!).filter(Boolean)
    const hidden = AVAILABLE_COLUMNS.filter(c => !visibleColumns.includes(c.id))
    return { visible, hidden }
  }, [visibleColumns])

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCols = localStorage.getItem('report_visible_cols')
      const savedWidths = localStorage.getItem('report_col_widths')
      if (savedCols) {
        try {
          const parsed = JSON.parse(savedCols)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setVisibleColumns(parsed)
          }
        } catch (e) { console.error(e) }
      }
      if (savedWidths) {
        try {
          const parsed = JSON.parse(savedWidths)
          if (typeof parsed === 'object' && parsed !== null) {
            setColumnWidths(prev => ({ ...prev, ...parsed }))
          }
        } catch (e) { console.error(e) }
      }
    }
  }, [])

  // Save to localStorage on change
  useEffect(() => {
    if (typeof window !== 'undefined' && visibleColumns.length > 0) {
      localStorage.setItem('report_visible_cols', JSON.stringify(visibleColumns))
    }
  }, [visibleColumns])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('report_col_widths', JSON.stringify(columnWidths))
    }
  }, [columnWidths])

  // Resizing state
  const resizingCol = useRef<string | null>(null)
  const startX = useRef(0)
  const startWidth = useRef(0)

  // Initialize report items from documents
  useEffect(() => {
    const flattened = documents.flatMap(doc => (doc.items || []).map((item: any) => ({
      id: item.id || Math.random().toString(36).substr(2, 9),
      docNo: doc.docNumber || '-',
      baNumber: doc.baNumber || '-',
      baDate: doc.baDate ? new Date(doc.baDate).toLocaleDateString('id-ID') : '-',
      bidang: doc.division || '-',
      vendor: doc.vendorName || 'Tidak Diketahui',
      date: doc.date ? new Date(doc.date).toLocaleDateString('id-ID') : '-',
      kodeRek: doc.kodeRek || '-',
      subKeg: doc.subKegiatan || '-',
      desc: item.description,
      qty: item.quantity || 0,
      unit: item.unit || '-',
      price: item.price || 0,
      total: item.total || 0,
      itemCode: item.itemCode || '-',
    })))
    setItems(flattened)
  }, [documents])

  const filteredItems = useMemo(() => {
    let result = items.filter(item => 
      item.description?.toLowerCase().includes(search.toLowerCase()) ||
      item.vendor?.toLowerCase().includes(search.toLowerCase()) ||
      item.docNo?.toLowerCase().includes(search.toLowerCase()) ||
      item.baNumber?.toLowerCase().includes(search.toLowerCase())
    )

    if (sortConfig) {
      result.sort((a, b) => {
        let valA = a[sortConfig.key]
        let valB = b[sortConfig.key]

        // Handle specific types (dates, numbers)
        if (sortConfig.key === 'date' || sortConfig.key === 'baDate') {
          const parseDate = (d: string) => {
            if (!d || d === '-') return 0
            const parts = d.split('/')
            return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime()
          }
          valA = parseDate(valA)
          valB = parseDate(valB)
        } else if (['qty', 'price', 'total'].includes(sortConfig.key)) {
          valA = Number(valA) || 0
          valB = Number(valB) || 0
        } else if (typeof valA === 'string') {
          valA = valA.toLowerCase()
          valB = (valB || '').toLowerCase()
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [items, search, sortConfig])

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig?.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  // COLUMN MANAGEMENT ACTIONS
  const toggleColumn = (id: string) => {
    setVisibleColumns(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const moveColumn = (id: string, direction: 'up' | 'down') => {
    const idx = visibleColumns.indexOf(id)
    if (idx === -1) return
    const newOrder = [...visibleColumns]
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= newOrder.length) return
    
    [newOrder[idx], newOrder[targetIdx]] = [newOrder[targetIdx], newOrder[idx]]
    setVisibleColumns(newOrder)
  }

  // RESIZING LOGIC
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
    const newWidth = Math.max(40, startWidth.current + delta)
    setColumnWidths(prev => ({ ...prev, [resizingCol.current!]: newWidth }))
  }

  const onMouseUpResize = () => {
    resizingCol.current = null
    document.removeEventListener('mousemove', onMouseMoveResize)
    document.removeEventListener('mouseup', onMouseUpResize)
    document.body.style.cursor = 'default'
  }

  // ITEM ACTIONS
  const handleUpdateItem = (originalIdx: number, key: string, value: any) => {
    setItems(prev => {
      const newItems = [...prev]
      newItems[originalIdx] = { ...newItems[originalIdx], [key]: value }
      if (key === 'price' || key === 'quantity') {
        const p = Number(newItems[originalIdx].price) || 0
        const q = Number(newItems[originalIdx].quantity) || 0
        newItems[originalIdx].total = p * q
      }
      return newItems
    })
  }

  const handleDeleteItem = (originalIdx: number) => {
    if (!confirm('Hapus baris ini?')) return
    setItems(prev => prev.filter((_, i) => i !== originalIdx))
  }

  const handleAddRow = () => {
    const newItem = {
      id: Math.random().toString(36).substr(2, 9),
      desc: 'Item Baru...',
      qty: 1,
      unit: 'Pcs',
      price: 0,
      total: 0,
      date: new Date().toLocaleDateString('id-ID'),
      docNo: 'Manual',
      vendor: '-',
      kodeRek: '-',
      subKeg: '-',
      itemCode: '-',
      baNumber: '-',
      baDate: '-',
      bidang: '-',
    }
    setItems([newItem, ...items])
  }

  const handleExport = () => {
    const dataToExport = filteredItems.map((item, idx) => {
      const row: any = {}
      visibleColumns.forEach(colId => {
        const config = AVAILABLE_COLUMNS.find(c => c.id === colId)
        if (!config) return
        
        const label = config.label
        if (colId === 'no') row[label] = idx + 1
        else if (colId === 'date') row[label] = item.date
        else if (colId === 'docNo') row[label] = item.docNo
        else if (colId === 'baNumber') row[label] = item.baNumber
        else if (colId === 'baDate') row[label] = item.baDate
        else if (colId === 'bidang') row[label] = item.bidang
        else if (colId === 'vendor') row[label] = item.vendor
        else if (colId === 'kodeRek') row[label] = item.kodeRek
        else if (colId === 'subKeg') row[label] = item.subKeg
        else if (colId === 'desc') row[label] = item.desc
        else if (colId === 'qty') row[label] = item.qty
        else if (colId === 'unit') row[label] = item.unit
        else if (colId === 'price') row[label] = item.price
        else if (colId === 'total') row[label] = item.total
        else if (colId === 'itemCode') row[label] = item.itemCode
        return row
      })
      return row
    })

    const worksheet = XLSX.utils.json_to_sheet(dataToExport)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Excel Build")
    XLSX.writeFile(workbook, `Laporan_Excel_Advance_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* TOOLBAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-slate-100 dark:bg-black/20 border-b-2 border-primary/20 rounded-t-[1.5rem] select-none">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-primary rounded-full"></div>
          <h2 className="text-lg font-black text-foreground tracking-tight flex items-center gap-2">
            <TableIcon className="w-5 h-5 opacity-50" />
            Advanced Report Builder
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* COLUMN PICKER POPUP */}
          <div className="relative">
            <button
               onClick={() => setShowColumnPicker(!showColumnPicker)}
               className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl text-xs font-black text-foreground hover:bg-accent transition-all shadow-sm"
            >
              <ColumnsIcon className="w-4 h-4 text-primary" />
              Susunan Kolom
              <ChevronDown className={`w-3 h-3 transition-transform ${showColumnPicker ? 'rotate-180' : ''}`} />
            </button>
            
            {showColumnPicker && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowColumnPicker(false)} />
                <div className="absolute right-0 mt-2 w-72 bg-card border border-border rounded-2xl shadow-2xl z-20 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-4 border-b border-border pb-2 px-1">Pilih & Urutkan Kolom</p>
                  <div className="space-y-1.5 max-h-[400px] overflow-y-auto custom-scrollbar px-1">
                    {/* VISIBLE COLUMNS SECTION */}
                    {orderedMenu.visible.map((col, idx) => (
                      <div key={col.id} className="flex items-center justify-between group p-1.5 rounded-lg bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors">
                        <div 
                          onClick={() => toggleColumn(col.id)}
                          className="flex items-center gap-3 cursor-pointer flex-1"
                        >
                          <div className={`w-4 h-4 rounded border bg-primary border-primary flex items-center justify-center shadow-lg shadow-primary/20`}>
                             <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                          <span className="text-[11px] font-black text-foreground">{col.label}</span>
                        </div>
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button 
                             onClick={(e) => { e.stopPropagation(); moveColumn(col.id, 'up'); }}
                             className="p-1 hover:bg-primary/20 rounded-md text-primary disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                             disabled={idx === 0}
                             title="Pindah ke Atas/Kiri"
                           >
                             <ArrowUp className="w-3 h-3" />
                           </button>
                           <button 
                             onClick={(e) => { e.stopPropagation(); moveColumn(col.id, 'down'); }}
                             className="p-1 hover:bg-primary/20 rounded-md text-primary disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                             disabled={idx === orderedMenu.visible.length - 1}
                             title="Pindah ke Bawah/Kanan"
                           >
                             <ArrowDown className="w-3 h-3" />
                           </button>
                        </div>
                      </div>
                    ))}

                    {/* DIVIDER */}
                    {orderedMenu.hidden.length > 0 && (
                      <div className="py-2 flex items-center gap-2">
                        <div className="h-[1px] flex-1 bg-border"></div>
                        <span className="text-[9px] font-black text-muted uppercase tracking-widest">Kolom Lainnya</span>
                        <div className="h-[1px] flex-1 bg-border"></div>
                      </div>
                    )}

                    {/* HIDDEN COLUMNS SECTION */}
                    {orderedMenu.hidden.map((col) => (
                      <div key={col.id} className="flex items-center justify-between group p-1.5 rounded-lg hover:bg-accent transition-colors border border-transparent hover:border-border grayscale opacity-60 hover:grayscale-0 hover:opacity-100">
                        <div 
                          onClick={() => toggleColumn(col.id)}
                          className="flex items-center gap-3 cursor-pointer flex-1"
                        >
                          <div className="w-4 h-4 rounded border border-border"></div>
                          <span className="text-[11px] font-bold text-muted-foreground">{col.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            onClick={handleAddRow}
            className="flex items-center gap-2 px-5 py-2.5 bg-card border border-border text-foreground rounded-xl text-xs font-black hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" /> Baris Baru
          </button>
          
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" /> Ekspor (.xlsx)
          </button>
        </div>
      </div>

      {/* SEARCH */}
      <div className="relative shadow-lg shadow-indigo-500/5 select-none">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-muted">
           <Search className="w-4 h-4" />
           <span className="text-[10px] font-black uppercase tracking-tighter border-r border-border pr-2">Filter</span>
        </div>
        <input 
          className="w-full bg-accent/30 dark:bg-card border border-border border-b-0 py-3 pl-24 pr-4 text-sm font-black text-foreground outline-none focus:bg-card transition-all"
          placeholder="Cari kata kunci..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="border-x border-b border-border bg-card overflow-hidden relative shadow-2xl shadow-indigo-500/5 select-none">
        <div className="overflow-x-auto custom-scrollbar max-h-[700px]">
          <table className="border-collapse table-fixed w-full min-w-full">
            <thead className="sticky top-0 z-[10] shadow-sm">
              <tr className="bg-table-header text-foreground">
                {visibleColumns.map((colId) => {
                  const config = AVAILABLE_COLUMNS.find(c => c.id === colId)
                  if (!config) return null
                  const width = columnWidths[colId] || 100
                  return (
                    <th 
                      key={colId} 
                      className={`border border-border px-2 py-3 text-left text-[10px] font-black uppercase tracking-widest overflow-hidden relative group/header select-none ${colId !== 'no' ? 'cursor-pointer hover:bg-accent' : ''} transition-colors`}
                      style={{ width: `${width}px` }}
                      onClick={() => colId !== 'no' && requestSort(colId)}
                    >
                       <div className="flex items-center gap-1.5 truncate pr-2">
                          <span className="truncate">{config.label}</span>
                          {sortConfig?.key === colId ? (
                            sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-primary shrink-0" /> : <ChevronDown className="w-3 h-3 text-primary shrink-0" />
                          ) : (
                            colId !== 'no' && <ArrowUpDown className="w-2.5 h-2.5 opacity-0 group-hover/header:opacity-50 shrink-0 transition-opacity" />
                          )}
                       </div>
                       {/* RESIZE HANDLE */}
                       <div 
                         onMouseDown={(e) => { e.stopPropagation(); onMouseDownResize(colId, e); }}
                         className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary/50 active:bg-primary transition-colors z-20"
                       />
                    </th>
                  )
                })}
                <th className="w-14 border border-border px-2 py-3 text-center text-[10px] font-black uppercase tracking-widest bg-slate-300 dark:bg-slate-900 sticky right-0 z-10 shadow-[-4px_0_10px_-2px_rgba(0,0,0,0.1)]">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="py-32 text-center bg-card">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                       <TableIcon className="w-16 h-16" />
                       <p className="font-black text-xs uppercase tracking-[0.4em]">Data Kosong</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, viewIdx) => {
                  const originalIdx = items.indexOf(item);
                  return (
                    <tr key={item.id} className="group hover:bg-primary/5 transition-colors odd:bg-slate-50/30 dark:odd:bg-white/5 select-text">
                      {visibleColumns.map((colId) => {
                        const width = columnWidths[colId] || 100
                        return (
                          <td 
                             key={colId} 
                             className={`border border-border p-0 overflow-hidden ${colId === 'no' ? 'bg-slate-50/50 dark:bg-black/20 text-center font-black text-[11px] text-muted-foreground' : ''} ${colId === 'total' ? 'bg-emerald-500/5 text-right' : ''}`}
                             style={{ width: `${width}px` }}
                          >
                             {colId === 'no' ? (
                               viewIdx + 1
                             ) : (
                            <input 
                                 className={`w-full bg-transparent border-none p-2 outline-none focus:bg-white dark:focus:bg-white/5 ${colId === 'total' ? 'text-right font-black text-emerald-600 dark:text-emerald-400 font-mono text-xs' : 'text-[11px] font-bold text-foreground'} ${colId === 'price' ? 'text-right font-mono' : ''} ${colId === 'date' ? 'text-primary font-black' : ''}`}
                                 value={
                                   colId === 'total' ? formatCurrency(item[colId]) :
                                   item[colId] || ''
                                 }
                                 onChange={e => {
                                   handleUpdateItem(originalIdx, colId, e.target.value)
                                 }}
                                 readOnly={colId === 'total'}
                               />
                             )}
                          </td>
                        )
                      })}
                      <td className="border border-border text-center bg-slate-50 dark:bg-black/20 sticky right-0 z-10 shadow-[-4px_0_10px_-2px_rgba(0,0,0,0.1)]">
                        <button 
                          onClick={() => handleDeleteItem(originalIdx)}
                          className="p-3 text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-6 bg-slate-50 dark:bg-black/20 border border-border text-[10px] font-black text-muted transition-all select-none opacity-70">
         <div className="flex items-center gap-4">
            <p className="flex items-center gap-2"><GripVertical className="w-3 h-3" /> Geser tepi kolom untuk mengubah lebar</p>
            <p className="flex items-center gap-2"><ArrowUp className="w-3 h-3" /> Gunakan tombol pemindah di "Susunan Kolom" untuk urutan</p>
         </div>
         <p className="italic">Data BA ditarik otomatis dari ekstraksi dokumen AI.</p>
      </div>
    </div>
  )
}
