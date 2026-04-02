'use client'

import { useRef, useState } from "react"
import { addBkuRecord, addBkuBulk } from "@/app/actions/bkuActions"
import { Loader2, UploadCloud } from "lucide-react"

export default function BkuForm({ currentMonth, currentYear }: { currentMonth: number, currentYear: number }) {
  const [loading, setLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const formRef = useRef<HTMLFormElement>(null)

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    try {
      await addBkuRecord(formData)
      alert("Berhasil menambahkan 1 data BKU manual (Otomatis masuk ke periode yang sesuai).")
      formRef.current?.reset()
    } catch (e) {
      alert("Gagal menambahkan data.")
    } finally {
      setLoading(false)
    }
  }

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setLoading(true)
    try {
      const { read, utils } = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const wb = read(buffer, { type: 'array' })
      const parsedData = []
      
      for (const wsName of wb.SheetNames) {
        const ws = wb.Sheets[wsName]
        const dataRows = utils.sheet_to_json(ws, { header: 1 }) as any[][]
        let currentDate = ""
        
        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i]
          if (!row || row.length === 0) continue
          
          if (row[1] && String(row[1]).trim() !== "" && /^\d{2}[-/]\d{2}[-/]\d{4}/.test(String(row[1]))) {
            currentDate = String(row[1]).trim()
          }
          
          const uraian = String(row[2] || "").trim()
          const kode = String(row[3] || "").trim()
          const terima = Number(row[4] || 0)
          const keluar = Number(row[5] || 0)
          const saldo = Number(row[6] || 0)
          
          const isSaldoLalu = uraian.toLowerCase().includes("saldo bulan lalu") || uraian.toLowerCase().includes("saldo s.d bulan lalu")
          
          // Terima semua baris yang punya uraian bermakna, meski tidak ada kode/nominal
          // (contoh: "Tunjangan Keluarga", "Iuran Askes" dsb tetap harus masuk)
          const isHeaderRow = uraian.toLowerCase().includes("uraian") || uraian.toLowerCase().includes("kode rekening") || uraian.toLowerCase() === "no"
          
          if (uraian && uraian.length >= 2 && !isSaldoLalu && !isHeaderRow) {
            // Extract month and year from currentDate
            let itemMonth = currentMonth
            let itemYear = currentYear
            
            if (currentDate.includes('-') || currentDate.includes('/')) {
              const separator = currentDate.includes('-') ? '-' : '/'
              const parts = currentDate.split(separator)
              if (parts.length === 3) {
                const m = parseInt(parts[1], 10)
                const y = parseInt(parts[2], 10)
                if (!isNaN(m)) itemMonth = m
                if (!isNaN(y)) itemYear = y
              }
            }

            parsedData.push({
              date: currentDate,
              month: itemMonth,
              year: itemYear,
              code: kode,
              description: uraian,
              receiptTotal: terima,
              expenseTotal: keluar,
              balance: saldo
            })
          }
        }
      }
      
      if (parsedData.length > 0) {
        setIsUploading(true)
        setUploadProgress(0)
        
        const chunkSize = 50
        let addedTotal = 0
        
        for (let i = 0; i < parsedData.length; i += chunkSize) {
          const chunk = parsedData.slice(i, i + chunkSize)
          const addedCount = await addBkuBulk(chunk, 0, 0)
          addedTotal += addedCount
          
          const progress = Math.min(100, Math.round(((i + chunk.length) / parsedData.length) * 100))
          setUploadProgress(progress)
        }
        
        alert(`Berhasil mengimpor ${addedTotal} data dari ${parsedData.length} baris.`)
      } else {
        alert("Tidak ada baris data valid ditemukan di file Excel.")
      }
    } catch (error) {
      console.error(error)
      alert("Gagal membaca file Excel.")
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      setLoading(false)
      if (e.target) e.target.value = ''
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="h-full flex flex-col space-y-5">
      <input type="hidden" name="month" value={currentMonth} />
      <input type="hidden" name="year" value={currentYear} />
      
      <div className="flex flex-col gap-2 mb-4">
        <label className={`w-full py-2.5 bg-input border border-border text-primary hover:bg-accent rounded-xl text-sm font-bold transition-colors flex justify-center items-center gap-2 cursor-pointer ${(loading || isUploading) ? 'opacity-50 cursor-not-allowed' : ''}`}>
          {(loading || isUploading) ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
          {isUploading ? `Mengunggah... (${uploadProgress}%)` : loading ? 'Memproses Excel...' : 'Impor dari Excel (.xlsx)'}
          <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleExcelUpload} disabled={loading || isUploading} />
        </label>

        {isUploading && (
          <div className="mt-2 space-y-1.5">
            <div className="w-full h-1.5 bg-input rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-foreground/50 text-center uppercase tracking-widest font-bold">Proses Unggah: {uploadProgress}%</p>
          </div>
        )}
        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-border"></div>
          <span className="flex-shrink-0 mx-4 text-muted text-[10px] font-bold uppercase tracking-widest">atau isi manual</span>
          <div className="flex-grow border-t border-border"></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-foreground/60 uppercase">Tanggal</label>
          <input name="date" type="text" className="w-full bg-input border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary transition-all font-mono" placeholder="01-01-2026" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-foreground/60 uppercase">Kode Rekening</label>
          <input name="code" required className="w-full bg-input border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary transition-all font-mono" placeholder="1.2.3.4" />
        </div>
      </div>

      <div className="space-y-1 flex-1 flex flex-col min-h-[150px]">
        <label className="text-[10px] font-bold text-foreground/60 uppercase">Uraian / Deskripsi</label>
        <textarea 
          name="description" 
          required 
          className="w-full flex-1 bg-input border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none" 
          placeholder="Belanja Makan Minum Rapat..." 
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-foreground/60 uppercase">Penerimaan (Rp)</label>
          <input name="receiptTotal" type="number" className="w-full bg-emerald-500/10 border border-emerald-500/20 dark:border-emerald-500/30 rounded-xl px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all" placeholder="0" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-foreground/60 uppercase">Pengeluaran (Rp)</label>
          <input name="expenseTotal" type="number" className="w-full bg-rose-500/10 border border-rose-500/20 dark:border-rose-500/30 rounded-xl px-3 py-2 text-sm text-rose-700 dark:text-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all" placeholder="0" />
        </div>
      </div>

      <button type="submit" disabled={loading} className="w-full py-4 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-2xl text-sm font-black uppercase tracking-widest transition-all hover:scale-[1.01] active:scale-95 flex justify-center items-center gap-2 shadow-xl shadow-primary/20 mt-auto">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan Data BKU"}
      </button>
    </form>
  )
}
