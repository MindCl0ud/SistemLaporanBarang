'use client'

import React, { useState, useRef, useCallback, useEffect } from "react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { Trash2, Bot, Loader2, WrapText, AlignJustify, ChevronDown, ChevronRight, CheckCircle2, Circle, GripVertical, Pencil, Check, X } from "lucide-react"
import { deleteDocument, updateDocumentItem } from "@/app/actions/documentActions"

// ──────────────────────────────────────────────────────────
// Column definitions
// ──────────────────────────────────────────────────────────
const DEFAULT_WIDTHS: Record<string, number> = {
  no: 55,
  status: 100,
  tanggal: 110,
  docNumber: 180, // New Column
  kodeRek: 160,
  subKegiatan: 160,
  tipe: 110,
  vendor: 220,
  total: 130,
  items: 380,
  aksi: 72,
}

const COL_KEYS = Object.keys(DEFAULT_WIDTHS)

const COL_LABELS: Record<string, string> = {
  no: 'No',
  status: 'Status',
  tanggal: 'Tanggal',
  docNumber: 'Nomor Dokumen',
  kodeRek: 'Kode Rek',
  subKegiatan: 'Sub Kegiatan',
  tipe: 'Tipe',
  vendor: 'Vendor / Penyedia',
  total: 'Total (Rp)',
  items: 'Rincian Item',
  aksi: 'Aksi',
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID').format(amount)
}

// ──────────────────────────────────────────────────────────
// Resizable Column Header
// ──────────────────────────────────────────────────────────
function ResizableHeader({
  colKey, width, label, onResize, isLast
}: {
  colKey: string
  width: number
  label: string
  onResize: (key: string, delta: number) => void
  isLast?: boolean
}) {
  const startX = useRef<number>(0)
  const dragging = useRef(false)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    startX.current = e.clientX
    dragging.current = true

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      const delta = ev.clientX - startX.current
      startX.current = ev.clientX
      onResize(colKey, delta)
    }
    const onUp = () => {
      dragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [colKey, onResize])

  return (
    <th
      style={{ width, minWidth: 48 }}
      className="relative bg-[#1e293b] border-r border-b border-slate-700 text-left text-[11px] font-semibold text-slate-300 uppercase tracking-wide select-none"
    >
      <div className="px-2 py-2 truncate">{label}</div>
      {!isLast && (
        <div
          onMouseDown={onMouseDown}
          className="absolute right-0 top-0 h-full w-2 cursor-col-resize flex items-center justify-center group z-10"
        >
          <div className="w-0.5 h-4 bg-slate-600 group-hover:bg-indigo-400 rounded-full transition-colors" />
        </div>
      )}
    </th>
  )
}

// ──────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────
export default function DocumentList({ initialDocuments }: { initialDocuments: any[] }) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [wrapText, setWrapText] = useState(false)
  const [colWidths, setColWidths] = useState<Record<string, number>>(DEFAULT_WIDTHS)
  const [editingItems, setEditingItems] = useState<Record<string, { description: string; quantity: number; price: number; total: number }>>({})
  const [savingItemId, setSavingItemId] = useState<string | null>(null)

  const handleDelete = async (docId: string) => {
    setDeletingId(docId)
    try { await deleteDocument(docId) } finally { setDeletingId(null) }
  }

  const handleResize = useCallback((key: string, delta: number) => {
    setColWidths(prev => ({
      ...prev,
      [key]: Math.max(48, (prev[key] || 100) + delta)
    }))
  }, [])

  const totalWidth = COL_KEYS.reduce((sum, k) => sum + colWidths[k], 0)

  if (initialDocuments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 mt-4 border border-dashed border-white/10 rounded-xl bg-slate-900/30">
        <p className="text-slate-400 text-sm">Belum ada dokumen yang diproses AI.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 px-1">
        <button
          onClick={() => setWrapText(w => !w)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
            wrapText
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
              : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20 hover:text-white'
          }`}
        >
          <WrapText className="w-3.5 h-3.5" />
          Wrap Text
        </button>
        <button
          onClick={() => setColWidths(DEFAULT_WIDTHS)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-slate-400 border border-white/10 hover:border-white/20 hover:text-white transition-all"
        >
          <AlignJustify className="w-3.5 h-3.5" />
          Reset Lebar
        </button>
        <span className="text-slate-600 text-xs ml-auto">
          {initialDocuments.length} dokumen · Seret batas kolom untuk mengubah lebar
        </span>
      </div>

      {/* ── Spreadsheet wrapper ── */}
      <div className="overflow-auto rounded-xl border border-slate-700/60 shadow-2xl"
           style={{ maxHeight: '75vh' }}>
        <table
          className="border-collapse text-sm min-w-full"
          style={{ width: '100%', minWidth: totalWidth, tableLayout: 'fixed' }}
        >
          {/* ── Column sizing ── */}
          <colgroup>
            {COL_KEYS.map(k => <col key={k} style={{ width: colWidths[k] }} />)}
          </colgroup>

          {/* ── Sticky Header ── */}
          <thead className="sticky top-0 z-20">
            {/* Row letters (Excel row 1) */}
            <tr>
              {COL_KEYS.map((k, i) => (
                <ResizableHeader
                  key={k}
                  colKey={k}
                  width={colWidths[k]}
                  label={COL_LABELS[k]}
                  onResize={handleResize}
                  isLast={i === COL_KEYS.length - 1}
                />
              ))}
            </tr>
          </thead>

          <tbody>
            {initialDocuments.map((doc, rowIdx) => {
              const showBA = !!doc.baNumber || !!doc.baDate
              const isExpanded = expandedId === doc.id
              const isMatched = !!doc.matchRecord
              
              const kwatDate = doc.date
                ? format(new Date(doc.date), 'dd/MM/yyyy', { locale: id })
                : format(new Date(doc.createdAt), 'dd/MM/yyyy', { locale: id })
              
              const baDateStr = doc.baDate
                ? format(new Date(doc.baDate), 'dd/MM/yyyy', { locale: id })
                : null

              // Build items string
              const itemsText = doc.items && doc.items.length > 0
                ? doc.items.map((it: any) =>
                    `${it.description} (${it.quantity} × ${formatCurrency(it.price)} = ${formatCurrency(it.total)})`
                  ).join(' | ')
                : '—'

              const rowBg = rowIdx % 2 === 0 ? 'bg-[#0f172a]' : 'bg-[#111827]'
              const cellClass = `border-r border-b border-slate-800 px-2 py-1.5 align-top text-slate-200 text-[12px] ${
                wrapText ? 'whitespace-pre-wrap break-words' : 'truncate'
              }`

              return (
                <React.Fragment key={doc.id}>
                  {/* ── Main data row ── */}
                  <tr
                    className={`${rowBg} hover:bg-indigo-950/40 transition-colors cursor-pointer group`}
                    onClick={() => setExpandedId(isExpanded ? null : doc.id)}
                  >
                    {/* No */}
                    <td className={`${cellClass} text-slate-500 text-center font-mono`}>
                      <div className="flex items-center justify-center gap-1.5">
                        {isExpanded
                          ? <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
                          : <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-amber-500 transition-colors" />
                        }
                        <span className="text-[11px] min-w-[12px]">{rowIdx + 1}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className={`${cellClass} text-center`} style={{ overflow: 'hidden' }}>
                      {isMatched ? (
                        <div className="flex flex-col items-center gap-0.5" title={doc.matchRecord.bkuTransaction.description}>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-bold border border-emerald-500/30 uppercase tracking-tighter shadow-sm shadow-emerald-500/10">
                            <CheckCircle2 className="w-2 h-2" />TERCOCOKKAN
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono leading-none">
                            BKU {doc.matchRecord.bkuTransaction.date}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          <Circle className="w-2.5 h-2.5 text-slate-600" />
                          <span className="text-[8px] text-slate-600 uppercase font-bold tracking-tighter">Pending</span>
                        </div>
                      )}
                    </td>

                    {/* Tanggal */}
                    <td className={cellClass + ' font-mono'}>
                      <div className="flex flex-col gap-0.5">
                        <span title="Tanggal Kwitansi/Nota">{kwatDate}</span>
                        {baDateStr && (
                          <span className="text-[9px] text-amber-500/70" title="Tanggal Berita Acara">BA: {baDateStr}</span>
                        )}
                      </div>
                    </td>

                    {/* Nomor Dokumen */}
                    <td className={cellClass + ' font-mono text-slate-400 text-[11px]'}>
                      <div className="flex flex-col gap-0.5">
                        <span title="Nomor Kwitansi/Nota">{doc.docNumber || '—'}</span>
                        {doc.baNumber && (
                          <span className="text-[10px] text-amber-500/80 font-bold" title="Nomor Berita Acara">
                             {doc.baNumber}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Kode Rek */}
                    <td className={cellClass + ' font-mono text-indigo-300 text-[11px]'}>
                      {doc.kodeRek || '—'}
                    </td>

                    {/* Sub Kegiatan */}
                    <td className={cellClass + ' font-mono text-indigo-200 text-[11px] font-bold'}>
                      {doc.subKegiatan || '—'}
                    </td>

                    {/* Tipe */}
                    <td className={cellClass}>
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        doc.type === 'Berita Acara Penerimaan Barang' ? 'bg-amber-500/20 text-amber-300' :
                        doc.type === 'Kwitansi' ? 'bg-emerald-500/20 text-emerald-300' :
                        doc.type === 'Dokumen Gabungan' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                        'bg-blue-500/20 text-blue-300'
                      }`}>
                        {doc.type === 'Berita Acara Penerimaan Barang' ? 'BA Penerimaan' : 
                         doc.type === 'Dokumen Gabungan' ? 'Kwitansi + BA' : doc.type}
                      </span>
                    </td>

                    {/* Vendor */}
                    <td className={cellClass}>{doc.vendorName}</td>

                    {/* Total */}
                    <td className={`${cellClass} text-right font-mono font-semibold text-white`}>
                      Rp {formatCurrency(doc.totalAmount)}
                    </td>

                    {/* Items */}
                    <td className={cellClass + ' text-slate-400 text-[11px]'}>
                      {itemsText}
                    </td>

                    {/* Aksi */}
                    <td
                      className={`${cellClass} text-center`}
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleDelete(doc.id)}
                        disabled={deletingId === doc.id}
                        className="p-1 text-slate-600 hover:text-rose-400 hover:bg-rose-400/10 rounded transition-colors disabled:opacity-40"
                      >
                        {deletingId === doc.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />
                        }
                      </button>
                    </td>
                  </tr>

                  {/* ── Expanded detail row ── */}
                  {isExpanded && (
                    <tr className="bg-[#0c1220]">
                      <td colSpan={COL_KEYS.length} className="px-6 py-5 border-b border-slate-800">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Items detail table */}
                          <div className="md:col-span-2">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Rincian Item</p>
                            {doc.items && doc.items.length > 0 ? (
                              <table className="w-full text-xs border-collapse">
                                <thead>
                                  <tr className="bg-slate-800/80">
                                    <th className="text-left px-3 py-2 text-slate-400 font-semibold border border-slate-700">Uraian / Deskripsi</th>
                                    <th className="text-center px-3 py-2 text-slate-400 font-semibold border border-slate-700 w-16">Qty</th>
                                    <th className="text-right px-3 py-2 text-slate-400 font-semibold border border-slate-700 w-32">Harga Satuan</th>
                                    <th className="text-right px-3 py-2 text-slate-400 font-semibold border border-slate-700 w-32">Jumlah</th>
                                    <th className="text-center px-3 py-2 text-slate-400 font-semibold border border-slate-700 w-14">Aksi</th>
                                  </tr>
                                </thead>
                                <tbody>
                                   {doc.items.map((item: any, idx: number) => {
                                     const editing = editingItems[item.id]
                                     const isSaving = savingItemId === item.id
                                     const rowBgC = idx % 2 === 0 ? 'bg-slate-900/60' : 'bg-slate-900/30'
                                     return (
                                       <tr key={item.id ?? idx} className={rowBgC}>
                                         {editing ? (
                                           <>
                                             <td className="px-2 py-1 border border-slate-700">
                                               <input
                                                 className="w-full bg-slate-800 text-white text-xs px-2 py-1 rounded border border-indigo-500 outline-none"
                                                 value={editing.description}
                                                 onChange={e => setEditingItems(p => ({ ...p, [item.id]: { ...p[item.id], description: e.target.value } }))}
                                               />
                                             </td>
                                             <td className="px-2 py-1 border border-slate-700 w-16">
                                               <input
                                                 type="number" min={1}
                                                 className="w-full bg-slate-800 text-white text-xs px-2 py-1 rounded border border-indigo-500 outline-none text-center"
                                                 value={editing.quantity}
                                                 onChange={e => setEditingItems(p => ({ ...p, [item.id]: { ...p[item.id], quantity: Number(e.target.value) } }))}
                                               />
                                             </td>
                                             <td className="px-2 py-1 border border-slate-700 w-32">
                                               <input
                                                 type="number" min={0}
                                                 className="w-full bg-slate-800 text-white text-xs px-2 py-1 rounded border border-indigo-500 outline-none text-right font-mono"
                                                 value={editing.price}
                                                 onChange={e => setEditingItems(p => ({ ...p, [item.id]: { ...p[item.id], price: Number(e.target.value) } }))}
                                               />
                                             </td>
                                             <td className="px-2 py-1 border border-slate-700 w-32">
                                               <input
                                                 type="number" min={0}
                                                 className="w-full bg-slate-800 text-white text-xs px-2 py-1 rounded border border-indigo-500 outline-none text-right font-mono"
                                                 value={editing.total}
                                                 onChange={e => setEditingItems(p => ({ ...p, [item.id]: { ...p[item.id], total: Number(e.target.value) } }))}
                                               />
                                             </td>
                                             <td className="px-2 py-1 border border-slate-700 text-center w-14">
                                               <div className="flex gap-1 justify-center">
                                                 <button
                                                   disabled={isSaving}
                                                   onClick={async () => {
                                                     setSavingItemId(item.id)
                                                     await updateDocumentItem(item.id, editing)
                                                     setSavingItemId(null)
                                                     setEditingItems(p => { const n = { ...p }; delete n[item.id]; return n })
                                                   }}
                                                   className="p-1 text-emerald-400 hover:bg-emerald-400/20 rounded transition-colors disabled:opacity-40"
                                                   title="Simpan"
                                                 >
                                                   {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                                 </button>
                                                 <button
                                                   onClick={() => setEditingItems(p => { const n = { ...p }; delete n[item.id]; return n })}
                                                   className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded transition-colors"
                                                   title="Batal"
                                                 >
                                                   <X className="w-3 h-3" />
                                                 </button>
                                               </div>
                                             </td>
                                           </>
                                         ) : (
                                           <>
                                             <td className="px-3 py-1.5 text-white border border-slate-800">{item.description}</td>
                                             <td className="px-3 py-1.5 text-slate-300 text-center border border-slate-800">{item.quantity}</td>
                                             <td className="px-3 py-1.5 text-slate-300 text-right font-mono border border-slate-800">Rp {formatCurrency(item.price)}</td>
                                             <td className="px-3 py-1.5 text-indigo-300 text-right font-mono font-bold border border-slate-800">Rp {formatCurrency(item.total)}</td>
                                             <td className="px-3 py-1.5 text-center border border-slate-800 w-12">
                                               <button
                                                 onClick={() => setEditingItems(p => ({ ...p, [item.id]: { description: item.description, quantity: item.quantity, price: item.price, total: item.total } }))}
                                                 className="p-1 text-slate-600 hover:text-indigo-400 hover:bg-indigo-400/10 rounded transition-colors"
                                                 title="Edit item"
                                               >
                                                 <Pencil className="w-3 h-3" />
                                               </button>
                                             </td>
                                           </>
                                         )}
                                       </tr>
                                     )
                                   })}
                                  <tr className="bg-slate-800">
                                    <td colSpan={4} className="px-3 py-2 text-right font-bold text-white border border-slate-700 text-xs uppercase">Total</td>
                                    <td className="px-3 py-2 text-right font-bold text-emerald-400 font-mono border border-slate-700">
                                      Rp {formatCurrency(doc.totalAmount)}
                                    </td>
                                    <td className="px-3 py-2 border border-slate-700"></td> {/* Empty cell for the action column */}
                                  </tr>
                                </tbody>
                              </table>
                            ) : (
                              <p className="text-slate-600 text-xs italic">Tidak ada rincian item terdeteksi dari dokumen ini.</p>
                            )}
                          </div>

                          {/* Meta info */}
                          <div className="space-y-3">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Info Dokumen</p>
                            {[
                              { label: 'Nomor Kwitansi/Nota', value: doc.docNumber || '—' },
                              { label: 'Nomor Berita Acara (BA)', value: doc.baNumber || '—' },
                              { label: 'Tanggal Kwitansi', value: kwatDate },
                              { label: 'Tanggal Berita Acara', value: baDateStr || '—' },
                              { label: 'Kode Rekening', value: doc.kodeRek || '—' },
                              { label: 'Sub Kegiatan', value: doc.subKegiatan || '—' },
                            ].map(({ label, value }) => (
                              <div key={label} className="flex flex-col gap-0.5">
                                <span className="text-[10px] text-slate-600 uppercase font-semibold">{label}</span>
                                <span className={`text-xs text-white font-mono bg-slate-800/60 px-2 py-1 rounded border border-slate-700 ${label.includes('BA') ? 'text-amber-300/90' : ''}`}>{value}</span>
                              </div>
                            ))}
                            {doc.matchRecord && (
                              <div className="pt-2 border-t border-slate-800">
                                <p className="text-[10px] font-bold text-emerald-500 uppercase mb-1">BKU Tercocokkan</p>
                                <p className="text-xs text-emerald-300/80">{doc.matchRecord.reasoning}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-600">
        <span>{initialDocuments.length} baris · {COL_KEYS.length} kolom</span>
        <span>💡 Klik baris untuk melihat detail · Seret batas kolom untuk resize</span>
      </div>
    </div>
  )
}
