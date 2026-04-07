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
  fullDetail: 550, // Program, Kegiatan, Sub Keg, Uraian, Kode Belanja
  awal: 110,
  perubahan: 110,
  realisasi: 110,
  sisa: 110,
  bidang: 120
}

const autoInferCodes = (code: string, currentMappings: any[] = []) => {
  const parts = code.split('.')
  let res = { program: '', kegiatan: '', namaProgram: '', namaKegiatan: '', namaSubKeg: '' }
  
  if (parts.length >= 3) {
    res.program = parts.slice(0, 3).join('.')
    // Find existing name
    const existing = currentMappings.find(m => m.kodeProgram === res.program)
    if (existing) res.namaProgram = existing.namaProgram
  }
  if (parts.length >= 5) {
    res.kegiatan = parts.slice(0, 5).join('.')
    const existing = currentMappings.find(m => m.kodeKegiatan === res.kegiatan)
    if (existing) res.namaKegiatan = existing.namaKegiatan
  }
  if (parts.length >= 6) {
    const existing = currentMappings.find(m => m.kodeSubKeg === code)
    if (existing) res.namaSubKeg = existing.namaSubKeg
  }
  return res
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('id-ID').format(val)
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
    <th className={`bg-slate-100/90 dark:bg-slate-900/95 backdrop-blur-sm border-r border-b-2 border-border p-0 relative transition-colors hover:bg-slate-200 dark:hover:bg-primary/5 group/h min-w-[${width}px]`} style={{ width }}>
      <div className={`px-4 py-3 text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight ${align}`}>
        {label}
      </div>
      {!isLast && (
        <div onMouseDown={onMouseDown}
          className="absolute right-0 top-0 h-full w-2 cursor-col-resize flex items-center justify-center group z-10">
          <div className="w-0.5 h-4 bg-foreground/5 group-hover/h:bg-primary/50 transition-colors" />
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
    kodeProgram: '',
    namaProgram: '',
    kodeKegiatan: '',
    namaKegiatan: '',
    kodeSubKeg: '', 
    namaSubKeg: '',
    kodeBelanja: '', 
    name: '', 
    division: '', 
    budget: '', 
    revisedBudget: ''
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

  const handleSaveInline = async (
    kodeBelanja: string, 
    name: string, 
    division?: string | null, 
    budget?: number | null, 
    id?: string, 
    kodeSubKeg?: string | null, 
    revisedBudget?: number | null,
    hierarchy?: any
  ) => {
    if (!kodeBelanja || !name) return
    const mappingId = id || 'new'
    
    // Add to saving state
    if (id) setSavingIds(prev => new Set(prev).add(id))
    else setSavingId('new')

    try {
      const updated = await upsertAccountMapping(
        kodeBelanja, 
        name, 
        division || undefined, 
        budget || 0, 
        kodeSubKeg || undefined, 
        selectedYear, 
        revisedBudget || 0,
        hierarchy
      )
      
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

      setNewRow({ 
        kodeProgram: '',
        namaProgram: '',
        kodeKegiatan: '',
        namaKegiatan: '',
        kodeSubKeg: '', 
        namaSubKeg: '',
        kodeBelanja: '', 
        name: '', 
        division: '', 
        budget: '', 
        revisedBudget: ''
      })
      
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
    setModifiedIds(prev => new Set(prev).add(id))
    setMappings(prev => prev.map(m => {
      if (m.id === id) {
        const updated = { ...m, [field]: value }
        
        // Auto Inference matching patterns
        if (field === 'kodeSubKeg' && typeof value === 'string') {
          const { program, kegiatan, namaProgram, namaKegiatan, namaSubKeg } = autoInferCodes(value, mappings)
          if (program) updated.kodeProgram = program
          if (kegiatan) updated.kodeKegiatan = kegiatan
          if (namaProgram) updated.namaProgram = namaProgram
          if (namaKegiatan) updated.namaKegiatan = namaKegiatan
          if (namaSubKeg) updated.namaSubKeg = namaSubKeg
        }
        
        return updated
      }
      return m
    }))
  }

  const handleUpdateHierarchyField = (codeType: 'kodeProgram' | 'kodeKegiatan' | 'kodeSubKeg', codeValue: string, field: string, value: string) => {
    setMappings(prev => prev.map(m => {
      // If codeType matches the current row's code, update the field
      if (m[codeType] === codeValue) {
        setModifiedIds(s => new Set(s).add(m.id))
        return { ...m, [field]: value }
      }
      return m
    }))
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
      { 
        "Kode Program": "5.01.01",
        "Nama Program": "Program Penunjang...",
        "Kode Kegiatan": "5.01.01.2.02",
        "Nama Kegiatan": "Penyediaan Jasa...",
        "Kode Sub Kegiatan": "5.01.01.2.02.5", 
        "Nama Sub Kegiatan": "Penyediaan Jasa...",
        "Kode Belanja": "1.1.03.07.5.1.02.02.01.0090", 
        "Uraian": "Bayar biaya...", 
        "Pagu Awal": 1000000, 
        "Pagu Perubahan": 0, 
        "Bidang": "Sekretariat" 
      }
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
          kodeProgram: row["Kode Program"]?.toString(),
          namaProgram: row["Nama Program"]?.toString(),
          kodeKegiatan: row["Kode Kegiatan"]?.toString(),
          namaKegiatan: row["Nama Kegiatan"]?.toString(),
          kodeSubKeg: row["Kode Sub Kegiatan"]?.toString(),
          namaSubKeg: row["Nama Sub Kegiatan"]?.toString(),
          kodeBelanja: row["Kode Belanja"]?.toString() || row["Kode Rekening"]?.toString(),
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
        m.kodeBelanja.toLowerCase().includes(s) || 
        m.name.toLowerCase().includes(s) ||
        m.kodeSubKeg?.toLowerCase().includes(s) ||
        m.namaSubKeg?.toLowerCase().includes(s) ||
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
  const cellBase = `border-r border-b border-border/60 px-3 py-2 text-[12px] align-top bg-background text-foreground transition-all duration-200`

  return (
    <div className="w-full mx-auto px-4 py-6 space-y-6 min-h-screen bg-slate-50/30 dark:bg-transparent">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-slate-200 dark:bg-slate-800 border border-border text-muted-foreground text-[9px] font-bold uppercase tracking-wider mb-1">
            <Hash className="w-3 h-3" /> Master Data Management
          </div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-3 tracking-tighter">
            <div className="p-2 rounded-sm border border-border shadow-md">
              <ListTree className="w-5 h-5" />
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
                  <span className="px-1.5 py-0.5 rounded-sm bg-indigo-500 text-white text-[8px] font-black uppercase tracking-widest">Revised</span>
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
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-sm text-xs font-bold shadow-sm hover:bg-indigo-700 transition-all disabled:opacity-50"
            >
              {isSavingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Simpan Semua ({modifiedIds.size})
            </button>
          )}

          <button
            onClick={() => setShowAddRow(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-sm text-xs font-bold shadow-sm hover:bg-primary/90 transition-all"
          >
            <Plus className="w-4 h-4" /> Tambah Manual
          </button>
          
          <div className="flex items-center bg-white dark:bg-card border border-border rounded-sm overflow-hidden shadow-sm">
             <button
                onClick={handleExportTemplate}
                className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 transition-all text-[11px] font-bold text-foreground border-r border-border"
                title="Unduh Template Excel"
              >
                <Download className="w-3.5 h-3.5 text-primary" />
                Template
              </button>
              <label className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 transition-all text-[11px] font-bold text-foreground cursor-pointer">
                <UploadCloud className="w-3.5 h-3.5 text-emerald-500" />
                {isImporting ? "..." : "Impor Excel"}
                <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImportExcel} disabled={loading} />
              </label>
          </div>

          <button
            onClick={handleSync}
            disabled={loading}
            className="group flex items-center gap-2 px-4 py-2 bg-white dark:bg-card hover:bg-slate-50 text-foreground rounded-sm text-xs font-bold border border-border transition-all shadow-sm active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 transition-transform group-hover:rotate-180 duration-500 ${loading ? 'animate-spin' : ''}`} />
            Sync BKU
          </button>

          <div className="relative">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className={`p-2 rounded-sm border border-border shadow-sm ${showConfig ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-card text-foreground border-border hover:bg-slate-50'}`}
            >
              <SettingsIcon className={`w-4 h-4 ${showConfig ? 'animate-spin' : ''}`} />
            </button>
            
            <AnimatePresence>
              {showConfig && (
                <motion.div 
                  initial={{ opacity: 0, y: 5, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.98 }}
                  className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-900 border border-border rounded-md shadow-xl p-4 z-[50]"
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
      <div className="flex items-center gap-3 bg-white dark:bg-card p-1 pr-3 rounded-md border border-border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Cari berdasarkan kode, nama, sub kegiatan atau bidang..."
            className="w-full bg-transparent border-none rounded-md pl-12 pr-4 py-2.5 text-sm font-semibold text-foreground outline-none placeholder:text-muted/40"
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

        <div className="overflow-auto border border-border bg-background custom-scrollbar shadow-lg w-full max-h-[75vh] rounded-none">
          <table className="border-collapse w-full" style={{ minWidth: totalWidth, tableLayout: 'fixed' }}>
            <colgroup>
               <col style={{ width: 50 }} />
               {Object.keys(DEFAULT_WIDTHS).map(k => <col key={k} style={{ width: colWidths[k] }} />)}
            </colgroup>
            <thead className="sticky top-0 z-30">
              <tr>
                <th className="bg-slate-100/90 dark:bg-slate-900/95 backdrop-blur-sm border-r border-b-2 border-border text-center text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase w-[50px] sticky left-0 z-20 transition-colors">No</th>
                <ResizableHeader colKey="fullDetail" width={colWidths.fullDetail} label="Detail Rekening / Hirarki" onResize={handleResize} />
                <ResizableHeader colKey="awal" width={colWidths.awal} label="Pagu Awal" align="text-right" onResize={handleResize} />
                <ResizableHeader colKey="perubahan" width={colWidths.perubahan} label="Pagu Perubahan" align="text-right" onResize={handleResize} />
                <ResizableHeader colKey="realisasi" width={colWidths.realisasi} label="Realisasi (BKU)" align="text-right" onResize={handleResize} />
                <ResizableHeader colKey="sisa" width={colWidths.sisa} label="Sisa Anggaran" align="text-right" onResize={handleResize} />
                <ResizableHeader colKey="bidang" width={colWidths.bidang} label="Bidang" onResize={handleResize} />
                <th className="bg-slate-100/90 dark:bg-slate-900/95 backdrop-blur-sm border-l border-b-2 border-border text-center text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase sticky right-0 z-20 w-[60px] transition-colors">Aksi</th>
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
                    <td className={`${cellBase} text-center font-mono font-black text-primary sticky left-0 z-10 bg-white dark:bg-slate-900`}>NEW</td>
                    {/* FULL HIERARCHY (COMBINED) */}
                    <td className={cellBase}>
                      <div className="flex flex-col gap-2 p-1">
                        {/* Section 1: Program */}
                        <div className="flex flex-col gap-1">
                           <span className="text-[7px] font-black uppercase text-primary tracking-widest opacity-50">1. PROGRAM</span>
                           <input 
                             className="w-full bg-slate-50 dark:bg-black/10 border border-border rounded-sm px-1.5 py-0.5 text-[10px] font-bold"
                             placeholder="Nama Program"
                             value={newRow.namaProgram}
                             onChange={e => setNewRow({...newRow, namaProgram: e.target.value})}
                           />
                           <input 
                             className="w-full bg-slate-50 dark:bg-black/10 border border-border rounded-sm px-1.5 py-0.5 text-[8px] font-mono"
                             placeholder="Kode Program"
                             value={newRow.kodeProgram}
                             onChange={e => setNewRow({...newRow, kodeProgram: e.target.value})}
                           />
                        </div>
                        <div className="border-t border-border border-dashed my-1" />
                        {/* Section 2: Kegiatan */}
                        <div className="flex flex-col gap-1">
                           <span className="text-[7px] font-black uppercase text-primary tracking-widest opacity-50">2. KEGIATAN</span>
                           <input 
                             className="w-full bg-slate-50 dark:bg-black/10 border border-border rounded-sm px-1.5 py-0.5 text-[10px] font-bold"
                             placeholder="Nama Kegiatan"
                             value={newRow.namaKegiatan}
                             onChange={e => setNewRow({...newRow, namaKegiatan: e.target.value})}
                           />
                           <input 
                             className="w-full bg-slate-50 dark:bg-black/10 border border-border rounded-sm px-1.5 py-0.5 text-[8px] font-mono"
                             placeholder="Kode Kegiatan"
                             value={newRow.kodeKegiatan}
                             onChange={e => setNewRow({...newRow, kodeKegiatan: e.target.value})}
                           />
                        </div>
                        <div className="border-t border-border border-dashed my-1" />
                        {/* Section 3: Sub Kegiatan */}
                        <div className="flex flex-col gap-1">
                           <span className="text-[7px] font-black uppercase text-primary tracking-widest opacity-50">3. SUB KEGIATAN</span>
                           <input 
                             className="w-full bg-white dark:bg-input border border-border rounded-sm px-1.5 py-1 text-[11px] font-black"
                             placeholder="Nama Sub Kegiatan"
                             value={newRow.namaSubKeg}
                             onChange={e => setNewRow({...newRow, namaSubKeg: e.target.value})}
                           />
                           <input 
                             className="w-full bg-white dark:bg-input border border-border rounded-sm px-1.5 py-0.5 text-[9px] font-mono"
                             placeholder="Kode Sub Kegiatan"
                             value={newRow.kodeSubKeg}
                             onChange={e => {
                               const val = e.target.value
                               const { program, kegiatan, namaProgram, namaKegiatan, namaSubKeg } = autoInferCodes(val, mappings)
                               setNewRow({ 
                                 ...newRow, 
                                 kodeSubKeg: val, 
                                 kodeProgram: program || newRow.kodeProgram, 
                                 kodeKegiatan: kegiatan || newRow.kodeKegiatan,
                                 namaProgram: namaProgram || newRow.namaProgram,
                                 namaKegiatan: namaKegiatan || newRow.namaKegiatan,
                                 namaSubKeg: namaSubKeg || newRow.namaSubKeg
                               })
                             }}
                           />
                        </div>
                        <div className="border-t-2 border-primary/20 my-1.5" />
                        {/* Section 4: Uraian & Kode Belanja */}
                        <div className="flex flex-col gap-1 bg-primary/5 p-2 rounded-sm border border-primary/10">
                           <span className="text-[7px] font-black uppercase text-primary tracking-widest">4. BELANJA (URAIAN)</span>
                           <textarea 
                             className="w-full bg-white dark:bg-input border border-border rounded-sm px-1.5 py-1 text-[12px] font-medium min-h-[50px] resize-none"
                             placeholder="Uraian belanja..."
                             value={newRow.name}
                             onChange={e => setNewRow({...newRow, name: e.target.value})}
                             onKeyDown={e => e.key === 'Enter' && handleSaveInline(newRow.kodeBelanja, newRow.name, newRow.division, Number(newRow.budget), undefined, newRow.kodeSubKeg, Number(newRow.revisedBudget), { kodeProgram: newRow.kodeProgram, namaProgram: newRow.namaProgram, kodeKegiatan: newRow.kodeKegiatan, namaKegiatan: newRow.namaKegiatan, namaSubKeg: newRow.namaSubKeg })}
                           />
                           <input 
                             className="w-full bg-white dark:bg-input border border-border rounded-sm px-1.5 py-1 text-[11px] font-mono text-primary font-black"
                             placeholder="Kode Belanja"
                             value={newRow.kodeBelanja}
                             onChange={e => setNewRow({...newRow, kodeBelanja: e.target.value})}
                             onKeyDown={e => e.key === 'Enter' && handleSaveInline(newRow.kodeBelanja, newRow.name, newRow.division, Number(newRow.budget), undefined, newRow.kodeSubKeg, Number(newRow.revisedBudget), { kodeProgram: newRow.kodeProgram, namaProgram: newRow.namaProgram, kodeKegiatan: newRow.kodeKegiatan, namaKegiatan: newRow.namaKegiatan, namaSubKeg: newRow.namaSubKeg })}
                           />
                        </div>
                      </div>
                    </td>
                    <td className={cellBase}>
                      <input 
                        type="number"
                        className="w-full bg-white dark:bg-input border border-primary/30 rounded px-1 outline-none text-right font-mono"
                        placeholder="0"
                        value={newRow.budget}
                        onChange={e => setNewRow({...newRow, budget: e.target.value})}
                        onKeyDown={e => e.key === 'Enter' && handleSaveInline(newRow.kodeBelanja, newRow.name, newRow.division, Number(newRow.budget), undefined, newRow.kodeSubKeg, Number(newRow.revisedBudget), { kodeProgram: newRow.kodeProgram, namaProgram: newRow.namaProgram, kodeKegiatan: newRow.kodeKegiatan, namaKegiatan: newRow.namaKegiatan, namaSubKeg: newRow.namaSubKeg })}
                      />
                    </td>
                    <td className={cellBase}>
                      <input 
                        type="number"
                        className="w-full bg-white dark:bg-input border border-primary/30 rounded px-1 outline-none text-right font-mono"
                        placeholder="0"
                        value={newRow.revisedBudget}
                        onChange={e => setNewRow({...newRow, revisedBudget: e.target.value})}
                        onKeyDown={e => e.key === 'Enter' && handleSaveInline(newRow.kodeBelanja, newRow.name, newRow.division, Number(newRow.budget), undefined, newRow.kodeSubKeg, Number(newRow.revisedBudget), { kodeProgram: newRow.kodeProgram, namaProgram: newRow.namaProgram, kodeKegiatan: newRow.kodeKegiatan, namaKegiatan: newRow.namaKegiatan, namaSubKeg: newRow.namaSubKeg })}
                      />
                    </td>
                    <td className={`${cellBase} text-right font-mono text-muted/30`}>0</td>
                    <td className={`${cellBase} text-right font-mono text-muted/30`}>0</td>
                    <td className={cellBase}>
                      <input 
                        className="w-full bg-white dark:bg-input border border-border rounded-sm px-1.5 py-1 outline-none"
                        placeholder="Bidang..."
                        value={newRow.division}
                        onChange={e => setNewRow({...newRow, division: e.target.value})}
                        onKeyDown={e => e.key === 'Enter' && handleSaveInline(newRow.kodeBelanja, newRow.name, newRow.division, Number(newRow.budget), undefined, newRow.kodeSubKeg, Number(newRow.revisedBudget), { kodeProgram: newRow.kodeProgram, namaProgram: newRow.namaProgram, kodeKegiatan: newRow.kodeKegiatan, namaKegiatan: newRow.namaKegiatan, namaSubKeg: newRow.namaSubKeg })}
                      />
                    </td>
                    <td className={`${cellBase} text-center sticky right-0 z-10 bg-white dark:bg-slate-900 border-l border-border shadow-[-4px_0_12px_rgba(0,0,0,0.05)]`}>
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          onClick={() => handleSaveInline(newRow.kodeBelanja, newRow.name, newRow.division, Number(newRow.budget), undefined, newRow.kodeSubKeg, Number(newRow.revisedBudget), { kodeProgram: newRow.kodeProgram, namaProgram: newRow.namaProgram, kodeKegiatan: newRow.kodeKegiatan, namaKegiatan: newRow.namaKegiatan, namaSubKeg: newRow.namaSubKeg })}
                          className="p-1 text-emerald-600 border border-emerald-200 rounded-sm hover:bg-emerald-50 transition-all"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button onClick={() => setShowAddRow(false)} className="p-1 text-muted border border-border rounded-sm hover:bg-slate-100 transition-all">
                          <X className="w-3 h-3" />
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
                (() => {
                  const groups: any[] = []
                  const currentGroupsMap = new Map()

                  sortedAndFiltered.forEach(m => {
                    const progKey = m.kodeProgram || 'NO-PROG'
                    const kegKey = `${progKey}-${m.kodeKegiatan || 'NO-KEG'}`
                    const subKey = `${kegKey}-${m.kodeSubKeg || 'NO-SUB'}`

                    if (!currentGroupsMap.has(progKey)) {
                      currentGroupsMap.set(progKey, { type: 'program', data: m, items: [], totalBudget: 0, totalRevised: 0, totalReal: 0 })
                      groups.push(currentGroupsMap.get(progKey))
                    }
                    const prog = currentGroupsMap.get(progKey)

                    if (!currentGroupsMap.has(kegKey)) {
                      currentGroupsMap.set(kegKey, { type: 'kegiatan', data: m, items: [], totalBudget: 0, totalRevised: 0, totalReal: 0 })
                      prog.items.push(currentGroupsMap.get(kegKey))
                    }
                    const keg = currentGroupsMap.get(kegKey)

                    if (!currentGroupsMap.has(subKey)) {
                      currentGroupsMap.set(subKey, { type: 'subkeg', data: m, items: [], totalBudget: 0, totalRevised: 0, totalReal: 0 })
                      keg.items.push(currentGroupsMap.get(subKey))
                    }
                    const sub = currentGroupsMap.get(subKey)
                    
                    sub.items.push({ type: 'item', data: m })

                    // Aggregate Totals
                    prog.totalBudget += (m.budget || 0)
                    prog.totalRevised += (m.revisedBudget || 0)
                    prog.totalReal += (m.realization || 0)
                    
                    keg.totalBudget += (m.budget || 0)
                    keg.totalRevised += (m.revisedBudget || 0)
                    keg.totalReal += (m.realization || 0)

                    sub.totalBudget += (m.budget || 0)
                    sub.totalRevised += (m.revisedBudget || 0)
                    sub.totalReal += (m.realization || 0)
                  })

                  return groups.flatMap(prog => [
                    // Program Header
                    <tr key={`prog-${prog.data.kodeProgram}`} className="bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-100/40 dark:hover:bg-indigo-900/30 transition-colors border-b-2 border-indigo-200 dark:border-indigo-500/10 relative z-10 group/prog">
                      <td className={`${cellBase} !bg-indigo-600 text-center sticky left-1 z-20 text-white font-extrabold text-[14px] border-r-2 border-indigo-400 shadow-[2px_0_10px_rgba(79,70,229,0.2)]`}>P</td>
                      <td className={`${cellBase} bg-inherit py-6 px-6 border-r border-border/40 border-l-4 border-indigo-500`}>
                        <div className="flex flex-col gap-4">
                           <div className="flex items-center gap-6">
                              <div className="flex flex-col gap-1.5 min-w-[140px]">
                                 <span className="text-[7px] font-black text-indigo-900/60 dark:text-indigo-300/80 uppercase tracking-[0.2em] leading-none">KODE PROGRAM</span>
                                 <input 
                                   className="w-full bg-background/80 text-foreground border border-indigo-300/50 dark:border-indigo-900/50 p-2 rounded-sm outline-none font-mono font-black text-[14px] focus:ring-2 focus:ring-indigo-400/50 shadow-sm"
                                   value={prog.data.kodeProgram || ''}
                                   placeholder="KODE..."
                                   onChange={e => handleUpdateHierarchyField('kodeProgram', prog.data.kodeProgram, 'kodeProgram', e.target.value)}
                                 />
                              </div>
                              <div className="flex flex-col gap-1.5 flex-1">
                                 <span className="text-[7px] font-black text-indigo-900/60 dark:text-indigo-300/80 uppercase tracking-[0.2em] leading-none">NAMA PROGRAM</span>
                                 <input 
                                   className="w-full bg-background/80 text-foreground border border-indigo-300/50 dark:border-indigo-900/50 p-2 rounded-sm outline-none font-black text-[16px] focus:ring-2 focus:ring-indigo-400/50 shadow-sm uppercase tracking-tight"
                                   value={prog.data.namaProgram || ''}
                                   placeholder="NAMA PROGRAM . . ."
                                   onChange={e => handleUpdateHierarchyField('kodeProgram', prog.data.kodeProgram, 'namaProgram', e.target.value)}
                                 />
                              </div>
                           </div>
                        </div>
                      </td>
                      <td className={`${cellBase} bg-inherit text-right font-black tabular-nums text-foreground/90 text-[15px] leading-[70px]`}>Rp{formatCurrency(prog.totalBudget)}</td>
                      <td className={`${cellBase} bg-inherit text-right font-black tabular-nums text-indigo-700 dark:text-indigo-300 text-[15px] leading-[70px]`}>Rp{formatCurrency(prog.totalRevised)}</td>
                      <td className={`${cellBase} bg-inherit text-right font-black tabular-nums text-indigo-600 dark:text-indigo-400 animate-pulse text-[15px] leading-[70px]`}>Rp{formatCurrency(prog.totalReal)}</td>
                      <td className={`${cellBase} bg-emerald-500/5 text-right font-black tabular-nums text-emerald-700 dark:text-emerald-300 border-l border-border/80 text-[16px] leading-[70px]`}>
                        Rp{formatCurrency(((useRevisedBudgetMode && prog.totalRevised > 0) ? prog.totalRevised : prog.totalBudget) - prog.totalReal)}
                      </td>
                      <td className={`${cellBase} bg-inherit`}></td>
                      <td className={`${cellBase} bg-background sticky right-0 z-20 border-l border-border`}></td>
                    </tr>,
                    ...prog.items.flatMap((keg: any) => [
                      // Kegiatan Header
                      <tr key={`keg-${keg.data.kodeKegiatan}`} className="bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors border-b border-border group/keg">
                        <td className={`${cellBase} bg-slate-100 dark:bg-slate-800 text-center sticky left-1 z-20 text-slate-400 dark:text-slate-500 font-black text-[12px] border-r-2 border-slate-300 dark:border-slate-700`}>K</td>
                        <td className={`${cellBase} bg-inherit pl-12 py-5 border-r border-border/30 border-l-4 border-slate-400`}>
                          <div className="flex items-center gap-6">
                            <div className="flex flex-col gap-1 min-w-[160px]">
                               <span className="text-[7px] font-black text-slate-900/50 dark:text-slate-300/60 uppercase tracking-widest font-mono leading-none">KODE KEGIATAN</span>
                               <input 
                                 className="w-full bg-background/80 text-foreground border border-border p-2 rounded-sm outline-none font-mono font-bold text-[12px] focus:ring-2 focus:ring-emerald-500/30"
                                 value={keg.data.kodeKegiatan || ''}
                                 placeholder="KODE..."
                                 onChange={e => handleUpdateHierarchyField('kodeKegiatan', keg.data.kodeKegiatan, 'kodeKegiatan', e.target.value)}
                               />
                            </div>
                            <div className="flex flex-col gap-1 flex-1">
                               <span className="text-[7px] font-black text-slate-900/50 dark:text-slate-300/60 uppercase tracking-widest font-mono leading-none">NAMA KEGIATAN</span>
                               <input 
                                 className="w-full bg-background/80 text-foreground border border-border p-2 rounded-sm outline-none font-bold text-[13px] focus:ring-2 focus:ring-emerald-500/30 uppercase"
                                 value={keg.data.namaKegiatan || ''}
                                 placeholder="NAMA KEGIATAN . . ."
                                 onChange={e => handleUpdateHierarchyField('kodeKegiatan', keg.data.kodeKegiatan, 'namaKegiatan', e.target.value)}
                               />
                            </div>
                          </div>
                        </td>
                        <td className={`${cellBase} bg-inherit text-right text-[13px] font-bold tabular-nums text-muted-foreground leading-[55px]`}>Rp{formatCurrency(keg.totalBudget)}</td>
                        <td className={`${cellBase} bg-inherit text-right text-[13px] font-bold tabular-nums text-indigo-700 dark:text-indigo-300 leading-[55px]`}>Rp{formatCurrency(keg.totalRevised)}</td>
                        <td className={`${cellBase} bg-inherit text-right text-[13px] font-bold tabular-nums text-indigo-600 dark:text-indigo-400 leading-[55px]`}>Rp{formatCurrency(keg.totalReal)}</td>
                        <td className={`${cellBase} bg-inherit text-right text-[13px] font-bold tabular-nums text-emerald-700 dark:text-emerald-300 leading-[55px]`}>
                           Rp{formatCurrency(((useRevisedBudgetMode && keg.totalRevised > 0) ? keg.totalRevised : keg.totalBudget) - keg.totalReal)}
                        </td>
                        <td className={`${cellBase} bg-inherit`}></td>
                        <td className={`${cellBase} bg-background sticky right-0 z-20 border-l border-border shadow-none`}></td>
                      </tr>,
                      ...keg.items.flatMap((sub: any) => [
                        // Sub Kegiatan Header
                        <tr key={`sub-${sub.data.kodeSubKeg}`} className="bg-background hover:bg-muted/10 transition-colors border-b border-border group/sub">
                          <td className={`${cellBase} bg-muted/10 text-center sticky left-1 z-20 text-indigo-400 dark:text-indigo-600 font-bold text-[12px] border-r-2 border-border/80`}>S</td>
                          <td className={`${cellBase} bg-inherit pl-20 py-4 border-r border-border/20 border-l-4 border-indigo-400/40`}>
                            <div className="flex items-center gap-6">
                              <div className="flex flex-col gap-1 min-w-[180px]">
                                 <span className="text-[7px] font-black text-indigo-900/50 dark:text-indigo-300/60 uppercase font-mono tracking-widest leading-none">KODE SUB KEGIATAN</span>
                                 <input 
                                   className="w-full bg-background/80 text-foreground border border-border p-2 rounded-sm outline-none font-mono font-bold text-[11px] focus:border-indigo-400"
                                   value={sub.data.kodeSubKeg || ''}
                                   placeholder="KODE..."
                                   onChange={e => handleUpdateHierarchyField('kodeSubKeg', sub.data.kodeSubKeg, 'kodeSubKeg', e.target.value)}
                                 />
                              </div>
                              <div className="flex flex-col gap-1 flex-1">
                                 <span className="text-[7px] font-black text-indigo-900/50 dark:text-indigo-300/60 uppercase font-mono tracking-widest leading-none">NAMA SUB KEGIATAN</span>
                                 <textarea 
                                   className="w-full bg-background/80 text-foreground border border-border p-2 rounded-sm outline-none font-black text-[12px] focus:border-indigo-400 uppercase resize-none leading-normal min-h-[40px]"
                                   value={sub.data.namaSubKeg || ''}
                                   placeholder="NAMA SUB KEGIATAN . . ."
                                   onChange={e => handleUpdateHierarchyField('kodeSubKeg', sub.data.kodeSubKeg, 'namaSubKeg', e.target.value)}
                                 />
                              </div>
                            </div>
                          </td>
                          <td className={`${cellBase} text-right text-[10px] font-bold tabular-nums text-muted-foreground/60`}>Rp{formatCurrency(sub.totalBudget)}</td>
                          <td className={`${cellBase} text-right text-[10px] font-bold tabular-nums text-muted-foreground/60`}>Rp{formatCurrency(sub.totalRevised)}</td>
                          <td className={`${cellBase} text-right text-[10px] font-bold tabular-nums text-muted-foreground/60`}>Rp{formatCurrency(sub.totalReal)}</td>
                          <td className={`${cellBase} text-right text-[10px] font-bold tabular-nums text-muted-foreground/60`}>
                             Rp{formatCurrency(((useRevisedBudgetMode && sub.totalRevised > 0) ? sub.totalRevised : sub.totalBudget) - sub.totalReal)}
                          </td>
                          <td className={cellBase}></td>
                          <td className={`${cellBase} sticky right-0 z-10 bg-background shadow-[-4px_0_12px_rgba(0,0,0,0.02)]`}></td>
                        </tr>,
                        ...sub.items.map((item: any) => {
                          const m = item.data
                          const sisaAnggaran = ((useRevisedBudgetMode && m.revisedBudget > 0) ? m.revisedBudget : m.budget) - (m.realization || 0)
                          return (
                            <tr key={m.id} className="hover:bg-muted/30 transition-all group">
                              <td className={`${cellBase} bg-muted text-center font-mono font-black text-muted-foreground/20 sticky left-1 z-20 border-r border-border/80`}>B</td>
                              <td className={`${cellBase} relative group/cell p-0 ${modifiedIds.has(m.id) ? 'bg-amber-500/5' : ''} pl-24 border-l border-border/10 relative bg-background`}>
                                 {/* Semantic Indentation Thread */}
                                 <div className="absolute left-[88px] top-0 bottom-0 w-[2px] bg-border opacity-60" />
                                 <div className="absolute left-[88px] top-[30px] w-5 h-[2px] bg-border opacity-60 rounded-r-full" />
                                 
                                 <div className="flex flex-col my-2 mx-4 p-4 bg-background border border-border shadow-sm rounded-none group-hover:border-primary/50 transition-all">
                                   <textarea 
                                     className="w-full bg-transparent border-none p-0 outline-none font-bold text-[13px] leading-relaxed text-foreground uppercase placeholder:text-muted-foreground"
                                     value={m.name || ''}
                                     placeholder="KLIK UNTUK ISI URAIAN BELANJA. . ."
                                     rows={Math.max(1, (m.name || '').split('\n').length)}
                                     onChange={e => {
                                       handleUpdateField(m.id, 'name', e.target.value)
                                       e.target.style.height = 'auto'
                                       e.target.style.height = e.target.scrollHeight + 'px'
                                     }}
                                   />
                                   <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/50">
                                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest whitespace-nowrap">KODE BELANJA</span>
                                      <input 
                                        className="w-full bg-muted/20 border border-border p-1.5 px-3 outline-none text-[11px] font-mono font-black text-foreground/80 group-hover:text-primary transition-colors focus:ring-1 focus:ring-primary rounded-sm placeholder:italic"
                                        value={m.kodeBelanja || ''}
                                        placeholder="KONTEN..."
                                        onChange={e => handleUpdateField(m.id, 'kodeBelanja', e.target.value)}
                                      />
                                   </div>
                                 </div>
                              </td>

                              {/* Financial Columns */}
                              <td className={`${cellBase} p-0 relative group/cell text-right ${modifiedIds.has(m.id) ? 'bg-amber-500/5' : ''}`}>
                                 <div className="flex items-center gap-1 justify-end w-full h-full pr-2 text-[13px]">
                                    <span className="font-black text-foreground/40 text-[10px] select-none">Rp</span>
                                    <input 
                                      type="number"
                                      className="w-full bg-transparent border-none py-2 px-1 outline-none focus:bg-white dark:focus:bg-white/5 text-right font-black text-foreground/80 tabular-nums"
                                      value={m.budget || 0}
                                      onChange={(e) => handleUpdateField(m.id, 'budget', Number(e.target.value))}
                                    />
                                      <button 
                                        onClick={() => setHistoryData(m)}
                                        className={`p-1 rounded bg-primary/5 hover:bg-primary/10 transition-colors ${savedId === m.id ? 'text-primary bg-primary/20' : 'text-slate-400 opacity-0 group-hover/cell:opacity-100'}`}
                                      >
                                        <RefreshCw className="w-3 h-3" />
                                      </button>
                                 </div>
                              </td>
                              <td className={`${cellBase} p-0 relative group/cell text-right ${modifiedIds.has(m.id) ? 'bg-amber-500/5' : ''}`}>
                                 <div className="flex items-center gap-1 justify-end w-full h-full pr-3 text-[13px]">
                                    <span className={`font-black text-[10px] select-none ${m.revisedBudget > 0 ? 'text-indigo-600/40 dark:text-indigo-400/40' : 'text-foreground/5'}`}>Rp</span>
                                    <input 
                                      type="number"
                                      className={`w-full bg-transparent border-none py-2 px-1 outline-none focus:bg-white dark:focus:bg-white/5 text-right font-black tabular-nums transition-colors ${m.revisedBudget > 0 ? 'text-indigo-700 dark:text-indigo-300' : 'text-foreground/10'}`}
                                      value={m.revisedBudget || 0}
                                      onChange={(e) => handleUpdateField(m.id, 'revisedBudget', Number(e.target.value))}
                                    />
                                 </div>
                              </td>
                              <td className={`${cellBase} p-2 text-right font-black text-indigo-600 dark:text-indigo-400 tabular-nums bg-indigo-50/10 dark:bg-indigo-500/5 whitespace-nowrap text-[13px] leading-[40px]`}>
                                 Rp{formatCurrency(m.realization || 0)}
                              </td>
                              <td className={`${cellBase} p-2 text-right font-black tabular-nums whitespace-nowrap text-[13px] leading-[40px] ${sisaAnggaran < 0 ? 'text-rose-600 bg-rose-50' : 'text-emerald-700 bg-emerald-50/10 dark:bg-emerald-500/5'}`}>
                                 Rp{formatCurrency(sisaAnggaran)}
                              </td>
                              <td className={`${cellBase} p-0 relative group/cell ${modifiedIds.has(m.id) ? 'bg-amber-500/5' : ''}`}>
                                  <input 
                                    className="w-full bg-transparent border-none p-2 outline-none focus:bg-white dark:focus:bg-white/5 text-muted-foreground font-medium text-[11px]"
                                    value={m.division || ''}
                                    placeholder="Bidang..."
                                    onChange={(e) => handleUpdateField(m.id, 'division', e.target.value)}
                                  />
                              </td>

                              {/* AKSI */}
                              <td className={`${cellBase} text-center sticky right-0 z-10 bg-background border-l border-border shadow-[-8px_0_15px_-5px_rgba(0,0,0,0.05)] dark:shadow-[-8px_0_15px_-5px_rgba(0,0,0,0.3)]`}>
                                 <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                   {modifiedIds.has(m.id) ? (
                                     <>
                                       <button
                                         disabled={savingIds.has(m.id)}
                                         onClick={() => handleSaveInline(m.kodeBelanja, m.name, m.division, m.budget, m.id, m.kodeSubKeg, m.revisedBudget, { kodeProgram: m.kodeProgram, namaProgram: m.namaProgram, kodeKegiatan: m.kodeKegiatan, namaKegiatan: m.namaKegiatan, namaSubKeg: m.namaSubKeg })}
                                         className="p-1 text-emerald-600 hover:bg-emerald-50 border border-emerald-200 rounded-sm transition-all"
                                       >
                                         {savingIds.has(m.id) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                       </button>
                                       <button
                                         onClick={() => handleCancelRow(m.id)}
                                         className="p-1 text-muted hover:bg-slate-100 border border-border rounded-sm transition-all"
                                       >
                                         <X className="w-3 h-3" />
                                       </button>
                                     </>
                                   ) : (
                                     <>
                                       <button onClick={() => handleDelete(m.id)} className="p-1 text-muted hover:text-rose-600 hover:bg-rose-50 border border-border hover:border-rose-200 rounded-sm transition-all">
                                         <Trash2 className="w-3 h-3" />
                                       </button>
                                     </>
                                   )}
                                 </div>
                              </td>
                            </tr>
                          )
                        })
                      ])
                    ])
                  ])
                })()
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
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-md shadow-2xl border border-border overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-slate-50 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-sm font-black text-foreground uppercase tracking-tight">Riwayat Anggaran</h3>
                    <p className="text-[10px] text-muted font-bold tracking-widest uppercase opacity-50">{historyData.code}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setHistoryData(null)}
                  className="p-2 bg-muted/10 hover:bg-muted/20 rounded-md transition-all active:scale-95"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
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

              <div className="px-6 py-4 bg-slate-50 dark:bg-black/20 border-t border-border mt-auto">
                 <button 
                  onClick={() => setHistoryData(null)}
                  className="w-full py-3 bg-primary text-white rounded-md font-black text-xs uppercase tracking-[0.2em] shadow-md hover:bg-primary/90 transition-all active:scale-95"
                 >
                   Selesai
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
