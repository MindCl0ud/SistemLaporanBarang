'use client'

import { useRef, useState } from "react"
import { addBkuRecord } from "@/app/actions/bkuActions"
import { Loader2 } from "lucide-react"

export default function BkuForm({ currentMonth, currentYear }: { currentMonth: number, currentYear: number }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    await addBkuRecord(formData)
    formRef.current?.reset()
    setLoading(false)
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4">
      <input type="hidden" name="month" value={currentMonth} />
      <input type="hidden" name="year" value={currentYear} />
      
      <div className="space-y-1">
        <label className="text-xs text-slate-400">Kode Rekening</label>
        <input name="code" required className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="1.2.3.4" />
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
