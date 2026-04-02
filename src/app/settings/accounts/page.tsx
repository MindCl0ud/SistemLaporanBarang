'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ListTree, 
  Save, 
  Trash2, 
  Loader2, 
  Search, 
  Pencil, 
  RefreshCw, 
  X,
  Hash,
  ArrowUpDown,
  UploadCloud,
  Download,
  FileSpreadsheet,
  Settings as SettingsIcon,
  CheckCircle2,
  Plus,
  Check,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Circle as CircleIcon,
  AlignJustify,
  Pencil as PencilIcon
} from 'lucide-react'
import { getAccountMappings, upsertAccountMapping, deleteAccountMapping, syncAccountCodesFromBku, upsertAccountMappingBulk } from '@/app/actions/bkuActions'
import { getBudgetMode, updateBudgetMode } from '@/app/actions/settingsActions'

// ──────────────────────────────────────────────────────────
// Column definitions & ResizableHeader (Unified Style)
// ──────────────────────────────────────────────────────────
const DEFAULT_WIDTHS: Record<string, number> = {
  sub:         140,
  code:        180,
  name:        400,
  awal:        130,
  perubahan:   130,
  bidang:      130,
  aksi:        80
}

function ResizableHeader({ colKey, width, label, onResize, isLast, align = 'text-left', onSort }: {
  colKey: string; width: number; label: string; align?: string;
  onResize: (key: string, delta: number) => void; isLast?: boolean;
  onSort?: (key: string) => void;
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
      className={`relative bg-input border-r border-b border-border ${align} text-[11px] font-semibold text-foreground/70 uppercase tracking-wide select-none group/h`}>
      <div 
        className="px-3 py-2.5 truncate flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
        onClick={() => onSort?.(colKey)}
      >
        {label}
      </div>
      {!isLast && (
        <div onMouseDown={onMouseDown}
          className="absolute right-0 top-0 h-full w-2 cursor-col-resize flex items-center justify-center group z-10">
          <div className="w-0.5 h-4 bg-foreground/10 group-hover/h:bg-primary/50 transition-colors" />
        </div>
      )}
    </th>
  )
}

export default function AccountMappingPage() {
  const [mappings, setMappings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null)
  
  // Inline editing states
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  // Filter settings
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  // New row states
  const [showAddRow, setShowAddRow] = useState(false)
  const [newRow, setNewRow] = useState({ 
    code: '', 
    name: '', 
    division: '', 
    budget: '', 
    revisedBudget: '', 
    subKegiatan: '' 
  })

  // Popover/Modal states
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  
  // App-wide Settings
  const [useRevisedBudgetMode, setUseRevisedBudgetMode] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [colWidths, setColWidths] = useState<Record<string, number>>(DEFAULT_WIDTHS)

  useEffect(() => {
    fetchMappings()
    fetchSettings()
  }, [selectedYear])

  const fetchSettings = async () => {
    try {
      const isRevised = await getBudgetMode()
      setUseRevisedBudgetMode(isRevised)
    } catch (e) {
      console.warn("Failed to fetch budget mode", e)
    }
  }

  const handleToggleRevised = async (enabled: boolean) => {
    setUseRevisedBudgetMode(enabled)
    try {
      await updateBudgetMode(enabled)
    } catch (e) {
      console.error("Failed to update budget mode", e)
    }
  }

  const handleResize = useCallback((key: string, delta: number) => {
    setColWidths(prev => ({ ...prev, [key]: Math.max(40, prev[key] + delta) }))
  }, [])

  const fetchMappings = async () => {
    setLoading(true)
    try {
      const data = await getAccountMappings(selectedYear)
      setMappings(data)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveInline = async (code: string, name: string, division: string | null = null, budget: number | null = 0, id: string | null = null, subKegiatan: string | null = null, revisedBudget: number | null = 0) => {
    if (!code || !name) return
    setSavingId(id || 'new')
    try {
      await upsertAccountMapping(code, name, division || undefined, budget || 0, subKegiatan || undefined, selectedYear, revisedBudget || 0)
      setEditingId(null)
      setShowAddRow(false)
      setNewRow({ code: '', name: '', division: '', budget: '', revisedBudget: '', subKegiatan: '' })
      fetchMappings()
    } finally {
      setSavingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus pemetaan ini?')) return
    await deleteAccountMapping(id)
    fetchMappings()
  }

  const handleSync = async () => {
    setLoading(true)
    try {
      const { count } = await syncAccountCodesFromBku(selectedYear)
      alert(`Berhasil sinkronisasi ${count} kode rekening baru untuk tahun ${selectedYear}!`)
      fetchMappings()
    } finally {
      setLoading(false)
    }
  }

  const handleExportTemplate = async () => {
    try {
      const { utils, writeFile } = await import('xlsx')
      const headers = [["Sub Kegiatan (Opsional)", "Kode Rekening", "Nama Rekening", "Bidang / Division (Opsional)", "Pagu Awal", "Pagu Perubahan"]]
      const sample = [["5.01.01.2.01", "5.1.02.01.01.0001", "Belanja Alat Tulis Kantor", "Sekretariat", 5000000, 5500000]]
      const ws = utils.aoa_to_sheet([...headers, ...sample])
      const wb = utils.book_new()
      utils.book_append_sheet(wb, ws, "Template_Master_Rekening")
      writeFile(wb, `Template_Master_Rekening_${selectedYear}.xlsx`)
    } catch (e) {
      alert("Gagal mengunduh template.")
    }
  }

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setLoading(true)
    setIsImporting(true)

    try {
      const { read, utils } = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const wb = read(buffer, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = utils.sheet_to_json(ws, { header: 1 }) as any[][]
      
      const parsedData = []
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
        if (!row || row.length < 2) continue
        
        parsedData.push({
          subKegiatan: String(row[0] || "").trim() || undefined,
          code: String(row[1] || "").trim(),
          name: String(row[2] || "").trim(),
          division: String(row[3] || "").trim() || undefined,
          budget: Number(row[4] || 0),
          revisedBudget: Number(row[5] || 0)
        })
      }

      if (parsedData.length > 0) {
        const { count } = await upsertAccountMappingBulk(parsedData, selectedYear)
        alert(`Berhasil mengimpor ${count} baris data ke tahun ${selectedYear}!`)
        fetchMappings()
      } else {
        alert("Tidak ada data valid ditemukan di file Excel.")
      }
    } catch (error) {
      console.error(error)
      alert("Gagal mengimpor file Excel. Pastikan format kolom benar.")
    } finally {
      setIsImporting(false)
      setLoading(false)
      if (e.target) e.target.value = ''
    }
  }

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const sortedAndFiltered = useMemo(() => {
    let result = mappings.filter(m => 
      m.code.toLowerCase().includes(search.toLowerCase()) || 
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.division?.toLowerCase().includes(search.toLowerCase()) ||
      m.subKegiatan?.toLowerCase().includes(search.toLowerCase())
    )

    if (sortConfig) {
      result.sort((a, b) => {
        const valA = a[sortConfig.key] || (typeof a[sortConfig.key] === 'number' ? 0 : '')
        const valB = b[sortConfig.key] || (typeof b[sortConfig.key] === 'number' ? 0 : '')

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    } else {
       result.sort((a, b) => a.code.localeCompare(b.code))
    }
    return result
  }, [mappings, search, sortConfig])

  const totalPaguEffective = useMemo(() => {
    return mappings.reduce((sum, m) => {
      const revised = m.revisedBudget || 0
      const original = m.budget || 0
      // Logic: Use revised budget if ON and non-zero, else fall back to original
      const effective = (useRevisedBudgetMode && revised > 0) ? revised : original
      return sum + effective
    }, 0)
  }, [mappings, useRevisedBudgetMode])

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('id-ID').format(amt)
  }

  const totalWidth = useMemo(() => 50 + Object.values(colWidths).reduce((a, b) => a + b, 0), [colWidths])
  const cellBase = `border-r border-b border-border px-3 py-2 text-[12px] align-top`

  return (
    <div className="max-w-[1550px] mx-auto px-4 py-8 space-y-8 min-h-screen">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-2">
            <Hash className="w-3 h-3" /> Master Data Management
          </div>
          <h1 className="text-3xl font-black text-foreground flex items-center gap-4 tracking-tighter">
            <div className="p-3 rounded-2xl bg-primary text-white shadow-xl shadow-primary/20">
              <ListTree className="w-6 h-6" />
            </div>
            Master Rekening
          </h1>
          <div className="flex items-center gap-6 mt-4">
            <div className="flex flex-col border-l-2 border-primary/20 pl-6">
              <span className="text-[10px] font-black text-muted uppercase tracking-widest">Tahun Anggaran</span>
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="text-xl font-black text-primary bg-transparent outline-none cursor-pointer hover:opacity-70 transition-opacity"
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y} className="text-sm font-bold bg-white dark:bg-slate-900 text-foreground">{y}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col border-l-2 border-primary/20 pl-6">
              <span className="text-[10px] font-black text-muted uppercase tracking-widest">Total Pagu Efektif ({selectedYear})</span>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-primary tracking-tighter">Rp{formatCurrency(totalPaguEffective)}</span>
                {useRevisedBudgetMode && (
                  <span className="px-1.5 py-0.5 rounded bg-indigo-500 text-white text-[8px] font-black uppercase tracking-widest">Revised</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddRow(true)}
            className="flex items-center gap-2 px-6 py-4 bg-primary text-white rounded-2xl text-sm font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> Tambah Manual
          </button>
          
          <div className="flex items-center bg-white dark:bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
             <button
                onClick={handleExportTemplate}
                className="flex items-center gap-2 px-4 py-4 hover:bg-slate-50 transition-all text-xs font-black text-foreground border-r border-border"
                title="Unduh Template Excel"
              >
                <Download className="w-4 h-4 text-primary" />
                Template
              </button>
              <label className="flex items-center gap-2 px-4 py-4 hover:bg-slate-50 transition-all text-xs font-black text-foreground cursor-pointer">
                <UploadCloud className="w-4 h-4 text-emerald-500" />
                {isImporting ? "Mengimpor..." : "Impor Excel"}
                <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImportExcel} disabled={loading} />
              </label>
          </div>

          <button
            onClick={handleSync}
            disabled={loading}
            className="group flex items-center gap-2 px-6 py-4 bg-white dark:bg-card hover:bg-slate-50 text-foreground rounded-2xl text-sm font-black border border-border transition-all shadow-sm active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 transition-transform group-hover:rotate-180 duration-500 ${loading ? 'animate-spin' : ''}`} />
            Sync BKU
          </button>

          <div className="relative">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className={`p-4 rounded-2xl border transition-all active:scale-95 shadow-sm ${showConfig ? 'bg-primary text-white border-primary shadow-primary/20' : 'bg-white dark:bg-card text-foreground border-border hover:bg-slate-50'}`}
            >
              <SettingsIcon className={`w-5 h-5 ${showConfig ? 'animate-spin' : ''}`} />
            </button>
            
            <AnimatePresence>
              {showConfig && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-full mt-3 w-72 bg-white dark:bg-slate-900 border border-border rounded-2xl shadow-2xl p-5 z-[50] backdrop-blur-xl"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-primary">Konfigurasi Budget</h3>
                    <button onClick={() => setShowConfig(false)} className="text-muted hover:text-rose-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-black/20 rounded-xl border border-border">
                      <div className="flex flex-col gap-1 text-left">
                        <span className="text-[11px] font-black text-foreground uppercase">Prioritas Pagu</span>
                        <span className="text-[10px] text-muted">Gunakan Pagu Perubahan</span>
                      </div>
                      <button 
                        onClick={() => handleToggleRevised(!useRevisedBudgetMode)}
                        className={`w-12 h-6 rounded-full transition-all relative ${useRevisedBudgetMode ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${useRevisedBudgetMode ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>

                    <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                      <div className="flex items-start gap-2">
                        <HelpCircle className="w-3.5 h-3.5 text-indigo-500 mt-0.5" />
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium leading-relaxed">
                          Saat nyala, sistem memprioritaskan **Pagu Perubahan**. Jika bernilai 0, sistem otomatis menggunakan **Pagu Awal**.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* SEARCH BAR */}
      <div className="flex items-center gap-4 bg-white dark:bg-card p-2 pr-4 rounded-[2rem] border border-border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
          <input
            type="text"
            placeholder="Cari berdasarkan kode, nama, sub kegiatan atau bidang..."
            className="w-full bg-transparent border-none rounded-2xl pl-16 pr-6 py-4 text-base font-bold text-foreground outline-none placeholder:text-muted/40"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* TABLE SECTION (UNIFIED UI) */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
           <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 px-3 py-1.5 bg-input border border-border rounded-lg text-[10px] font-black text-muted uppercase tracking-[0.2em]">
               <FileSpreadsheet className="w-3.5 h-3.5 text-primary" /> Spreadsheet Mode
             </div>
             <button onClick={() => setColWidths(DEFAULT_WIDTHS)} className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1.5">
               <AlignJustify className="w-3.5 h-3.5" /> Reset Lebar
             </button>
           </div>
           <span className="text-[10px] font-black text-muted uppercase tracking-widest opacity-60">
             {sortedAndFiltered.length} REKENING TERDAFTAR
           </span>
        </div>

        <div className="overflow-auto rounded-[2rem] border border-border bg-card custom-scrollbar shadow-sm w-full max-h-[65vh]">
          <table className="border-collapse w-full" style={{ minWidth: totalWidth, tableLayout: 'fixed' }}>
            <colgroup>
               <col style={{ width: 50 }} />
               {Object.keys(DEFAULT_WIDTHS).map(k => <col key={k} style={{ width: colWidths[k] }} />)}
            </colgroup>
            <thead className="sticky top-0 z-30">
              <tr>
                <th className="bg-input border-r border-b border-border text-center text-[11px] font-semibold text-foreground/70 uppercase w-[50px]">No</th>
                <ResizableHeader colKey="sub" width={colWidths.sub} label="Sub Kegiatan" onResize={handleResize} />
                <ResizableHeader colKey="code" width={colWidths.code} label="Kode Rekening" onResize={handleResize} />
                <ResizableHeader colKey="name" width={colWidths.name} label="Nama Kustom / Uraian" onResize={handleResize} />
                <ResizableHeader colKey="awal" width={colWidths.awal} label="Pagu Awal" align="text-right" onResize={handleResize} />
                <ResizableHeader colKey="perubahan" width={colWidths.perubahan} label="Pagu Perubahan" align="text-right" onResize={handleResize} />
                <ResizableHeader colKey="bidang" width={colWidths.bidang} label="Bidang" onResize={handleResize} />
                <th className="bg-input border-b border-border text-center text-[11px] font-semibold text-foreground/70 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {/* Add New Row Inline */}
              <AnimatePresence>
                {showAddRow && (
                  <motion.tr 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: 'auto' }} 
                    className="bg-primary/5 group"
                  >
                    <td className={`${cellBase} text-center opacity-30`}>+</td>
                    <td className={cellBase}>
                      <input 
                        className="w-full bg-white dark:bg-input border border-primary/30 rounded-lg px-2 py-1.5 text-xs font-bold font-mono text-foreground outline-none focus:ring-1 focus:ring-primary shadow-sm"
                        placeholder="5.01..."
                        value={newRow.subKegiatan}
                        onChange={e => setNewRow({...newRow, subKegiatan: e.target.value})}
                      />
                    </td>
                    <td className={cellBase}>
                      <input 
                        className="w-full bg-white dark:bg-input border border-primary/30 rounded-lg px-2 py-1.5 font-mono text-[11px] font-black text-foreground outline-none focus:ring-1 focus:ring-primary shadow-sm"
                        placeholder="1.1.0..."
                        value={newRow.code}
                        onChange={e => setNewRow({...newRow, code: e.target.value})}
                      />
                    </td>
                    <td className={cellBase}>
                      <input 
                        className="w-full bg-white dark:bg-input border border-primary/30 rounded-lg px-2 py-1.5 text-xs font-bold text-foreground outline-none focus:ring-1 focus:ring-primary shadow-sm"
                        placeholder="Nama Rekening..."
                        value={newRow.name}
                        onChange={e => setNewRow({...newRow, name: e.target.value})}
                      />
                    </td>
                    <td className={cellBase}>
                      <input 
                        type="number"
                        className="w-full bg-white dark:bg-input border border-primary/30 rounded-lg px-2 py-1.5 text-xs font-black text-foreground outline-none focus:ring-1 focus:ring-primary text-right shadow-sm"
                        placeholder="0"
                        value={newRow.budget}
                        onChange={e => setNewRow({...newRow, budget: e.target.value})}
                      />
                    </td>
                    <td className={cellBase}>
                      <input 
                        type="number"
                        className="w-full bg-white dark:bg-input border border-primary/30 rounded-lg px-2 py-1.5 text-xs font-black text-foreground outline-none focus:ring-1 focus:ring-primary text-right shadow-sm"
                        placeholder="0"
                        value={newRow.revisedBudget}
                        onChange={e => setNewRow({...newRow, revisedBudget: e.target.value})}
                      />
                    </td>
                    <td className={cellBase}>
                      <input 
                        className="w-full bg-white dark:bg-input border border-primary/30 rounded-lg px-2 py-1.5 text-xs font-bold text-foreground outline-none focus:ring-1 focus:ring-primary shadow-sm"
                        placeholder="Sekretariat..."
                        value={newRow.division}
                        onChange={e => setNewRow({...newRow, division: e.target.value})}
                      />
                    </td>
                    <td className={cellBase}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button 
                          onClick={() => handleSaveInline(newRow.code, newRow.name, newRow.division, Number(newRow.budget), null, newRow.subKegiatan, Number(newRow.revisedBudget))}
                          disabled={savingId === 'new'}
                          className="p-1.5 bg-primary text-white rounded-lg shadow-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setShowAddRow(false)} className="p-1.5 bg-input text-muted hover:text-rose-500 rounded-lg shadow-sm">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                )}
              </AnimatePresence>

              {loading ? (
                <tr>
                  <td colSpan={8} className="px-8 py-24 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary/30 mx-auto mb-4" />
                    <p className="text-[10px] font-black text-muted uppercase tracking-[0.3em]">Memasuki spreadsheet...</p>
                  </td>
                </tr>
              ) : sortedAndFiltered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-8 py-24 text-center">
                    <p className="text-muted text-sm font-medium">Belum ada data master untuk tahun ini.</p>
                  </td>
                </tr>
              ) : (
                sortedAndFiltered.map((m, idx) => (
                  <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-primary/5 transition-colors group">
                    <td className={`${cellBase} text-center font-mono font-black text-muted/30`}>{idx + 1}</td>
                    
                    {/* SUB */}
                    <td className={cellBase}>
                      <input 
                        className="w-full bg-transparent outline-none focus:bg-white dark:focus:bg-input px-1 rounded transition-all text-muted-foreground font-mono text-[10px] focus:ring-1 focus:ring-primary"
                        value={m.subKegiatan || ''}
                        onChange={e => {
                           const val = e.target.value;
                           setMappings(prev => prev.map(p => p.id === m.id ? {...p, subKegiatan: val} : p));
                        }}
                        onBlur={() => handleSaveInline(m.code, m.name, m.division, m.budget, m.id, m.subKegiatan, m.revisedBudget)}
                      />
                    </td>

                    {/* CODE */}
                    <td className={cellBase}>
                      <input 
                        className="w-full bg-transparent outline-none focus:bg-white dark:focus:bg-input px-1 rounded transition-all font-mono text-[11px] text-primary font-black uppercase"
                        value={m.code}
                        onChange={e => {
                           const val = e.target.value;
                           setMappings(prev => prev.map(p => p.id === m.id ? {...p, code: val} : p));
                        }}
                        onBlur={() => handleSaveInline(m.code, m.name, m.division, m.budget, m.id, m.subKegiatan, m.revisedBudget)}
                      />
                    </td>

                    {/* NAME */}
                    <td className={cellBase}>
                      {editingId === m.id ? (
                        <div className="flex items-center gap-2">
                          <input 
                            className="flex-1 bg-white dark:bg-input border border-primary rounded-lg px-2 py-1 text-xs font-bold text-foreground outline-none"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSaveInline(m.code, editValue, m.division, m.budget, m.id, m.subKegiatan, m.revisedBudget)}
                            onKeyDownCapture={e => e.key === 'Escape' && setEditingId(null)}
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div 
                          className="flex items-center gap-2 cursor-pointer group/n min-h-[1.5rem]"
                          onClick={() => { setEditingId(m.id); setEditValue(m.name); }}
                        >
                          <span className="flex-1 font-medium">{m.name}</span>
                          <PencilIcon className="w-3 h-3 text-primary opacity-0 group-hover/n:opacity-100 transition-opacity" />
                        </div>
                      )}
                    </td>

                    {/* PAGU AWAL */}
                    <td className={`${cellBase} text-right`}>
                       <div className="flex items-center gap-2 justify-end group/p">
                          <input 
                            type="number"
                            className="w-full bg-transparent outline-none focus:bg-white dark:focus:bg-input border border-transparent focus:border-border px-1 py-0.5 rounded text-right font-mono font-bold text-foreground/80 tabular-nums"
                            value={m.budget || 0}
                            onChange={(e) => {
                               const newVal = Number(e.target.value);
                               setMappings(prev => prev.map(p => p.id === m.id ? {...p, budget: newVal} : p));
                            }}
                            onBlur={() => handleSaveInline(m.code, m.name, m.division, m.budget, m.id, m.subKegiatan, m.revisedBudget)}
                          />
                          <div className="relative">
                            <button 
                              onClick={() => setActiveHistoryId(activeHistoryId === m.id ? null : m.id)}
                              className={`p-1 rounded bg-primary/5 hover:bg-primary/10 transition-colors ${activeHistoryId === m.id ? 'text-primary bg-primary/20' : 'text-slate-400 opacity-0 group-hover/p:opacity-100'}`}
                            >
                              <RefreshCw className="w-3 h-3" />
                            </button>
                            <AnimatePresence>
                              {activeHistoryId === m.id && (
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                  className="absolute bottom-full right-0 mb-3 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-primary/20 p-4 z-[100] backdrop-blur-xl"
                                >
                                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
                                    <div className="flex flex-col text-left">
                                      <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Riwayat Anggaran</h4>
                                      <p className="text-[9px] text-muted font-bold truncate max-w-[200px]">{m.code}</p>
                                    </div>
                                    <button onClick={() => setActiveHistoryId(null)} className="p-1.5 bg-muted/10 rounded-lg">
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  <div className="space-y-4 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                                    {m.budgetLogs.map((log: any) => (
                                      <div key={log.id} className="relative pl-6 border-l-2 border-primary/20 pb-1 text-left">
                                        <div className="absolute -left-[9px] top-0 w-4 h-4 bg-white dark:bg-slate-900 border-2 border-primary rounded-full flex items-center justify-center">
                                          <div className={`w-1.5 h-1.5 rounded-full ${log.field === 'revisedBudget' ? 'bg-indigo-500' : 'bg-primary'}`} />
                                        </div>
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-[10px] font-black text-foreground uppercase tracking-tight">
                                            {log.field === 'revisedBudget' ? 'Pagu Perubahan' : 'Pagu Awal'}
                                          </span>
                                          <span className="text-[8px] font-bold text-muted">{new Date(log.createdAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mb-2 p-2 bg-slate-50 dark:bg-black/20 rounded-xl border border-border/50">
                                          <span className="text-[10px] line-through text-muted/30 font-mono italic">Rp{formatCurrency(log.oldBudget)}</span>
                                          <ChevronDown className="w-3 h-3 text-emerald-500 -rotate-90 opacity-50" />
                                          <span className={`text-[11px] font-black font-mono ${log.newBudget > log.oldBudget ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            Rp{formatCurrency(log.newBudget)}
                                          </span>
                                        </div>
                                        <p className="text-[9px] text-foreground/70 leading-snug italic px-1">"{log.reason}"</p>
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                       </div>
                    </td>

                    {/* PAGU PERUBAHAN */}
                    <td className={`${cellBase} text-right`}>
                       <input 
                         type="number"
                         className={`w-full bg-transparent outline-none focus:bg-white dark:focus:bg-input px-1 py-0.5 rounded text-right font-mono font-black tabular-nums transition-colors ${m.revisedBudget > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-foreground/10'}`}
                         value={m.revisedBudget || 0}
                         onChange={(e) => {
                            const newVal = Number(e.target.value);
                            setMappings(prev => prev.map(p => p.id === m.id ? {...p, revisedBudget: newVal} : p));
                         }}
                         onBlur={() => handleSaveInline(m.code, m.name, m.division, m.budget, m.id, m.subKegiatan, m.revisedBudget)}
                       />
                    </td>

                    {/* BIDANG */}
                    <td className={cellBase}>
                        <input 
                          className="w-full bg-transparent outline-none focus:bg-white dark:focus:bg-input px-1 rounded transition-all text-muted-foreground font-medium"
                          value={m.division || ''}
                          onChange={(e) => {
                             const newVal = e.target.value;
                             setMappings(prev => prev.map(p => p.id === m.id ? {...p, division: newVal} : p));
                          }}
                          onBlur={() => handleSaveInline(m.code, m.name, m.division, m.budget, m.id, m.subKegiatan, m.revisedBudget)}
                        />
                    </td>

                    {/* AKSI */}
                    <td className={`${cellBase} text-center`}>
                       <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         {m.revisedBudget > 0 && useRevisedBudgetMode && (
                           <div title="Pagu Perubahan Aktif" className="p-1.5 text-emerald-500">
                             <CheckCircle2 className="w-4 h-4" />
                           </div>
                         )}
                         <button onClick={() => handleDelete(m.id)} className="p-1.5 text-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all">
                           <Trash2 className="w-3.5 h-3.5" />
                         </button>
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between px-1 text-[10px] text-foreground/30 font-black uppercase tracking-widest mt-1">
          <span>{sortedAndFiltered.length} REKENING · SERET BATAS KOLOM UNTUK RESIZE</span>
          <div className="flex items-center gap-3">
             <span className="flex items-center gap-1.5"><CircleIcon className="w-2.5 h-2.5 fill-primary text-primary" /> Pagu Awal</span>
             <span className="flex items-center gap-1.5"><CircleIcon className="w-2.5 h-2.5 fill-indigo-500 text-indigo-500" /> Pagu Perubahan</span>
          </div>
        </div>
      </div>
    </div>
  )
}
