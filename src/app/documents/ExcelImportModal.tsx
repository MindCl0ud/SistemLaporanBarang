'use client'

import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, FileSpreadsheet, Download, Loader2, CheckCircle2, UploadCloud } from 'lucide-react'
import * as XLSX from 'xlsx'
import { batchImportDocuments } from '@/app/actions/documentActions'

interface ExcelImportModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function ExcelImportModal({ onClose, onSuccess }: ExcelImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<{ docs: number, items: number, rows: any[] } | null>(null)
  const [status, setStatus] = useState<'idle' | 'parsing' | 'ready' | 'importing' | 'success'>('idle')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    parseFile(f)
  }

  const parseFile = (file: File) => {
    setStatus('parsing')
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = e.target?.result
      const workbook = XLSX.read(data, { type: 'binary', cellDates: true })
      const firstSheet = workbook.SheetNames[0]
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet])

      // Mapping logic
      const mappedRows = rows.map((row: any) => ({
        type: row.Tipe || row.Type,
        date: row.Tanggal || row.Date,
        docNumber: row.No_Dokumen || row.Doc_No,
        baNumber: row.No_BA || row.BA_No,
        baDate: row.Tgl_BA || row.BA_Date,
        vendorName: row.Vendor || row.Vendor_Name,
        kodeRek: row.Kode_Rek || row.Account_Code,
        subKegiatan: row.Sub_Kegiatan || row.Sub_Activity,
        paymentFor: row.Uraian_Pembayaran || row.Payment_For,
        unit: row.Satuan_Global || row.Global_Unit,
        division: row.Bidang || row.Division,
        itemDescription: row.Item_Deskripsi || row.Description,
        itemCode: row.Item_Kode || row.Item_Code,
        itemQty: row.Item_Qty || row.Qty,
        itemUnit: row.Item_Satuan || row.Item_Unit,
        itemPrice: row.Item_Harga || row.Price,
      }))

      // Preliminary count
      const groups = new Set()
      mappedRows.forEach(r => {
        groups.add(`${r.docNumber}_${r.vendorName}_${r.date}`)
      })

      setPreview({
        docs: groups.size,
        items: mappedRows.length,
        rows: mappedRows
      })
      setStatus('ready')
    }
    reader.readAsBinaryString(file)
  }

  const handleImport = async () => {
    if (!preview) return
    setLoading(true)
    setStatus('importing')
    const result = await batchImportDocuments(preview.rows)
    setLoading(false)
    if (result.success) {
      setStatus('success')
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 2000)
    } else {
      alert(`Gagal Impor: ${result.error}`)
      setStatus('ready')
    }
  }

  const downloadTemplate = () => {
    const headers = [[
      'Tipe', 'Tanggal', 'No_Dokumen', 'No_BA', 'Tgl_BA', 'Vendor', 
      'Kode_Rek', 'Sub_Kegiatan', 'Uraian_Pembayaran', 'Satuan_Global', 'Bidang',
      'Item_Deskripsi', 'Item_Kode', 'Item_Qty', 'Item_Satuan', 'Item_Harga'
    ]]
    const example = [[
      'Kwitansi', '2024-03-20', 'KW-001', 'BA-001', '2024-03-21', 'PT. Maju Mundur',
      '5.01.01.01', 'Belanja Habis Pakai', 'Belanja ATK Kantor', 'Paket', 'Bina Marga',
      'Kertas A4', 'ART-001', 10, 'rim', 55000
    ]]
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...example])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Template")
    XLSX.writeFile(wb, "Template_Impor_Dokumen.xlsx")
  }

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card border border-border w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-input/50">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
            Impor Data (.xlsx)
          </h2>
          <button onClick={onClose} className="p-1 text-slate-500 hover:text-foreground">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          {status === 'success' ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in-95">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Impor Berhasil!</h3>
                <p className="text-sm text-muted">Halaman akan segera dimuat ulang...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Template Section */}
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Butuh Panduan?</h4>
                  <p className="text-xs text-muted-foreground leading-tight">Gunakan template resmi agar kolom data terbaca dengan benar.</p>
                </div>
                <button 
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-border text-[10px] font-black uppercase tracking-wider text-foreground hover:bg-slate-50 rounded-lg shrink-0 transition-all shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" /> Template
                </button>
              </div>

              {/* Upload Dropzone */}
              <div 
                className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-all ${
                  status === 'ready' ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-border hover:border-primary/50'
                }`}
              >
                <input 
                  type="file" 
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                
                {status === 'parsing' ? (
                  <div className="flex flex-col items-center animate-pulse">
                    <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
                    <p className="text-sm font-bold text-foreground">Menganalisis File...</p>
                  </div>
                ) : status === 'ready' && preview ? (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center text-white mb-4 shadow-lg shadow-emerald-500/20">
                      <FileSpreadsheet className="w-7 h-7" />
                    </div>
                    <h4 className="text-sm font-black text-foreground mb-1">{file?.name}</h4>
                    <div className="flex items-center gap-2">
                       <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-600 rounded text-[10px] font-black">{preview.docs} DOKUMEN</span>
                       <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-600 rounded text-[10px] font-black">{preview.items} ITEM</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 mb-4 transition-all group-hover:scale-110">
                      <UploadCloud className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Pilih File Excel</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Hanya mendukung format .xlsx</p>
                    </div>
                  </>
                )}
              </div>

              {/* Action */}
              <div className="flex flex-col gap-3">
                 <button
                   onClick={handleImport}
                   disabled={status !== 'ready' || loading}
                   className="w-full py-4 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                 >
                   {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                   {loading ? 'Sedang Mengimpor...' : 'Konfirmasi Impor'}
                 </button>
                 <button 
                   onClick={onClose}
                   className="w-full py-3 text-xs font-black text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors"
                 >
                   Batalkan
                 </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
