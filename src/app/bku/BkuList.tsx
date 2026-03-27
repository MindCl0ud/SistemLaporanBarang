'use client'

import React, { useState, useRef, useCallback } from "react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { Trash2, Loader2, ArrowUpDown, CheckCircle2, Circle, WrapText, AlignJustify } from "lucide-react"
import { deleteBkuRecord } from "@/app/actions/bkuActions"

// ──────────────────────────────────────────────────────────
// Column definitions
// ──────────────────────────────────────────────────────────
const DEFAULT_WIDTHS: Record<string, number> = {
  no:           55,
  tanggal:     120,
  kode:        220,
  uraian:      450,
  penerimaan:  150,
  pengeluaran: 150,
  saldo:       160,
  status:      100,
  aksi:         70,
}
const COL_KEYS = Object.keys(DEFAULT_WIDTHS)
const COL_LABELS: Record<string, string> = {
  no:          'No',
  tanggal:     'Tanggal Bukti',
  kode:        'Kode Rekening',
  uraian:      'Uraian / Kegiatan',
  penerimaan:  'Penerimaan (Rp)',
  pengeluaran: 'Pengeluaran (Rp)',
  saldo:       'Saldo (Rp)',
  status:      'Status Dok.',
  aksi:        'Aksi',
}

function formatNum(amount: number) {
  return new Intl.NumberFormat('id-ID').format(amount)
}

// ──────────────────────────────────────────────────────────
// Resizable Column Header (same pattern as DocumentList)
// ──────────────────────────────────────────────────────────
function ResizableHeader({ colKey, width, label, onResize, isLast }: {
  colKey: string; width: number; label: string
  onResize: (key: string, delta: number) => void; isLast?: boolean
}) {
  const startX = useRef(0)
  const dragging = useRef(false)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    startX.current = e.clientX
    dragging.current = true
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      onResize(colKey, ev.clientX - startX.current)
      startX.current = ev.clientX
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
    <th style={{ width, minWidth: 40 }}
      className="relative bg-input border-r border-b border-border text-left text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide select-none">
      <div className="px-2 py-2 truncate">{label}</div>
      {!isLast && (
        <div onMouseDown={onMouseDown}
          className="absolute right-0 top-0 h-full w-2 cursor-col-resize flex items-center justify-center group z-10">
          <div className="w-0.5 h-4 bg-slate-400 dark:bg-slate-600 group-hover:bg-indigo-500 dark:group-hover:bg-indigo-400 rounded-full transition-colors" />
        </div>
      )}
    </th>
  )
}

// ──────────────────────────────────────────────────────────
// Main BKU Table
// ──────────────────────────────────────────────────────────
export default function BkuList({ initialRecords, openingBalance = 0 }: {
  initialRecords: any[]; openingBalance: number
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [sortDesc, setSortDesc] = useState(false)
  const [wrapText, setWrapText] = useState(false)
  const [colWidths, setColWidths] = useState<Record<string, number>>(DEFAULT_WIDTHS)

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try { await deleteBkuRecord(id) } finally { setDeletingId(null) }
  }

  const handleResize = useCallback((key: string, delta: number) => {
    setColWidths(prev => ({ ...prev, [key]: Math.max(40, prev[key] + delta) }))
  }, [])

  if (initialRecords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 mt-4 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50 dark:bg-slate-900/30">
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Belum ada data BKU untuk bulan ini.</p>
      </div>
    )
  }

  // Calculate running balance (always in input order)
  const sortedByInput = [...initialRecords].sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
  let running = openingBalance
  const withBalance = sortedByInput.map(r => {
    running += (r.receiptTotal || 0) - (r.expenseTotal || 0)
    return { ...r, calculatedBalance: running }
  })
  const displayed = sortDesc ? [...withBalance].reverse() : withBalance

  const totalWidth = COL_KEYS.reduce((s, k) => s + colWidths[k], 0)
  const cellBase = `border-r border-b border-border px-2 py-1.5 align-top text-[12px] ${wrapText ? 'whitespace-pre-wrap break-words' : 'truncate'}`

  return (
    <div className="flex flex-col gap-2">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-1">
        <button onClick={() => setSortDesc(d => !d)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-input text-slate-500 dark:text-slate-400 border border-border hover:border-slate-300 dark:hover:border-white/20 hover:text-foreground transition-all shadow-sm">
          <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          {sortDesc ? 'Dari Terbaru' : 'Dari Awal'}
        </button>
        <button onClick={() => setWrapText(w => !w)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
            wrapText ? 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/40 shadow-sm'
                     : 'bg-input text-slate-500 dark:text-slate-400 border border-border hover:border-slate-300 dark:hover:border-white/20 hover:text-foreground transition-all shadow-sm'}`}>
          <WrapText className="w-3.5 h-3.5" />
          Wrap Text
        </button>
        <button onClick={() => setColWidths(DEFAULT_WIDTHS)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-input text-slate-500 dark:text-slate-400 border border-border hover:border-slate-300 dark:hover:border-white/20 hover:text-foreground transition-all shadow-sm">
          <AlignJustify className="w-3.5 h-3.5" />
          Reset Lebar
        </button>
        <span className="text-slate-600 text-xs ml-auto">
          {displayed.length} baris · Seret batas kolom untuk mengubah lebar
        </span>
      </div>

      {/* Spreadsheet */}
      <div className="overflow-auto rounded-xl border border-border shadow-2xl bg-card" style={{ maxHeight: '68vh' }}>
        <table className="border-collapse text-sm min-w-full" style={{ width: '100%', minWidth: totalWidth, tableLayout: 'fixed' }}>
          <colgroup>
            {COL_KEYS.map(k => <col key={k} style={{ width: colWidths[k] }} />)}
          </colgroup>
          <thead className="sticky top-0 z-20">
            <tr>
              {COL_KEYS.map((k, i) => (
                <ResizableHeader key={k} colKey={k} width={colWidths[k]} label={COL_LABELS[k]}
                  onResize={handleResize} isLast={i === COL_KEYS.length - 1} />
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Saldo Bulan Lalu row */}
            {!sortDesc && (
              <tr className="bg-indigo-500/5 dark:bg-indigo-500/10 italic">
                <td className={`${cellBase} text-slate-400 dark:text-slate-500 text-center`}>—</td>
                <td className={`${cellBase} text-slate-400 dark:text-slate-500 text-center`}>—</td>
                <td className={`${cellBase} text-slate-400 dark:text-slate-500`}>—</td>
                <td className={`${cellBase} text-indigo-600 dark:text-indigo-300 font-bold uppercase tracking-wider`}>
                  Saldo Bulan Lalu
                </td>
                <td className={`${cellBase} text-right text-emerald-600 dark:text-emerald-400 font-bold font-mono`}>
                  {formatNum(openingBalance)}
                </td>
                <td className={`${cellBase} text-slate-400 dark:text-slate-500 text-right`}>—</td>
                <td className={`${cellBase} text-right text-indigo-600 dark:text-indigo-300 font-bold font-mono`}>
                  {formatNum(openingBalance)}
                </td>
                <td className={`${cellBase} text-center font-bold text-slate-400`}>—</td>
                <td className={`${cellBase} text-center`}></td>
              </tr>
            )}

            {displayed.map((record, rowIdx) => {
              const rowBg = rowIdx % 2 === 0 ? 'bg-card' : 'bg-input/20'
              return (
                <tr key={record.id} className={`${rowBg} hover:bg-indigo-950/40 transition-colors group`}>
                  {/* No */}
                  <td className={`${cellBase} text-slate-500 text-center font-mono`}>{rowIdx + 1}</td>

                  {/* Tanggal */}
                  <td className={`${cellBase} font-mono text-emerald-600 dark:text-emerald-300`}>
                    {record.date || format(new Date(record.createdAt), 'dd/MM/yyyy', { locale: id })}
                  </td>

                  {/* Kode */}
                  <td className={`${cellBase} font-mono text-indigo-600 dark:text-indigo-300 text-[11px]`}>
                    {record.code || '—'}
                  </td>

                  {/* Uraian */}
                  <td className={`${cellBase} text-slate-900 dark:text-white font-medium`} title={record.description}>
                    {record.description}
                  </td>

                  {/* Penerimaan */}
                  <td className={`${cellBase} text-right text-emerald-600 dark:text-emerald-400 font-mono font-bold`}>
                    {record.receiptTotal > 0 ? formatNum(record.receiptTotal) : ''}
                  </td>

                  {/* Pengeluaran */}
                  <td className={`${cellBase} text-right text-rose-600 dark:text-rose-400 font-mono font-bold`}>
                    {record.expenseTotal > 0 ? formatNum(record.expenseTotal) : ''}
                  </td>

                  {/* Saldo */}
                  <td className={`${cellBase} text-right text-blue-600 dark:text-blue-300 font-mono font-black`}>
                    {formatNum(record.calculatedBalance)}
                  </td>

                  {/* Status */}
                  <td className={`${cellBase} text-center`}>
                    {record.matchRecord ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black border border-emerald-200 dark:border-emerald-500/30">
                        <CheckCircle2 className="w-2.5 h-2.5" />COCOK
                      </span>
                    ) : record.expenseTotal > 0 ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-input/50 text-slate-400 dark:text-slate-500 text-[10px] font-bold border border-border">
                        <Circle className="w-2.5 h-2.5" />—
                      </span>
                    ) : null}
                  </td>

                  {/* Aksi */}
                  <td className={`${cellBase} text-center`}>
                    <button onClick={() => handleDelete(record.id)} disabled={deletingId === record.id}
                      className="p-1 text-slate-600 hover:text-rose-400 hover:bg-rose-400/10 rounded transition-colors disabled:opacity-40">
                      {deletingId === record.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-600">
        <span>{displayed.length} baris · {COL_KEYS.length} kolom</span>
        <span>💡 Seret batas kolom untuk resize · Klik header untuk urutkan</span>
      </div>
    </div>
  )
}
