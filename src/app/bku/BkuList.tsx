'use client'

import { useState } from "react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { Trash2, Loader2, ArrowUpDown } from "lucide-react"
import { deleteBkuRecord } from "@/app/actions/bkuActions"

export default function BkuList({ initialRecords }: { initialRecords: any[] }) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [sortDesc, setSortDesc] = useState(false) // false = Dari Awal (Earliest first), true = Terbaru

  const handleDelete = async (recordId: string) => {
    setDeletingId(recordId)
    try {
      await deleteBkuRecord(recordId)
    } finally {
      setDeletingId(null)
    }
  }

  if (initialRecords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 mt-4 border border-dashed border-white/10 rounded-xl bg-slate-900/30">
        <p className="text-slate-400 text-sm">Belum ada data BKU untuk bulan ini.</p>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)
  }

  // initialRecords is DESC (from DB orderBy createdAt: 'desc')
  const displayedRecords = sortDesc ? [...initialRecords] : [...initialRecords].reverse()

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button 
          onClick={() => setSortDesc(!sortDesc)}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium text-slate-300 transition-colors"
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
          {sortDesc ? 'Urutkan: Dari Terbaru' : 'Urutkan: Dari Awal'}
        </button>
      </div>

      <div className="overflow-x-auto max-h-[60vh] rounded-xl border border-white/10 custom-scrollbar relative">
        <table className="w-full text-left text-sm text-slate-300 relative border-collapse">
          <thead className="text-xs uppercase text-slate-400 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-4 py-3 bg-slate-900/95 border-b border-white/10 backdrop-blur-sm w-32 font-semibold">
                <div className="resize-x overflow-auto min-w-[50px] hover:border-r border-indigo-500/50 pr-2 whitespace-nowrap">Tanggal Bukti</div>
              </th>
              <th className="px-4 py-3 bg-slate-900/95 border-b border-white/10 backdrop-blur-sm font-semibold">
                <div className="resize-x overflow-auto min-w-[50px] hover:border-r border-indigo-500/50 pr-2 whitespace-nowrap">Kode Rek.</div>
              </th>
              <th className="px-4 py-3 bg-slate-900/95 border-b border-white/10 backdrop-blur-sm font-semibold">
                <div className="resize-x overflow-auto min-w-[80px] hover:border-r border-indigo-500/50 pr-2 whitespace-nowrap">Uraian</div>
              </th>
              <th className="px-4 py-3 bg-slate-900/95 border-b border-white/10 backdrop-blur-sm text-right font-semibold">
                <div className="resize-x overflow-auto min-w-[80px] hover:border-x border-indigo-500/50 px-2 whitespace-nowrap ml-auto">Penerimaan</div>
              </th>
              <th className="px-4 py-3 bg-slate-900/95 border-b border-white/10 backdrop-blur-sm text-right font-semibold">
                <div className="resize-x overflow-auto min-w-[80px] hover:border-x border-indigo-500/50 px-2 whitespace-nowrap ml-auto">Pengeluaran</div>
              </th>
              <th className="px-4 py-3 bg-slate-900/95 border-b border-white/10 backdrop-blur-sm text-right font-semibold">
                <div className="resize-x overflow-auto min-w-[80px] hover:border-x border-indigo-500/50 px-2 whitespace-nowrap ml-auto">Saldo</div>
              </th>
              <th className="px-2 py-3 bg-slate-900/95 border-b border-white/10 backdrop-blur-sm text-center font-semibold w-16">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white/5">
            {displayedRecords.map((record) => (
            <tr key={record.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
              <td className="px-4 py-3 whitespace-nowrap">
                {record.date ? (
                  <span className="text-emerald-300 font-medium">{record.date}</span>
                ) : (
                  <span className="text-slate-500 text-xs">
                    {format(new Date(record.createdAt), 'dd MMM yyyy', { locale: id })}
                  </span>
                )}
              </td>
              <td className="px-4 py-3">{record.code || '-'}</td>
              <td className="px-4 py-3 font-medium text-white whitespace-normal break-words min-w-[300px]" title={record.description}>
                {record.description}
              </td>
              <td className="px-4 py-3 text-right text-emerald-400 border-b border-white/5">
                {record.receiptTotal > 0 ? formatCurrency(record.receiptTotal) : '-'}
              </td>
              <td className="px-4 py-3 text-right text-rose-400 border-b border-white/5">
                {record.expenseTotal > 0 ? formatCurrency(record.expenseTotal) : '-'}
              </td>
              <td className="px-4 py-3 text-right text-blue-300 font-semibold border-b border-white/5">
                {formatCurrency(record.balance)}
              </td>
              <td className="px-4 py-3 text-center border-b border-white/5">
                <button 
                  onClick={() => handleDelete(record.id)}
                  disabled={deletingId === record.id}
                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors opacity-100 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingId === record.id ? (
                    <Loader2 className="w-4 h-4 text-rose-400 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
  )
}
