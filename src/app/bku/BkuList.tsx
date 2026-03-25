'use client'

import { format } from "date-fns"
import { id } from "date-fns/locale"
import { Trash2 } from "lucide-react"
import { deleteBkuRecord } from "@/app/actions/bkuActions"

export default function BkuList({ initialRecords }: { initialRecords: any[] }) {
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
            <th className="px-4 py-3 rounded-tl-xl">Tanggal Input</th>
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
                {format(new Date(record.createdAt), 'dd MMM yyyy', { locale: id })}
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
                  onClick={() => deleteBkuRecord(record.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
