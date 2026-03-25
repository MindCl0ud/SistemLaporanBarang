'use client'

import { format } from "date-fns"
import { id } from "date-fns/locale"
import { Trash2, FileText, Bot } from "lucide-react"
import { deleteDocument } from "@/app/actions/documentActions"

export default function DocumentList({ initialDocuments }: { initialDocuments: any[] }) {
  if (initialDocuments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 mt-4 border border-dashed border-white/10 rounded-xl bg-slate-900/30">
        <p className="text-slate-400 text-sm">Belum ada dokumen yang diproses AI.</p>
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
            <th className="px-4 py-3 rounded-tl-xl w-10">AI</th>
            <th className="px-4 py-3">Tanggal Upload</th>
            <th className="px-4 py-3">Tipe</th>
            <th className="px-4 py-3">Vendor/Toko</th>
            <th className="px-4 py-3 text-right">Total Anggaran</th>
            <th className="px-4 py-3 text-center rounded-tr-xl">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {initialDocuments.map((doc) => (
            <tr key={doc.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
              <td className="px-4 py-3" title="Diekstrak oleh AI">
                <Bot className="w-4 h-4 text-emerald-400" />
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {format(new Date(doc.createdAt), 'dd MMM yyyy, HH:mm', { locale: id })}
              </td>
              <td className="px-4 py-3 font-medium">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs">
                  <FileText className="w-3 h-3 text-indigo-400" />
                  {doc.type}
                </span>
              </td>
              <td className="px-4 py-3 truncate max-w-[200px]">{doc.vendorName}</td>
              <td className="px-4 py-3 text-right text-white font-medium">
                {formatCurrency(doc.totalAmount)}
              </td>
              <td className="px-4 py-3 text-center">
                <button 
                  onClick={() => deleteDocument(doc.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
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
