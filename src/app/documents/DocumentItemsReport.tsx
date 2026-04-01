'use client'

import { useState, useMemo, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { 
  Download, 
  Search, 
  Plus,
  Trash2,
  Table as TableIcon
} from 'lucide-react'

export default function DocumentItemsReport({ documents }: { documents: any[] }) {
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<any[]>([])

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

  const handleUpdateItem = (idx: number, key: string, value: any) => {
    setItems(prev => {
      const newItems = [...prev]
      newItems[idx] = { ...newItems[idx], [key]: value }
      
      // Auto-calculate total if price or quantity changes
      if (key === 'price' || key === 'quantity') {
        const p = key === 'price' ? Number(value) : Number(newItems[idx].price)
        const q = key === 'quantity' ? Number(value) : Number(newItems[idx].quantity)
        newItems[idx].total = p * q
      }
      
      return newItems
    })
  }

  const handleDeleteItem = (idx: number) => {
    if (!confirm('Hapus baris ini dari laporan?')) return
    setItems(prev => prev.filter((_, i) => i !== idx))
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
    setItems(prev => [newItem, ...prev])
  }

  const handleExport = () => {
    const dataToExport = filteredItems.map((item, idx) => ({
      'No.': idx + 1,
      'Tanggal Dokumen': item.docDate,
      'No. Dokumen': item.docNumber,
      'Vendor/Penyedia': item.vendorName,
      'Kode Rekening': item.kodeRek,
      'Sub Kegiatan': item.subKegiatan,
      'Kode Barang': item.itemCode || '-',
      'Uraian / Deskripsi': item.description,
      'Qty': item.quantity,
      'Satuan': item.unit,
      'Harga Satuan': item.price,
      'Total Harga': item.total
    }))

    const worksheet = XLSX.utils.json_to_sheet(dataToExport)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Detail")
    
    XLSX.writeFile(workbook, `Laporan_Kustom_BKU_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
          <h2 className="text-xl font-black text-foreground tracking-tight">Report Builder (Kustom Laporan)</h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[300px] h-11">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input 
              className="w-full h-full bg-slate-50 dark:bg-input border border-border rounded-xl pl-11 pr-4 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="Cari data..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={handleAddRow}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-xs font-black shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> Tambah Baris
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/20 active:scale-105 transition-all"
          >
            <Download className="w-4 h-4" /> Ekspor Excel
          </button>
        </div>
      </div>

      <div className="border border-border rounded-[2.5rem] overflow-hidden bg-white dark:bg-card shadow-2xl shadow-indigo-500/5">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm border-collapse min-w-[1400px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-input/50">
                <th className="px-5 py-5 text-center text-[10px] uppercase font-black text-muted w-12 border-b border-border">No.</th>
                <th className="px-4 py-5 text-left text-[10px] uppercase font-black text-muted w-32 border-b border-border">Tanggal</th>
                <th className="px-4 py-5 text-left text-[10px] uppercase font-black text-muted w-64 border-b border-border">Uraian / Deskripsi Barang</th>
                <th className="px-4 py-5 text-left text-[10px] uppercase font-black text-muted w-48 border-b border-border">Vendor / Penyedia</th>
                <th className="px-2 py-5 text-center text-[10px] uppercase font-black text-muted w-16 border-b border-border">Qty</th>
                <th className="px-2 py-5 text-center text-[10px] uppercase font-black text-muted w-20 border-b border-border">Satuan</th>
                <th className="px-4 py-5 text-right text-[10px] uppercase font-black text-muted w-40 border-b border-border">Harga Satuan</th>
                <th className="px-4 py-5 text-right text-[10px] uppercase font-black text-muted w-40 border-b border-border">Total Harga</th>
                <th className="px-4 py-5 text-center text-[10px] uppercase font-black text-muted w-14 border-b border-border">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-8 py-20 text-center">
                    <TableIcon className="w-12 h-12 text-muted opacity-20 mx-auto mb-4" />
                    <p className="text-xs font-black text-muted uppercase tracking-[0.3em]">Belum Ada Data Untuk Laporan</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-primary/5 transition-colors border-b border-border last:border-0 group">
                    <td className="px-5 py-4 text-center font-black text-[11px] text-muted-foreground bg-slate-50/50 dark:bg-black/10">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-4">
                      <input 
                        className="w-full bg-transparent border-none p-0 text-[11px] font-black text-emerald-600 dark:text-emerald-400 outline-none focus:ring-1 focus:ring-primary rounded"
                        value={item.docDate}
                        onChange={e => handleUpdateItem(items.indexOf(item), 'docDate', e.target.value)}
                      />
                      <p className="text-[9px] text-muted-foreground font-mono mt-0.5 opacity-50 uppercase tracking-tighter">{item.docNumber}</p>
                    </td>
                    <td className="px-4 py-4">
                       <textarea 
                         rows={2}
                         className="w-full bg-transparent border-none p-0 text-sm font-bold text-foreground outline-none focus:ring-1 focus:ring-primary rounded resize-none"
                         value={item.description}
                         onChange={e => handleUpdateItem(items.indexOf(item), 'description', e.target.value)}
                       />
                       <div className="flex items-center gap-1 mt-1 opacity-50">
                         <span className="text-[8px] font-black uppercase text-muted">KODE:</span>
                         <input 
                           className="bg-transparent border-none p-0 text-[9px] font-mono outline-none w-20"
                           value={item.itemCode || '-'}
                           onChange={e => handleUpdateItem(items.indexOf(item), 'itemCode', e.target.value)}
                         />
                       </div>
                    </td>
                    <td className="px-4 py-4">
                      <textarea 
                         rows={1}
                         className="w-full bg-transparent border-none p-0 text-xs font-black text-foreground/80 uppercase outline-none focus:ring-1 focus:ring-primary rounded scrollbar-hide"
                         value={item.vendorName}
                         onChange={e => handleUpdateItem(items.indexOf(item), 'vendorName', e.target.value)}
                       />
                    </td>
                    <td className="px-2 py-4">
                      <input 
                        type="number"
                        className="w-full bg-transparent border-none p-0 text-center font-black text-sm outline-none focus:ring-1 focus:ring-primary rounded"
                        value={item.quantity}
                        onChange={e => handleUpdateItem(items.indexOf(item), 'quantity', e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-4">
                      <input 
                        className="w-full bg-transparent border-none p-0 text-center font-black text-[10px] text-muted uppercase outline-none focus:ring-1 focus:ring-primary rounded"
                        value={item.unit}
                        onChange={e => handleUpdateItem(items.indexOf(item), 'unit', e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <input 
                        type="number"
                        className="w-full bg-transparent border-none p-0 text-right font-mono text-xs outline-none focus:ring-1 focus:ring-primary rounded"
                        value={item.price}
                        onChange={e => handleUpdateItem(items.indexOf(item), 'price', e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-4 text-right font-black text-emerald-600 dark:text-emerald-400 font-mono">
                       {formatCurrency(item.total)}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button 
                        onClick={() => handleDeleteItem(items.indexOf(item))}
                        className="p-2 text-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <p className="text-[10px] font-bold text-muted-foreground uppercase text-center italic opacity-60">
        Tips: Klik pada teks di dalam tabel untuk mengedit langsung. Perubahan hanya berlaku untuk sesi laporan ini.
      </p>
    </div>
  )
}
