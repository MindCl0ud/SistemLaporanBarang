'use client'

import { useState, useEffect } from 'react'
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
  Plus,
  Check,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  UploadCloud,
  Download,
  FileSpreadsheet
} from 'lucide-react'
import { useMemo } from 'react'
import { getAccountMappings, upsertAccountMapping, deleteAccountMapping, syncAccountCodesFromBku, upsertAccountMappingBulk } from '@/app/actions/bkuActions'

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

  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)

  useEffect(() => {
    fetchMappings()
  }, [selectedYear])

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
    setImportProgress(0)

    try {
      const { read, utils } = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const wb = read(buffer, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = utils.sheet_to_json(ws, { header: 1 }) as any[][]
      
      const parsedData = []
      // Skip header row
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
      m.division?.toLowerCase().includes(search.toLowerCase())
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

  const totalPaguEffective = mappings.reduce((sum, m) => {
    const effective = (m.revisedBudget && m.revisedBudget > 0) ? m.revisedBudget : (m.budget || 0)
    return sum + effective
  }, 0)

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amt)
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8 space-y-8 min-h-screen">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-2">
            <Hash className="w-3 h-3" /> Master Data Management
          </div>
          <h1 className="text-4xl font-black text-foreground flex items-center gap-4 tracking-tighter">
            <div className="p-3 rounded-2xl bg-primary text-white shadow-xl shadow-primary/20">
              <ListTree className="w-8 h-8" />
            </div>
            Master Rekening
          </h1>
          <div className="flex items-center gap-6 mt-4">
            <div className="flex flex-col border-l-2 border-primary/20 pl-6">
              <span className="text-[10px] font-black text-muted uppercase tracking-widest">Tahun Anggaran</span>
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="text-2xl font-black text-primary bg-transparent outline-none cursor-pointer hover:opacity-70 transition-opacity"
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y} className="text-sm font-bold bg-white dark:bg-slate-900 text-foreground">{y}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col border-l-2 border-primary/20 pl-6">
              <span className="text-[10px] font-black text-muted uppercase tracking-widest">Total Pagu Efektif ({selectedYear})</span>
              <span className="text-2xl font-black text-primary tracking-tighter">{formatCurrency(totalPaguEffective)}</span>
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
        </div>
      </header>

      {/* SEARCH BAR */}
      <div className="flex items-center gap-4 bg-white dark:bg-card p-2 pr-4 rounded-[2rem] border border-border shadow-2xl shadow-indigo-500/5">
        <div className="relative flex-1">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
          <input
            type="text"
            placeholder="Cari berdasarkan kode, nama, atau bidang..."
            className="w-full bg-transparent border-none rounded-2xl pl-16 pr-6 py-4 text-base font-bold text-foreground outline-none placeholder:text-muted/40"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="bg-white dark:bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-2xl shadow-indigo-500/5 transition-all">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-table-header border-b border-border">
                {[
                  { id: 'subKegiatan', label: 'Sub Kegiatan', width: 'w-48' },
                  { id: 'code', label: 'Kode Belanja', width: 'w-48' },
                  { id: 'name', label: 'Nama Kustom', width: '' },
                  { id: 'budget', label: 'Pagu Awal', width: 'w-40', align: 'text-right' },
                  { id: 'revisedBudget', label: 'Pagu Perubahan', width: 'w-40', align: 'text-right' },
                  { id: 'division', label: 'Bidang', width: 'w-32' },
                ].map((col) => (
                  <th 
                    key={col.id} 
                    className={`px-8 py-5 ${col.align || 'text-left'} text-[10px] uppercase font-black tracking-widest text-foreground/70 cursor-pointer hover:bg-accent transition-colors group/header ${col.width}`}
                    onClick={() => requestSort(col.id)}
                  >
                    <div className={`flex items-center gap-2 ${col.align === 'text-right' ? 'justify-end' : ''}`}>
                      {col.label}
                      {sortConfig?.key === col.id ? (
                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-primary" /> : <ChevronDown className="w-3.5 h-3.5 text-primary" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-0 group-hover/header:opacity-50 transition-opacity" />
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-8 py-5 text-center text-[10px] uppercase font-black tracking-widest text-muted w-32">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {/* ADD NEW ROW (HIDDEN BY DEFAULT) */}
              <AnimatePresence>
                {showAddRow && (
                  <motion.tr 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-primary/5 border-b border-primary/20"
                  >
                    <td className="px-8 py-4">
                      <input 
                        className="w-full bg-white dark:bg-input border border-primary/30 rounded-xl px-4 py-2.5 text-xs font-mono font-black text-primary outline-none focus:ring-2 focus:ring-primary shadow-sm"
                        placeholder="5.01..."
                        value={newRow.subKegiatan || ''}
                        onChange={e => setNewRow({...newRow, subKegiatan: e.target.value})}
                      />
                    </td>
                    <td className="px-8 py-4">
                      <input 
                        className="w-full bg-white dark:bg-input border border-primary/30 rounded-xl px-4 py-2.5 text-xs font-mono font-black text-primary outline-none focus:ring-2 focus:ring-primary shadow-sm"
                        placeholder="5.1.02..."
                        value={newRow.code}
                        onChange={e => {
                           const val = e.target.value;
                           const parts = val.split('.');
                           if (parts.length >= 7 && (val.startsWith('5.') || val.startsWith('5.01'))) {
                              setNewRow({
                                 ...newRow,
                                 subKegiatan: parts.slice(0, 6).join('.'),
                                 code: parts.slice(6).join('.')
                              });
                           } else {
                              setNewRow({...newRow, code: val});
                           }
                        }}
                      />
                    </td>
                    <td className="px-8 py-4">
                      <input 
                        className="w-full bg-white dark:bg-input border border-primary/30 rounded-xl px-4 py-2.5 text-sm font-black text-foreground outline-none focus:ring-2 focus:ring-primary shadow-sm"
                        placeholder="Nama Kustom..."
                        value={newRow.name}
                        onChange={e => setNewRow({...newRow, name: e.target.value})}
                        autoFocus
                      />
                    </td>
                    <td className="px-8 py-4">
                       <input 
                         type="number"
                         className="w-full bg-white dark:bg-input border border-primary/30 rounded-xl px-4 py-2.5 text-sm font-black text-foreground outline-none focus:ring-2 focus:ring-primary shadow-sm text-right"
                         placeholder="Awal"
                         value={newRow.budget}
                         onChange={e => setNewRow({...newRow, budget: e.target.value})}
                       />
                     </td>
                     <td className="px-8 py-4">
                       <input 
                         type="number"
                         className="w-full bg-white dark:bg-input border border-primary/30 rounded-xl px-4 py-2.5 text-sm font-black text-foreground outline-none focus:ring-2 focus:ring-primary shadow-sm text-right"
                         placeholder="Perubahan"
                         value={newRow.revisedBudget}
                         onChange={e => setNewRow({...newRow, revisedBudget: e.target.value})}
                       />
                     </td>
                    <td className="px-8 py-4">
                      <input 
                        className="w-full bg-white dark:bg-input border border-primary/30 rounded-xl px-4 py-2.5 text-sm font-black text-foreground outline-none focus:ring-2 focus:ring-primary shadow-sm"
                        placeholder="Bidang..."
                        value={newRow.division}
                        onChange={e => setNewRow({...newRow, division: e.target.value})}
                      />
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleSaveInline(newRow.code, newRow.name, newRow.division, Number(newRow.budget), null, newRow.subKegiatan, Number(newRow.revisedBudget))}
                          disabled={savingId === 'new'}
                          className="p-2.5 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-110 transition-all disabled:opacity-50"
                        >
                          {savingId === 'new' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={() => setShowAddRow(false)}
                          className="p-2.5 bg-white text-muted hover:text-rose-500 rounded-xl border border-border transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                )}
              </AnimatePresence>

              {loading ? (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4 opacity-20" />
                    <p className="text-xs font-black text-muted uppercase tracking-[0.3em]">Memuat Data Master...</p>
                  </td>
                </tr>
              ) : sortedAndFiltered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center">
                    <div className="w-16 h-16 bg-muted/10 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-border">
                      <ListTree className="w-8 h-8 text-muted" />
                    </div>
                    <p className="text-base font-black text-foreground">Tidak Ada Data</p>
                    <p className="text-xs text-muted font-bold">Coba sinkronkan dengan BKU atau tambah manual.</p>
                  </td>
                </tr>
              ) : (
                sortedAndFiltered.map((m) => (
                  <tr key={m.id} className="group hover:bg-primary/5 transition-colors border-b border-border last:border-0">
                    <td className="px-8 py-5 font-mono text-[11px] text-primary font-black">
                      <input 
                        className="w-full bg-transparent border border-border group-hover:border-primary/30 rounded-xl px-2 py-1 text-xs font-mono font-black outline-none focus:bg-primary/5"
                        value={m.subKegiatan || ''}
                        onChange={e => {
                           const val = e.target.value;
                           setMappings(prev => prev.map(p => p.id === m.id ? {...p, subKegiatan: val} : p));
                        }}
                        onBlur={() => handleSaveInline(m.code, m.name, m.division, m.budget, m.id, m.subKegiatan, m.revisedBudget)}
                      />
                    </td>
                    <td className="px-8 py-5 font-mono text-[11px] text-primary font-black">
                      <input 
                        className="w-full bg-transparent border border-border group-hover:border-primary/30 rounded-xl px-2 py-1 text-xs font-mono font-black outline-none focus:bg-primary/5"
                        value={m.code}
                        onChange={e => {
                           const val = e.target.value;
                           const parts = val.split('.');
                           if (parts.length >= 7 && (val.startsWith('5.') || val.startsWith('5.01'))) {
                              const sub = parts.slice(0, 6).join('.');
                              const rek = parts.slice(6).join('.');
                              setMappings(prev => prev.map(p => p.id === m.id ? {...p, subKegiatan: sub, code: rek} : p));
                           } else {
                              setMappings(prev => prev.map(p => p.id === m.id ? {...p, code: val} : p));
                           }
                        }}
                        onBlur={() => handleSaveInline(m.code, m.name, m.division, m.budget, m.id, m.subKegiatan, m.revisedBudget)}
                      />
                    </td>
                    <td className="px-8 py-5">
                      {editingId === m.id ? (
                        <div className="flex items-center gap-3 animate-in fade-in duration-300">
                          <input 
                            className="flex-1 bg-white dark:bg-input border border-primary rounded-xl px-4 py-2.5 text-sm font-black text-foreground outline-none shadow-lg shadow-primary/5"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSaveInline(m.code, editValue, m.division, m.budget, m.id, m.subKegiatan, m.revisedBudget)}
                            onKeyDownCapture={e => e.key === 'Escape' && setEditingId(null)}
                            autoFocus
                          />
                          <button 
                            onClick={() => handleSaveInline(m.code, editValue, m.division, m.budget, m.id, m.subKegiatan, m.revisedBudget)}
                            disabled={savingId === m.id}
                            className="p-2.5 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-110 transition-all disabled:opacity-50"
                          >
                            {savingId === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </button>
                          <button 
                            onClick={() => setEditingId(null)}
                            className="p-2.5 bg-input text-muted hover:text-foreground rounded-xl transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div 
                          className="font-bold text-foreground text-sm cursor-pointer hover:text-primary transition-colors flex items-center justify-between group/cell"
                          onClick={() => {
                            setEditingId(m.id)
                            setEditValue(m.name)
                          }}
                        >
                          {m.name}
                          <Pencil className="w-3 h-3 text-primary opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3 justify-end group/pagu relative">
                        {m.budgetLogs?.length > 0 && (
                          <div className="relative">
                            <button 
                              onClick={() => setActiveHistoryId(activeHistoryId === m.id ? null : m.id)}
                              className={`p-1.5 rounded-lg border transition-all ${activeHistoryId === m.id ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-input text-muted border-border hover:border-primary/50'}`}
                              title="Lihat Riwayat Perubahan"
                            >
                              <RefreshCw className={`w-3 h-3 ${activeHistoryId === m.id ? 'animate-spin-slow' : ''}`} />
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
                                    <div className="flex flex-col">
                                      <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Riwayat Anggaran</h4>
                                      <p className="text-[9px] text-muted font-bold">{m.code}</p>
                                    </div>
                                    <button onClick={() => setActiveHistoryId(null)} className="p-1.5 bg-muted/10 hover:bg-rose-500/10 hover:text-rose-500 rounded-lg transition-colors">
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  <div className="space-y-4 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                                    {m.budgetLogs.map((log: any) => (
                                      <div key={log.id} className="relative pl-6 border-l-2 border-primary/20 pb-1">
                                        <div className="absolute -left-[9px] top-0 w-4 h-4 bg-white dark:bg-slate-900 border-2 border-primary rounded-full flex items-center justify-center">
                                          <div className={`w-1.5 h-1.5 rounded-full ${log.field === 'revisedBudget' ? 'bg-indigo-500' : 'bg-primary'}`} />
                                        </div>
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-[10px] font-black text-foreground uppercase">
                                            {log.field === 'revisedBudget' ? 'Pagu Perubahan' : 'Pagu Awal'}
                                          </span>
                                          <span className="text-[9px] font-bold text-muted">{new Date(log.createdAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mb-2 p-2 bg-slate-50 dark:bg-black/20 rounded-xl border border-border/50">
                                          <span className="text-[10px] line-through text-muted/40 font-mono italic">{formatCurrency(log.oldBudget)}</span>
                                          <ChevronDown className="w-3 h-3 text-emerald-500 -rotate-90 opacity-50" />
                                          <span className={`text-[11px] font-black font-mono ${log.newBudget > log.oldBudget ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {formatCurrency(log.newBudget)}
                                          </span>
                                        </div>
                                        <p className="text-[10px] text-foreground/70 leading-snug italic px-1">"{log.reason}"</p>
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                        <input 
                          type="number"
                          className="w-full bg-transparent border border-border group-hover:border-primary/50 group-hover:bg-primary/5 rounded-xl px-4 py-2 text-sm font-black text-foreground text-right outline-none focus:ring-2 focus:ring-primary transition-all tabular-nums"
                          value={m.budget || 0}
                          onChange={(e) => {
                             const newVal = Number(e.target.value);
                             setMappings(prev => prev.map(p => p.id === m.id ? {...p, budget: newVal} : p));
                          }}
                          onBlur={() => handleSaveInline(m.code, m.name, m.division, m.budget, m.id, m.subKegiatan, m.revisedBudget)}
                        />
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3 justify-end group/pagu">
                        <input 
                          type="number"
                          className="w-full bg-transparent border border-border group-hover:border-primary/50 group-hover:bg-primary/5 rounded-xl px-4 py-2 text-sm font-black text-foreground text-right outline-none focus:ring-2 focus:ring-primary transition-all tabular-nums"
                          value={m.revisedBudget || 0}
                          onChange={(e) => {
                             const newVal = Number(e.target.value);
                             setMappings(prev => prev.map(p => p.id === m.id ? {...p, revisedBudget: newVal} : p));
                          }}
                          onBlur={() => handleSaveInline(m.code, m.name, m.division, m.budget, m.id, m.subKegiatan, m.revisedBudget)}
                        />
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <input 
                          className="w-full bg-transparent border border-border group-hover:border-primary/30 rounded-xl px-4 py-2 text-sm font-black text-foreground outline-none focus:bg-white dark:focus:bg-white/5 transition-all"
                          value={m.division || ''}
                          placeholder="Bidang..."
                          onChange={(e) => {
                             const newVal = e.target.value;
                             setMappings(prev => prev.map(p => p.id === m.id ? {...p, division: newVal} : p));
                          }}
                          onBlur={() => handleSaveInline(m.code, m.name, m.division, m.budget, m.id, m.subKegiatan, m.revisedBudget)}
                        />
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <button 
                        onClick={() => handleDelete(m.id)}
                        className="p-2.5 text-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
