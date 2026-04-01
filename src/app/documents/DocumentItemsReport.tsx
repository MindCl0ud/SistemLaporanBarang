'use client'

import { useState, useMemo, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { 
  Download, 
  Search, 
  Plus,
  Trash2,
  Table as TableIcon,
  Columns as ColumnsIcon,
  Check,
  ChevronDown
} from 'lucide-react'

// Available columns configuration
const AVAILABLE_COLUMNS = [
  { id: 'no', label: 'No.', defaultVisible: true },
  { id: 'date', label: 'Tanggal', defaultVisible: true },
  { id: 'desc', label: 'Uraian / Deskripsi', defaultVisible: true },
  { id: 'vendor', label: 'Vendor / Penyedia', defaultVisible: true },
  { id: 'qty', label: 'Qty', defaultVisible: true },
  { id: 'unit', label: 'Satuan', defaultVisible: true },
  { id: 'price', label: 'Harga Satuan', defaultVisible: true },
  { id: 'total', label: 'Total Harga', defaultVisible: true },
  { id: 'docNo', label: 'No. Dokumen', defaultVisible: false },
  { id: 'kodeRek', label: 'Kode Rekening', defaultVisible: false },
  { id: 'subKeg', label: 'Sub Kegiatan', defaultVisible: false },
]

export default function DocumentItemsReport({ documents }: { documents: any[] }) {
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<any[]>([])
  
  // Column Management
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    AVAILABLE_COLUMNS.filter(c => c.defaultVisible).map(c => c.id)
  )
  const [showColumnPicker, setShowColumnPicker] = useState(false)

  // Initialize report items from documents
  useEffect(() => {
    const flattened = documents.flatMap(doc => (doc.items || []).map((item: any) => ({
      ...item,
      id: item.id || Math.random().toString(36).substr(2, 9),
      docNumber: doc.docNumber || '-',
      vendorName: doc.vendorName || 'Tidak Diketahui',
      docDate: doc.date ? new Date(doc.date).toLocaleDateString('id-ID') : '-',
      kodeRek: doc.kodeRek || '-',
      subKegiatan: doc.subKegiatan || '-',
    })))
    setItems(flattened)
  }, [documents])

  const filteredItems = useMemo(() => {
    return items.filter(item => 
      item.description?.toLowerCase().includes(search.toLowerCase()) ||
      item.vendorName?.toLowerCase().includes(search.toLowerCase()) ||
      item.docNumber?.toLowerCase().includes(search.toLowerCase())
    )
  }, [items, search])

  const toggleColumn = (id: string) => {
    setVisibleColumns(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

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
    if (!confirm('Hapus baris ini dari laporan?')) return
    setItems(prev => prev.filter((_, i) => i !== originalIdx))
  }

  const handleAddRow = () => {
    const newItem = {
      id: Math.random().toString(36).substr(2, 9),
      description: 'Item Baru...',
      quantity: 1,
      unit: 'Pcs',
      price: 0,
      total: 0,
      docNumber: 'Manual',
      vendorName: '-',
      docDate: new Date().toLocaleDateString('id-ID'),
      kodeRek: '-',
      subKegiatan: '-',
    }
    setItems([newItem, ...items])
  }

  const handleExport = () => {
    const dataToExport = filteredItems.map((item, idx) => {
      const row: any = {}
      if (visibleColumns.includes('no')) row['No.'] = idx + 1
      if (visibleColumns.includes('date')) row['Tanggal'] = item.docDate
      if (visibleColumns.includes('docNo')) row['No. Dokumen'] = item.docNumber
      if (visibleColumns.includes('vendor')) row['Vendor/Penyedia'] = item.vendorName
      if (visibleColumns.includes('kodeRek')) row['Kode Rekening'] = item.kodeRek
      if (visibleColumns.includes('subKeg')) row['Sub Kegiatan'] = item.subKegiatan
      if (visibleColumns.includes('desc')) row['Uraian / Deskripsi'] = item.description
      if (visibleColumns.includes('qty')) row['Qty'] = item.quantity
      if (visibleColumns.includes('unit')) row['Satuan'] = item.unit
      if (visibleColumns.includes('price')) row['Harga Satuan'] = item.price
      if (visibleColumns.includes('total')) row['Total Harga'] = item.total
      return row
    })

    const worksheet = XLSX.utils.json_to_sheet(dataToExport)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Kustom")
    XLSX.writeFile(workbook, `Laporan_Excel_BKU_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* EXCEL STYLE TOOLBAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-slate-100 dark:bg-black/20 border-b-2 border-primary/20 rounded-t-[1.5rem]">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-primary rounded-full"></div>
          <h2 className="text-lg font-black text-foreground tracking-tight flex items-center gap-2">
            <TableIcon className="w-5 h-5 opacity-50" />
            Report Builder (Excel View)
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* COLUMN PICKER POPUP */}
          <div className="relative">
            <button
               onClick={() => setShowColumnPicker(!showColumnPicker)}
               className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-card border border-border rounded-xl text-xs font-black text-foreground hover:bg-slate-50 transition-all shadow-sm"
            >
              <ColumnsIcon className="w-4 h-4 text-primary" />
              Susunan Kolom
              <ChevronDown className={`w-3 h-3 transition-transform ${showColumnPicker ? 'rotate-180' : ''}`} />
            </button>
            
            {showColumnPicker && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowColumnPicker(false)} />
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-card border border-border rounded-2xl shadow-2xl z-20 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-4 border-b border-border pb-2 px-1">Pilih Kolom Laporan</p>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar px-1">
                    {AVAILABLE_COLUMNS.map(col => (
                      <div 
                        key={col.id} 
                        onClick={() => toggleColumn(col.id)}
                        className="flex items-center gap-3 p-2 hover:bg-primary/5 rounded-lg cursor-pointer transition-colors group"
                      >
                        <div className={`w-5 h-5 rounded border ${visibleColumns.includes(col.id) ? 'bg-primary border-primary flex items-center justify-center' : 'border-border'}`}>
                           {visibleColumns.includes(col.id) && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className={`text-xs font-bold ${visibleColumns.includes(col.id) ? 'text-foreground' : 'text-muted-foreground'}`}>{col.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="h-8 w-[1px] bg-border mx-2 hidden lg:block" />

          <button
            onClick={handleAddRow}
            className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-card border border-border text-foreground rounded-xl text-xs font-black hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" /> Baris Baru
          </button>
          
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" /> Simpan ke Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* SEARCH BAR (Excel Input Field Style) */}
      <div className="relative mb-0 shadow-lg shadow-indigo-500/5">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-muted">
           <Search className="w-4 h-4" />
           <span className="text-[10px] font-black uppercase tracking-tighter border-r border-border pr-2">Search</span>
        </div>
        <input 
          className="w-full bg-slate-50 dark:bg-card border border-border border-b-0 py-3.5 pl-24 pr-4 text-sm font-black text-foreground outline-none focus:bg-white transition-all placeholder:text-muted/40"
          placeholder="Tulis kata kunci untuk filter data..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* REAL EXCEL GRID TABLE */}
      <div className="border-x border-b border-border bg-white dark:bg-black/10 overflow-hidden relative shadow-2xl shadow-indigo-500/5">
        <div className="overflow-x-auto custom-scrollbar max-h-[600px]">
          <table className="w-full text-sm border-collapse table-fixed min-w-[1200px]">
            <thead className="sticky top-0 z-[5] shadow-sm">
              <tr className="bg-slate-200 dark:bg-slate-800 text-foreground">
                {visibleColumns.includes('no') && <th className="w-12 border border-border px-2 py-3 text-center text-[10px] font-black uppercase tracking-widest">No.</th>}
                {visibleColumns.includes('date') && <th className="w-32 border border-border px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest">Tanggal</th>}
                {visibleColumns.includes('docNo') && <th className="w-40 border border-border px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest">No. Dokumen</th>}
                {visibleColumns.includes('desc') && <th className="w-auto border border-border px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest">Uraian / Deskripsi</th>}
                {visibleColumns.includes('vendor') && <th className="w-64 border border-border px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest">Vendor</th>}
                {visibleColumns.includes('kodeRek') && <th className="w-44 border border-border px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest">Kode Rek.</th>}
                {visibleColumns.includes('subKeg') && <th className="w-44 border border-border px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest">Sub Kegiatan</th>}
                {visibleColumns.includes('qty') && <th className="w-16 border border-border px-2 py-3 text-center text-[10px] font-black uppercase tracking-widest">Qty</th>}
                {visibleColumns.includes('unit') && <th className="w-20 border border-border px-2 py-3 text-center text-[10px] font-black uppercase tracking-widest">Satuan</th>}
                {visibleColumns.includes('price') && <th className="w-40 border border-border px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest">Harga Satuan</th>}
                {visibleColumns.includes('total') && <th className="w-44 border border-border px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-800 dark:text-emerald-400">Total Harga</th>}
                <th className="w-14 border border-border px-2 py-3 text-center text-[10px] font-black uppercase tracking-widest bg-slate-300 dark:bg-slate-900">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="py-32 text-center bg-white dark:bg-card/50">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                       <TableIcon className="w-16 h-16" />
                       <p className="font-black text-xs uppercase tracking-[0.4em]">Grid Kosong</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, viewIdx) => {
                  const originalIdx = items.indexOf(item);
                  return (
                    <tr key={item.id} className="hover:bg-primary/5 group transition-colors odd:bg-slate-50/30 dark:odd:bg-white/5">
                      {visibleColumns.includes('no') && (
                        <td className="border border-border bg-slate-100/50 dark:bg-black/20 text-center font-black text-[11px] text-muted-foreground">
                          {viewIdx + 1}
                        </td>
                      )}
                      {visibleColumns.includes('date') && (
                        <td className="border border-border p-1">
                           <input 
                             className="w-full bg-transparent border-none p-2 text-[11px] font-black text-primary outline-none focus:bg-white dark:focus:bg-black/40"
                             value={item.docDate}
                             onChange={e => handleUpdateItem(originalIdx, 'docDate', e.target.value)}
                           />
                        </td>
                      )}
                      {visibleColumns.includes('docNo') && (
                        <td className="border border-border p-1">
                           <input 
                             className="w-full bg-transparent border-none p-2 text-[10px] font-bold text-muted outline-none focus:bg-white dark:focus:bg-black/40"
                             value={item.docNumber}
                             onChange={e => handleUpdateItem(originalIdx, 'docNumber', e.target.value)}
                           />
                        </td>
                      )}
                      {visibleColumns.includes('desc') && (
                        <td className="border border-border p-1 min-w-[300px]">
                            <textarea 
                             rows={2}
                             className="w-full bg-transparent border-none p-2 text-sm font-bold text-foreground outline-none focus:bg-white dark:focus:bg-black/40 resize-none"
                             value={item.description}
                             onChange={e => handleUpdateItem(originalIdx, 'description', e.target.value)}
                           />
                        </td>
                      )}
                      {visibleColumns.includes('vendor') && (
                        <td className="border border-border p-1">
                            <textarea 
                             rows={1}
                             className="w-full bg-transparent border-none p-2 text-xs font-black text-foreground/70 uppercase outline-none focus:bg-white dark:focus:bg-black/40 resize-none"
                             value={item.vendorName}
                             onChange={e => handleUpdateItem(originalIdx, 'vendorName', e.target.value)}
                           />
                        </td>
                      )}
                      {visibleColumns.includes('kodeRek') && (
                        <td className="border border-border p-1">
                           <input 
                             className="w-full bg-transparent border-none p-2 text-[10px] font-mono font-bold outline-none focus:bg-white dark:focus:bg-black/40"
                             value={item.kodeRek}
                             onChange={e => handleUpdateItem(originalIdx, 'kodeRek', e.target.value)}
                           />
                        </td>
                      )}
                      {visibleColumns.includes('subKeg') && (
                        <td className="border border-border p-1">
                           <input 
                             className="w-full bg-transparent border-none p-2 text-[10px] font-mono font-bold outline-none focus:bg-white dark:focus:bg-black/40"
                             value={item.subKegiatan}
                             onChange={e => handleUpdateItem(originalIdx, 'subKegiatan', e.target.value)}
                           />
                        </td>
                      )}
                      {visibleColumns.includes('qty') && (
                        <td className="border border-border p-0">
                           <input 
                             type="number"
                             className="w-full bg-transparent border-none p-3 text-center font-black text-sm outline-none focus:bg-white dark:focus:bg-black/40"
                             value={item.quantity}
                             onChange={e => handleUpdateItem(originalIdx, 'quantity', e.target.value)}
                           />
                        </td>
                      )}
                      {visibleColumns.includes('unit') && (
                        <td className="border border-border p-0">
                           <input 
                             className="w-full bg-transparent border-none p-3 text-center font-bold text-[10px] text-muted uppercase outline-none focus:bg-white dark:focus:bg-black/40"
                             value={item.unit}
                             onChange={e => handleUpdateItem(originalIdx, 'unit', e.target.value)}
                           />
                        </td>
                      )}
                      {visibleColumns.includes('price') && (
                        <td className="border border-border p-0">
                           <input 
                             type="number"
                             className="w-full bg-transparent border-none p-3 text-right font-mono text-xs outline-none focus:bg-white dark:focus:bg-black/40"
                             value={item.price}
                             onChange={e => handleUpdateItem(originalIdx, 'price', e.target.value)}
                           />
                        </td>
                      )}
                      {visibleColumns.includes('total') && (
                        <td className="border border-border px-4 py-3 text-right font-black text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-500/5">
                           {formatCurrency(item.total)}
                        </td>
                      )}
                      <td className="border border-border text-center bg-slate-50 dark:bg-black/20">
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
      
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-6 bg-slate-50 dark:bg-black/20 border border-border text-[10px] font-black text-muted transition-all">
         <p className="uppercase tracking-widest flex items-center gap-2">
           <Smartphone className="w-3 h-3" /> Grid Mode: Professional Excel Dashboard
         </p>
         <p className="italic opacity-60">
           Excel (.xlsx) akan mengikuti persis kolom yang Anda pilih dan urutan angka di tabel.
         </p>
      </div>
    </div>
  )
}

function Smartphone({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/>
      <path d="M12 18h.01"/>
    </svg>
  )
}
