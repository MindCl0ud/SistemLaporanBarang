'use client'

import { useRef, useState } from "react"
import { addBkuRecord, addBkuBulk } from "@/app/actions/bkuActions"
import { Loader2, UploadCloud } from "lucide-react"

export default function BkuForm({ currentMonth, currentYear }: { currentMonth: number, currentYear: number }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    await addBkuRecord(formData)
    formRef.current?.reset()
    setLoading(false)
  }

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setLoading(true)
    try {
      const { read, utils } = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const wb = read(buffer, { type: 'array' })
      const wsName = wb.SheetNames[0]
      const ws = wb.Sheets[wsName]
      const dataRows = utils.sheet_to_json(ws, { header: 1 }) as any[][]
      
      const parsedData = []
      let currentDate = ""
      
      for (let i = 6; i < dataRows.length; i++) {
        const row = dataRows[i]
        if (!row || row.length === 0) continue
        
        if (row[1] && String(row[1]).trim() !== "") {
          currentDate = String(row[1]).trim()
        }
        
        const uraian = String(row[2] || "").trim()
        const kode = String(row[3] || "").trim()
        const terima = Number(row[4] || 0)
        const keluar = Number(row[5] || 0)
        const saldo = Number(row[6] || 0)
        
        if (uraian && (kode || terima > 0 || keluar > 0) && !uraian.toLowerCase().includes("saldo bulan lalu")) {
          parsedData.push({
            date: currentDate,
            code: kode,
            description: uraian,
            receiptTotal: terima,
            expenseTotal: keluar,
            balance: saldo
          })
        }
      }
      
      if (parsedData.length > 0) {
        const addedCount = await addBkuBulk(parsedData, currentMonth, currentYear)
        alert(`Berhasil mengimpor ${addedCount} data baru (Data dobel otomatis dilewati).`)
      } else {
        alert("Tidak ada baris data valid ditemukan di file Excel.")
      }
    } catch (error) {
      console.error(error)
      alert("Gagal membaca file Excel.")
    } finally {
      setLoading(false)
      // reset file input
      e.target.value = ''
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4">
      <input type="hidden" name="month" value={currentMonth} />
      <input type="hidden" name="year" value={currentYear} />
      
      <div className="flex flex-col gap-2 mb-4">
        <label className="w-full py-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-200 rounded-xl text-sm font-medium transition-colors flex justify-center items-center gap-2 cursor-pointer cursor-allowed">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
          {loading ? 'Memproses Excel...' : 'Impor dari Excel (.xlsx)'}
          <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleExcelUpload} disabled={loading} />
        </label>
        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-white/10"></div>
          <span className="flex-shrink-0 mx-4 text-slate-500 text-xs uppercase">atau isi manual</span>
          <div className="flex-grow border-t border-white/10"></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Tanggal</label>
          <input name="date" type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="01-01-2026" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Kode Rekening</label>
          <input name="code" required className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="1.2.3.4" />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-slate-400">Uraian / Deskripsi</label>
        <textarea name="description" required rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="Belanja Makan Minum Rapat..." />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Penerimaan (Rp)</label>
          <input name="receiptTotal" type="number" className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-3 py-2 text-sm text-emerald-100 focus:outline-none focus:border-emerald-500 transition-colors" placeholder="0" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Pengeluaran (Rp)</label>
          <input name="expenseTotal" type="number" className="w-full bg-rose-500/5 border border-rose-500/20 rounded-xl px-3 py-2 text-sm text-rose-100 focus:outline-none focus:border-rose-500 transition-colors" placeholder="0" />
        </div>
      </div>

      <button type="submit" disabled={loading} className="w-full mt-4 py-2.5 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors flex justify-center items-center gap-2 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan Data"}
      </button>
    </form>
  )
}
