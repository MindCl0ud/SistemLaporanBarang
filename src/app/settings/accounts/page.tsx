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
  Pencil as PencilIcon,
  Clock
} from 'lucide-react'
import { getAccountMappings, upsertAccountMapping, deleteAccountMapping, syncAccountCodesFromBku, upsertAccountMappingBulk } from '@/app/actions/bkuActions'
import { getBudgetMode, updateBudgetMode } from '@/app/actions/settingsActions'
import * as XLSX from 'xlsx'
import LoadingState from '@/components/LoadingState'

const DEFAULT_WIDTHS = {
  sub: 160,
  code: 150,
  name: 510,
  awal: 170,
  perubahan: 170,
  bidang: 140
}

function ResizableHeader({ colKey, width, label, onResize, align = 'text-left', isLast = false }: any) {
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.pageX
    const initialWidth = width
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.pageX - startX
      onResize(colKey, initialWidth + delta)
    }
    
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  return (
    <th className={`bg-input border-r border-b border-border p-0 relative transition-colors hover:bg-slate-100 dark:hover:bg-primary/5 group/h min-w-[${width}px]`} style={{ width }}>
      <div className={`px-4 py-3 text-[11px] font-black text-foreground/70 uppercase tracking-wider ${align}`}>
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
  const [savedId, setSavedId] = useState<string | null>(null)

  // Persistence State
  const [modifiedIds, setModifiedIds] = useState<Set<string>>(new Set())
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [isSavingAll, setIsSavingAll] = useState(false)
  const [backupMappings, setBackupMappings] = useState<any[]>([])

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
  const [historyData, setHistoryData] = useState<any | null>(null)
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

  const handleResize = useCallback((key: string, newWidth: number) => {
    setColWidths(prev => ({ ...prev, [key]: Math.max(40, newWidth) }))
  }, [])

  const fetchMappings = async () => {
    setLoading(true)
    try {
      const data = await getAccountMappings(selectedYear)
      setMappings(data)
      setBackupMappings(JSON.parse(JSON.stringify(data)))
      setModifiedIds(new Set())
    } finally {
      setLoading(false)
    }
  }

  const handleSaveInline = async (code: string, name: string, division?: string | null, budget?: number | null, id?: string, subKegiatan?: string | null, revisedBudget?: number | null) => {
    if (!code || !name) return
    const mappingId = id || 'new'
    
    // Add to saving state
    if (id) setSavingIds(prev => new Set(prev).add(id))
    else setSavingId('new')

    try {
      const updated = await upsertAccountMapping(code, name, division || undefined, budget || 0, subKegiatan || undefined, selectedYear, revisedBudget || 0)
      
      if (updated) {
        setMappings(prev => {
          const exists = prev.some(m => m.id === updated.id)
          if (exists) {
            return prev.map(m => m.id === updated.id ? updated : m)
          } else {
            return [...prev, updated]
          }
        })
        // Update backup
        setBackupMappings(prev => {
           const exists = prev.some(m => m.id === updated.id)
           if (exists) return prev.map(m => m.id === updated.id ? updated : m)
           return [...prev, updated]
        })
        // Unmark modified
        if (id) {
           setModifiedIds(prev => {
             const next = new Set(prev)
             next.delete(id)
             return next
           })
        }
      }

      setNewRow({ code: '', name: '', division: '', budget: '', revisedBudget: '', subKegiatan: '' })
      
      const currentId = id || updated?.id || 'new'
      setSavedId(currentId)
      setTimeout(() => setSavedId(null), 3000)

    } finally {
      if (id) setSavingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      else setSavingId(null)
    }
  }

  const handleSaveAllBatch = async () => {
    if (modifiedIds.size === 0) return
    setIsSavingAll(true)
    try {
      const selectedMappings = mappings.filter(m => modifiedIds.has(m.id))
      const res = await upsertAccountMappingBulk(selectedMappings, selectedYear)
      if (res.count > 0) {
        // Refresh all because logs and IDs might have changed/added
        await fetchMappings()
        alert(`Berhasil menyimpan ${res.count} perubahan.`)
      }
    } catch (e) {
      console.error(e)
      alert("Gagal menyimpan perubahan batch.")
    } finally {
      setIsSavingAll(false)
    }
  }

  const handleCancelRow = (id: string) => {
    const original = backupMappings.find(m => m.id === id)
    if (original) {
      setMappings(prev => prev.map(m => m.id === id ? JSON.parse(JSON.stringify(original)) : m))
      setModifiedIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const handleUpdateField = (id: string, field: string, value: any) => {
    setMappings(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m))
    setModifiedIds(prev => new Set(prev).add(id))
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus pemetaan ini?')) return
    await deleteAccountMapping(id)
    setMappings(prev => prev.filter(m => m.id !== id))
  }

  const handleSync = async () => {
    setLoading(true)
    try {
      const res = await syncAccountCodesFromBku(selectedYear)
      console.log(`${res.count} rekening baru disinkronkan`)
      fetchMappings()
    } finally {
      setLoading(false)
    }
  }

  const handleExportTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { "Sub Kegiatan": "5.01.01.2.02.5", "Kode Rekening": "1.1.03.07.5.1.02.02.01.0090", "Uraian": "Bayar biaya...", "Pagu Awal": 1000000, "Pagu Perubahan": 0, "Bidang": "Sekretariat" }
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Template")
    XLSX.writeFile(wb, `Template_Master_Rekening_${selectedYear}.xlsx`)
  }

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setIsImporting(true)
    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json(ws)
        
        const prepared = data.map((row: any) => ({
          subKegiatan: row["Sub Kegiatan"]?.toString(),
          code: row["Kode Rekening"]?.toString(),
          name: row["Uraian"]?.toString(),
          budget: Number(row["Pagu Awal"] || 0),
          revisedBudget: Number(row["Pagu Perubahan"] || 0),
          division: row["Bidang"]?.toString()
        }))

        await upsertAccountMappingBulk(prepared, selectedYear)
        console.log("Impor data berhasil")
        fetchMappings()
      } catch (err) {
        console.error("Gagal mengimpor file", err)
      } finally {
        setIsImporting(false)
      }
    }
    reader.readAsBinaryString(file)
  }

  const sortedAndFiltered = useMemo(() => {
    let result = [...mappings]
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(m => 
        m.code.toLowerCase().includes(s) || 
        m.name.toLowerCase().includes(s) ||
        m.subKegiatan?.toLowerCase().includes(s) ||
        m.division?.toLowerCase().includes(s)
      )
    }
    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key] || ''
        const bVal = b[sortConfig.key] || ''
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
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
          {modifiedIds.size > 0 && (
            <button
              onClick={handleSaveAllBatch}
              disabled={isSavingAll}
              className="flex items-center gap-2 px-6 py-4 bg-indigo-600 text-white rounded-2xl text-sm font-black shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
            >
              {isSavingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Simpan Semua ({modifiedIds.size})
            </button>
          )}

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
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-primary/5 border-b-2 border-primary"
                  >
                    <td className={`${cellBase} text-center font-mono font-black text-primary`}>NEW</td>
                    <td className={cellBase}>
                      <input 
                        className="w-full bg-white dark:bg-input border border-primary/30 rounded px-1 outline-none font-mono text-[10px]"
                        placeholder="5.01..."
                        value={newRow.subKegiatan}
                        onChange={e => setNewRow({...newRow, subKegiatan: e.target.value})}
                        onKeyDown={e => e.key === 'Enter' && handleSaveInline(newRow.code, newRow.name, newRow.division, Number(newRow.budget), undefined, newRow.subKegiatan, Number(newRow.revisedBudget))}
                      />
                    </td>
                    <td className={cellBase}>
                      <input 
                        className="w-full bg-white dark:bg-input border border-primary/30 rounded px-1 outline-none font-mono text-[11px]"
                        placeholder="1.1.0..."
                        value={newRow.code}
                        onChange={e => setNewRow({...newRow, code: e.target.value})}
                        onKeyDown={e => e.key === 'Enter' && handleSaveInline(newRow.code, newRow.name, newRow.division, Number(newRow.budget), undefined, newRow.subKegiatan, Number(newRow.revisedBudget))}
                      />
                    </td>
                    <td className={cellBase}>
                      <input 
                        className="w-full bg-white dark:bg-input border border-primary/30 rounded px-1 outline-none font-bold"
                        placeholder="Uraian baru..."
                        value={newRow.name}
                        onChange={e => setNewRow({...newRow, name: e.target.value})}
                        onKeyDown={e => e.key === 'Enter' && handleSaveInline(newRow.code, newRow.name, newRow.division, Number(newRow.budget), undefined, newRow.subKegiatan, Number(newRow.revisedBudget))}
                      />
                    </td>
                    <td className={cellBase}>
                      <input 
                        type="number"
                        className="w-full bg-white dark:bg-input border border-primary/30 rounded px-1 outline-none text-right font-mono"
                        placeholder="0"
                        value={newRow.budget}
                        onChange={e => setNewRow({...newRow, budget: e.target.value})}
                        onKeyDown={e => e.key === 'Enter' && handleSaveInline(newRow.code, newRow.name, newRow.division, Number(newRow.budget), undefined, newRow.subKegiatan, Number(newRow.revisedBudget))}
                      />
                    </td>
                    <td className={cellBase}>
                      <input 
                        type="number"
                        className="w-full bg-white dark:bg-input border border-primary/30 rounded px-1 outline-none text-right font-mono"
                        placeholder="0"
                        value={newRow.revisedBudget}
                        onChange={e => setNewRow({...newRow, revisedBudget: e.target.value})}
                        onKeyDown={e => e.key === 'Enter' && handleSaveInline(newRow.code, newRow.name, newRow.division, Number(newRow.budget), undefined, newRow.subKegiatan, Number(newRow.revisedBudget))}
                      />
                    </td>
                    <td className={cellBase}>
                      <input 
                        className="w-full bg-white dark:bg-input border border-primary/30 rounded px-1 outline-none"
                        placeholder="Sekretariat..."
                        value={newRow.division}
                        onChange={e => setNewRow({...newRow, division: e.target.value})}
                        onKeyDown={e => e.key === 'Enter' && handleSaveInline(newRow.code, newRow.name, newRow.division, Number(newRow.budget), undefined, newRow.subKegiatan, Number(newRow.revisedBudget))}
                      />
                    </td>
                    <td className={cellBase}>
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          onClick={() => handleSaveInline(newRow.code, newRow.name, newRow.division, Number(newRow.budget), undefined, newRow.subKegiatan, Number(newRow.revisedBudget))}
                          className="p-1.5 bg-primary text-white rounded-lg shadow-sm hover:scale-110 transition-all font-black"
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
                  <td colSpan={8} className="p-0 border-none">
                    <LoadingState 
                      message="Menyiapkan Spreadsheet" 
                      subtitle="MASTER DATA REKENING"
                      className="min-h-[400px]" 
                    />
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
                    <td className={`${cellBase} p-0 relative group/cell ${modifiedIds.has(m.id) ? 'bg-amber-500/5' : ''}`}>
                      <input 
                        className="w-full bg-transparent border-none p-2 outline-none focus:bg-white dark:focus:bg-white/5 text-muted-foreground font-mono text-[10px]"
                        value={m.subKegiatan || ''}
                        onChange={e => handleUpdateField(m.id, 'subKegiatan', e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveInline(m.code, m.name, m.division, m.budget, m.id, m.subKegiatan, m.revisedBudget)
                          if (e.key === 'Escape') handleCancelRow(m.id)
                        }}
                      />
                      {modifiedIds.has(m.id) && <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-amber-500/50" />}
                    </td>

                    {/* CODE */}
                    <td className={`${cellBase} p-0 relative group/cell ${modifiedIds.has(m.id) ? 'bg-amber-500/5' : ''}`}>
                      <input 
                        className="w-full bg-transparent border-none p-2 outline-none focus:bg-white dark:focus:bg-white/5 font-mono text-[11px] text-primary font-black uppercase"
                        value={m.code}
                        onChange={e => handleUpdateField(m.id, 'code', e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveInline(m.code, m.name, m.division, m.budget, m.id, m.subKegiatan, m.revisedBudget)
                          if (e.key === 'Escape') handleCancelRow(m.id)
                        }}
                      />
                      {modifiedIds.has(m.id) && <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-amber-500/50" />}
                    </td>

                    {/* NAME */}
                    <td className={`${cellBase} p-0 relative group/cell ${modifiedIds.has(m.id) ? 'bg-amber-500/5' : ''}`}>
                      <textarea 
                        className="w-full bg-transparent border-none p-2 outline-none focus:bg-white dark:focus:bg-white/5 font-medium whitespace-pre-wrap leading-relaxed text-[12px] resize-none overflow-hidden min-h-[3rem]"
                        value={m.name}
                        rows={Math.max(1, (m.name || '').split('\n').length)}
                        onChange={e => {
                           handleUpdateField(m.id, 'name', e.target.value);
                           e.target.style.height = 'auto';
                           e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        onKeyDown={e => {
                           if (e.key === 'Enter' && !e.shiftKey) {
                             e.preventDefault();
                             handleSaveInline(m.code, m.name, m.division, m.budget, m.id, m.subKegiatan, m.revisedBudget);
                           }
                           if (e.key === 'Escape') handleCancelRow(m.id);
                        }}
                        onFocus={e => {
                           e.target.style.height = 'auto';
                           e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                      />
                      {modifiedIds.has(m.id) && <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-amber-500/50" />}
                      <div className="absolute right-2 bottom-1 shrink-0 flex items-center gap-1 pointer-events-none">
                        {savingIds.has(m.id) ? (
                          <Loader2 className="w-3 h-3 text-primary animate-spin" />
                        ) : savedId === m.id ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-500 animate-in fade-in zoom-in duration-300" />
                        ) : null}
                      </div>
                    </td>

                    {/* PAGU AWAL */}
                    <td className={`${cellBase} p-0 relative group/cell text-right ${modifiedIds.has(m.id) ? 'bg-amber-500/5' : ''}`}>
                       <div className="flex items-center gap-2 justify-end w-full h-full pr-2">
                          <input 
                            type="number"
                            className="w-full bg-transparent border-none p-2 outline-none focus:bg-white dark:focus:bg-white/5 text-right font-mono font-bold text-foreground/80 tabular-nums"
                            value={m.budget || 0}
                            onChange={(e) => handleUpdateField(m.id, 'budget', Number(e.target.value))}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveInline(m.code, m.name, m.division, m.budget, m.id, m.subKegiatan, m.revisedBudget)
                              if (e.key === 'Escape') handleCancelRow(m.id)
                            }}
                          />
                            <button 
                              onClick={() => setHistoryData(m)}
                              className={`p-1 rounded bg-primary/5 hover:bg-primary/10 transition-colors ${savedId === m.id ? 'text-primary bg-primary/20' : 'text-slate-400 opacity-0 group-hover/cell:opacity-100'}`}
                            >
                              <RefreshCw className="w-3 h-3" />
                            </button>
                       </div>
                       {modifiedIds.has(m.id) && <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-amber-500/50" />}
                    </td>

                    {/* PAGU PERUBAHAN */}
                    <td className={`${cellBase} p-0 relative group/cell text-right ${modifiedIds.has(m.id) ? 'bg-amber-500/5' : ''}`}>
                       <input 
                         type="number"
                         className={`w-full bg-transparent border-none p-2 outline-none focus:bg-white dark:focus:bg-white/5 text-right font-mono font-black tabular-nums transition-colors ${m.revisedBudget > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-foreground/10'}`}
                         value={m.revisedBudget || 0}
                         onChange={(e) => handleUpdateField(m.id, 'revisedBudget', Number(e.target.value))}
                         onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveInline(m.code, m.name, m.division, m.budget, m.id, m.subKegiatan, m.revisedBudget)
                            if (e.key === 'Escape') handleCancelRow(m.id)
                         }}
                       />
                       {modifiedIds.has(m.id) && <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-amber-500/50" />}
                    </td>

                    {/* BIDANG */}
                    <td className={`${cellBase} p-0 relative group/cell ${modifiedIds.has(m.id) ? 'bg-amber-500/5' : ''}`}>
                        <input 
                          className="w-full bg-transparent border-none p-2 outline-none focus:bg-white dark:focus:bg-white/5 text-muted-foreground font-medium"
                          value={m.division || ''}
                          onChange={(e) => handleUpdateField(m.id, 'division', e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveInline(m.code, m.name, m.division, m.budget, m.id, m.subKegiatan, m.revisedBudget)
                            if (e.key === 'Escape') handleCancelRow(m.id)
                          }}
                        />
                        {modifiedIds.has(m.id) && <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-amber-500/50" />}
                    </td>

                    {/* AKSI */}
                    <td className={`${cellBase} text-center`}>
                       <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         {modifiedIds.has(m.id) ? (
                           <>
                             <button
                               disabled={savingIds.has(m.id)}
                               onClick={() => handleSaveInline(m.code, m.name, m.division, m.budget, m.id, m.subKegiatan, m.revisedBudget)}
                               className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all"
                               title="Simpan Baris"
                             >
                               {savingIds.has(m.id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                             </button>
                             <button
                               onClick={() => handleCancelRow(m.id)}
                               className="p-1.5 text-muted hover:text-slate-500 rounded-lg transition-all"
                               title="Batal Edit"
                             >
                               <X className="w-3.5 h-3.5" />
                             </button>
                           </>
                         ) : (
                           <>
                             <button onClick={() => handleDelete(m.id)} className="p-1.5 text-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all">
                               <Trash2 className="w-3.5 h-3.5" />
                             </button>
                           </>
                         )}
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
          <span>{sortedAndFiltered.length} REKENING · SERET BATAS KOLOM UNTUK RESIZE · TEKAN ENTER UNTUK SIMPAN BARIS</span>
          <div className="flex items-center gap-3">
             <span className="flex items-center gap-1.5"><CircleIcon className="w-2.5 h-2.5 fill-primary text-primary" /> Pagu Awal</span>
             <span className="flex items-center gap-1.5"><CircleIcon className="w-2.5 h-2.5 fill-indigo-500 text-indigo-500" /> Pagu Perubahan</span>
          </div>
        </div>
      </div>

      {/* History Modal Overlay */}
      <AnimatePresence>
        {historyData && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setHistoryData(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-primary/20 overflow-hidden"
            >
              <div className="p-8 border-b border-border flex items-center justify-between bg-primary/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-lg font-black text-foreground uppercase tracking-tight">Riwayat Anggaran</h3>
                    <p className="text-xs text-muted font-bold tracking-widest uppercase opacity-50">{historyData.code}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setHistoryData(null)}
                  className="p-3 bg-muted/10 hover:bg-muted/20 rounded-2xl transition-all active:scale-95"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-6">
                {historyData.name && (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-black/20 border border-border/50 mb-6 font-medium text-xs text-foreground/80 leading-relaxed italic">
                    "{historyData.name}"
                  </div>
                )}
                
                {historyData.budgetLogs?.length > 0 ? (
                  <div className="space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-primary/10">
                    {historyData.budgetLogs.map((log: any) => (
                      <div key={log.id} className="relative pl-10 group">
                        <div className="absolute left-0 top-1 w-6 h-6 bg-white dark:bg-slate-900 border-2 border-primary rounded-full flex items-center justify-center z-10 shadow-sm group-hover:scale-110 transition-transform">
                          <div className={`w-2 h-2 rounded-full ${log.field === 'revisedBudget' ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'bg-primary shadow-[0_0_8px_rgba(59,130,246,0.5)]'}`} />
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${log.field === 'revisedBudget' ? 'text-indigo-500' : 'text-primary'}`}>
                              {log.field === 'revisedBudget' ? 'Update Pagu Perubahan' : 'Update Pagu Awal'}
                            </span>
                            <span className="text-[10px] font-bold text-muted tabular-nums">
                              {new Date(log.createdAt).toLocaleString('id-ID', { 
                                day: '2-digit', 
                                month: 'long', 
                                year: 'numeric',
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-black/40 rounded-2xl border border-border/50">
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-muted uppercase tracking-widest mb-1">Sebelum</span>
                              <span className="text-xs font-mono text-muted/50 line-through">Rp{formatCurrency(log.oldBudget)}</span>
                            </div>
                            <ChevronDown className="w-4 h-4 text-emerald-500 -rotate-90 opacity-40 shrink-0" />
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-primary uppercase tracking-widest mb-1">Sesudah</span>
                              <span className={`text-sm font-black font-mono tracking-tight ${log.newBudget > log.oldBudget ? 'text-emerald-500' : 'text-rose-500'}`}>
                                Rp{formatCurrency(log.newBudget)}
                              </span>
                            </div>
                          </div>

                          {log.reason && (
                            <p className="text-[11px] text-foreground/70 font-medium italic pl-1 leading-relaxed opacity-80">
                              Laporan: "{log.reason}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center">
                    <Clock className="w-12 h-12 text-muted/20 mx-auto mb-4" />
                    <p className="text-sm font-bold text-muted uppercase tracking-widest">Belum ada riwayat aktivitas</p>
                  </div>
                )}
              </div>

              <div className="p-8 bg-slate-50 dark:bg-black/20 border-t border-border mt-auto">
                 <button 
                  onClick={() => setHistoryData(null)}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all active:scale-95"
                 >
                   Selesai Membaca
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
