'use client'

import React, { useState } from "react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { Trash2, FileText, Bot, Loader2 } from "lucide-react"
import { deleteDocument } from "@/app/actions/documentActions"

export default function DocumentList({ initialDocuments }: { initialDocuments: any[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (docId: string) => {
    setDeletingId(docId)
    try {
      await deleteDocument(docId)
    } finally {
      setDeletingId(null)
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

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
      <table className="w-full text-left text-sm text-slate-300 border-separate border-spacing-0">
        <thead className="bg-white/5 text-xs uppercase text-slate-400">
          <tr>
            <th className="px-4 py-3 rounded-tl-xl w-10">AI</th>
            <th className="px-4 py-3">Tanggal & Kode Rek</th>
            <th className="px-4 py-3">Tipe & Vendor</th>
            <th className="px-4 py-3 text-right">Total</th>
            <th className="px-4 py-3 text-center">Status BKU</th>
            <th className="px-4 py-3 text-center rounded-tr-xl w-24">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {initialDocuments.map((doc) => (
            <React.Fragment key={doc.id}>
              <tr className={`hover:bg-white/5 transition-colors group cursor-pointer ${expandedId === doc.id ? 'bg-white/5' : ''}`} onClick={() => toggleExpand(doc.id)}>
                <td className="px-4 py-4 align-top">
                  <Bot className={`w-4 h-4 ${doc.matchRecord ? 'text-emerald-400' : 'text-indigo-400'}`} />
                </td>
                <td className="px-4 py-4 align-top">
                   <div className="text-xs text-slate-500 mb-1">
                     {doc.date ? format(new Date(doc.date), 'dd MMM yyyy', { locale: id }) : format(new Date(doc.createdAt), 'dd MMM yyyy', { locale: id })}
                   </div>
                   <div className="font-mono text-[10px] text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 w-fit">
                     {doc.kodeRek || "-"}
                     {doc.subKegiatan && <span className="text-white font-bold">.{doc.subKegiatan}</span>}
                   </div>
                </td>
                <td className="px-4 py-4 align-top">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">{doc.type}</span>
                  </div>
                  <div className="text-white font-medium truncate max-w-[180px]">{doc.vendorName}</div>
                </td>
                <td className="px-4 py-4 text-right align-top text-white font-bold">
                  {formatCurrency(doc.totalAmount)}
                </td>
                <td className="px-4 py-4 text-center align-top">
                  {doc.matchRecord ? (
                    <span className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                      TERCOCOKKAN
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-full bg-slate-500/20 text-slate-500 text-[10px] font-bold border border-white/5">
                      BELUM COCOK
                    </span>
                  )}
                </td>
                <td className="px-4 py-4 text-center align-top">
                  <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => toggleExpand(doc.id)}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(doc.id)}
                      disabled={deletingId === doc.id}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {deletingId === doc.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
              {expandedId === doc.id && (
                <tr className="bg-black/40 animate-in fade-in slide-in-from-top-1">
                  <td colSpan={6} className="px-8 py-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div>
                         <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Rincian Item (Extracted)</h4>
                         <div className="space-y-2">
                           {doc.items && doc.items.length > 0 ? (
                             doc.items.map((item: any, idx: number) => (
                               <div key={idx} className="flex justify-between items-center p-2 rounded bg-white/5 border border-white/5 text-xs">
                                 <div>
                                   <p className="text-white font-medium">{item.description}</p>
                                   <p className="text-slate-500">{item.quantity} x {formatCurrency(item.price)}</p>
                                 </div>
                                 <div className="text-indigo-400 font-bold">{formatCurrency(item.total)}</div>
                               </div>
                             ))
                           ) : (
                             <p className="text-slate-500 text-xs italic">Tidak ada rincian item terdeteksi.</p>
                           )}
                         </div>
                       </div>
                       
                       <div className="space-y-4">
                         {doc.matchRecord && (
                           <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                             <h4 className="text-xs font-bold text-emerald-400 uppercase mb-2">Info Pencocokan BKU</h4>
                             <p className="text-xs text-emerald-200/80 mb-3">{doc.matchRecord.reasoning}</p>
                             <div className="text-[10px] text-emerald-400/60 uppercase font-bold">BKU Link:</div>
                             <div className="text-xs text-emerald-100 font-mono mt-0.5">
                               ID: {doc.matchRecord.bkuTransactionId.slice(0,8)}...
                             </div>
                           </div>
                         )}
                         <div className="p-4 rounded-xl bg-slate-800/50 border border-white/5">
                            <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Raw Text Snippet</h4>
                           <pre className="text-[10px] text-slate-500 whitespace-pre-wrap max-h-40 overflow-y-auto font-mono leading-relaxed">
                             {doc.extractedText?.slice(0, 1000)}...
                           </pre>
                         </div>
                       </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
