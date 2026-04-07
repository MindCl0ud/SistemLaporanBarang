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
      // Notify components to re-fetch
      window.dispatchEvent(new CustomEvent('bku-data-changed'))
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
        
        // --- DETEKSI KOLOM DINAMIS ---
        let colIdx = {
          no: 0,
          tanggal: 1,
          uraian: 2,
          kode: 3,
          terima: 4,
          keluar: 5,
          saldo: 6
        }

        // Scan 20 baris pertama untuk mencari header asli
        for (let j = 0; j < Math.min(dataRows.length, 20); j++) {
          const r = dataRows[j]
          if (!r) continue
          r.forEach((cell, idx) => {
            const val = String(cell || "").toLowerCase()
            if (val.includes("uraian") || val.includes("kegiatan")) colIdx.uraian = idx
            if (val.includes("kode") || val.includes("rekening")) colIdx.kode = idx
            if (val.includes("penerimaan")) colIdx.terima = idx
            if (val.includes("pengeluaran")) colIdx.keluar = idx
            if (val.includes("saldo")) colIdx.saldo = idx
            if (val.includes("tanggal")) colIdx.tanggal = idx
            if (val.includes("no")) colIdx.no = idx
          })
          // Jika sudah menemukan Uraian dan Penerimaan, kita anggap sudah ketemu baris headernya
          if (r.some(c => String(c || "").toLowerCase().includes("uraian")) && 
              r.some(c => String(c || "").toLowerCase().includes("penerimaan"))) {
            // baris j adalah baris header, lewati baris ini di loop utama
          }
        }

        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i]
          if (!row || row.length === 0) continue
          
          const uraian = String(row[colIdx.uraian] || "").trim()
          const kode = String(row[colIdx.kode] || "").trim()
          
          // --- Robust Number Parsing ---
          const cleanNumber = (val: any): number => {
            if (val === undefined || val === null || val === "") return 0
            if (typeof val === 'number') return val
            const cleaned = String(val).replace(/,/g, ".").replace(/[^\d.-]/g, "")
            const num = parseFloat(cleaned)
            return isNaN(num) ? 0 : num
          }

          const terima = cleanNumber(row[colIdx.terima])
          const keluar = cleanNumber(row[colIdx.keluar])
          const saldo = cleanNumber(row[colIdx.saldo])
          
          // --- Robust Date Parsing ---
          let rowDate = ""
          const rawDate = row[colIdx.tanggal]
          if (rawDate) {
            if (rawDate instanceof Date || (typeof rawDate === 'object' && rawDate.getTime)) {
               const d = rawDate as Date
               rowDate = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
            } else if (typeof rawDate === 'number' && rawDate > 40000) {
               const d = new Date((rawDate - 25569) * 86400 * 1000)
               rowDate = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
            } else {
               const s = String(rawDate).trim()
               if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(s)) {
                  rowDate = s
               }
            }
          }

          if (rowDate !== "") {
            currentDate = rowDate
          }
          
          const isSaldoLalu = uraian.toLowerCase().includes("saldo bulan lalu") || uraian.toLowerCase().includes("saldo s.d bulan lalu")
          
          // Filter Header: Jangan impor baris judul atau baris angka pembantu (1, 2, 3...)
          const isHeaderRow = 
            uraian.toLowerCase().includes("uraian") || 
            uraian.toLowerCase().includes("kode rekening") || 
            (uraian.toLowerCase() === "no" && !terima && !keluar) ||
            (/^\d+$/.test(uraian) && uraian.length === 1) // Ini membuang baris header angka '3'

          // KRITERIA PENERIMAAN: Ada Uraian ATAU Ada Kode ATAU Ada Nilai Rupiah
          const hasContent = (uraian && uraian.length >= 2 && !/^\d+$/.test(uraian)) || (kode && kode.length >= 3) || (terima !== 0 || keluar !== 0)

          if (hasContent && !isSaldoLalu && !isHeaderRow) {
            const sheetOffset = wb.SheetNames.indexOf(wsName) * 100000 
            const finalRowOrder = sheetOffset + i

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
              balance: saldo,
              rowOrder: finalRowOrder
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
        // Notify components to re-fetch
        window.dispatchEvent(new CustomEvent('bku-data-changed'))
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
