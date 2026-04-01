'use client'

import { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { 
  Download, 
  Search, 
  Table as TableIcon,
  Filter,
  FileSpreadsheet
} from 'lucide-react'

export default function DocumentItemsReport({ documents }: { documents: any[] }) {
  const [search, setSearch] = useState('')

  // Flatten all items from all documents
  const allItems = useMemo(() => {
    return documents.flatMap(doc => (doc.items || []).map((item: any) => ({
      ...item,
      docNumber: doc.docNumber,
      vendorName: doc.vendorName,
      docDate: doc.date ? new Date(doc.date).toLocaleDateString('id-ID') : '-',
      kodeRek: doc.kodeRek,
      subKegiatan: doc.subKegiatan,
      extractedFrom: doc.docNumber || doc.id
    })))
  }, [documents])

  const filteredItems = useMemo(() => {
    return allItems.filter(item => 
      item.description?.toLowerCase().includes(search.toLowerCase()) ||
      item.vendorName?.toLowerCase().includes(search.toLowerCase()) ||
      item.docNumber?.toLowerCase().includes(search.toLowerCase())
    )
  }, [allItems, search])

  const handleExport = () => {
    const dataToExport = filteredItems.map(item => ({
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Detail Barang")
    
    // Auto-size columns (Simple)
    const maxWidth = 30;
    worksheet['!cols'] = dataToExport.length > 0 ? Object.keys(dataToExport[0]).map(() => ({ wch: maxWidth })) : [];

    XLSX.writeFile(workbook, `Laporan_Detail_Item_BKU_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
          <h2 className="text-xl font-black text-foreground tracking-tight">Laporan Detail Item (Aggregated)</h2>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80 h-11">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input 
              className="w-full h-full bg-slate-50 dark:bg-input border border-border rounded-xl pl-11 pr-4 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              placeholder="Cari item, vendor, atau no. dokumen..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" />
            Eksport ke Excel
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="border border-border rounded-2xl overflow-hidden bg-card">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-input/50">
                <th className="px-4 py-4 text-left text-[10px] uppercase font-black tracking-widest text-muted border-b border-border">Tgl Dokumen</th>
                <th className="px-4 py-4 text-left text-[10px] uppercase font-black tracking-widest text-muted border-b border-border">Unit / Nama Barang</th>
                <th className="px-4 py-4 text-left text-[10px] uppercase font-black tracking-widest text-muted border-b border-border">Vendor</th>
                <th className="px-4 py-4 text-center text-[10px] uppercase font-black tracking-widest text-muted border-b border-border">Qty</th>
                <th className="px-4 py-4 text-center text-[10px] uppercase font-black tracking-widest text-muted border-b border-border">Satuan</th>
                <th className="px-4 py-4 text-right text-[10px] uppercase font-black tracking-widest text-muted border-b border-border">Harga Satuan</th>
                <th className="px-4 py-4 text-right text-[10px] uppercase font-black tracking-widest text-muted border-b border-border">Total Harga</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center">
                    <TableIcon className="w-12 h-12 text-muted opacity-20 mx-auto mb-4" />
                    <p className="text-xs font-black text-muted uppercase tracking-[0.3em]">Data Item Tidak Ditemukan</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-emerald-500/5 transition-colors border-b border-border last:border-0">
                    <td className="px-4 py-4 text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                      {item.docDate}
                      <p className="text-[9px] text-muted-foreground font-mono mt-0.5">{item.docNumber}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-bold text-foreground leading-tight">{item.description}</div>
                      <div className="text-[9px] text-muted-foreground font-mono mt-1 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-input w-fit border border-border">KODE: {item.itemCode || '-'}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-black text-xs text-foreground/80 uppercase truncate max-w-[200px]" title={item.vendorName}>{item.vendorName}</div>
                    </td>
                    <td className="px-4 py-4 text-center font-black">{item.quantity}</td>
                    <td className="px-4 py-4 text-center text-xs text-muted uppercase font-black">{item.unit || '-'}</td>
                    <td className="px-4 py-4 text-right font-mono text-xs">{formatCurrency(item.price)}</td>
                    <td className="px-4 py-4 text-right font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
