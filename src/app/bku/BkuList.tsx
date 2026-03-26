'use client'

import { useState } from "react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { Trash2, Loader2 } from "lucide-react"
import { deleteBkuRecord } from "@/app/actions/bkuActions"

export default function BkuList({ initialRecords }: { initialRecords: any[] }) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

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

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-300">
        <thead className="bg-white/5 text-xs uppercase text-slate-400">
          <tr>
            <th className="px-4 py-3 rounded-tl-xl w-32">Tanggal Bukti</th>
            <th className="px-4 py-3">Kode Rek.</th>
            <th className="px-4 py-3">Uraian</th>
            <th className="px-4 py-3 text-right">Penerimaan</th>
            <th className="px-4 py-3 text-right">Pengeluaran</th>
            <th className="px-4 py-3 text-center rounded-tr-xl">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {initialRecords.map((record) => (
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
              <td className="px-4 py-3 font-medium text-white max-w-[200px] truncate" title={record.description}>
                {record.description}
              </td>
              <td className="px-4 py-3 text-right text-emerald-400">
                {record.receiptTotal > 0 ? formatCurrency(record.receiptTotal) : '-'}
              </td>
              <td className="px-4 py-3 text-right text-rose-400">
                {record.expenseTotal > 0 ? formatCurrency(record.expenseTotal) : '-'}
              </td>
              <td className="px-4 py-3 text-center">
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
  )
}
