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
  Check
} from 'lucide-react'
import { getAccountMappings, upsertAccountMapping, deleteAccountMapping, syncAccountCodesFromBku } from '@/app/actions/bkuActions'

export default function AccountMappingPage() {
  const [mappings, setMappings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  
  // Inline editing states
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  // New row states
  const [showAddRow, setShowAddRow] = useState(false)
  const [newRow, setNewRow] = useState({ code: '', name: '' })

  useEffect(() => {
    fetchMappings()
  }, [])

  const fetchMappings = async () => {
    setLoading(true)
    try {
      const data = await getAccountMappings()
      setMappings(data)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveInline = async (code: string, name: string, id: string | null = null) => {
    if (!code || !name) return
    setSavingId(id || 'new')
    try {
      await upsertAccountMapping(code, name)
      setEditingId(null)
      setShowAddRow(false)
      setNewRow({ code: '', name: '' })
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
      const { count } = await syncAccountCodesFromBku()
      alert(`Berhasil sinkronisasi ${count} kode rekening baru!`)
      fetchMappings()
    } finally {
      setLoading(false)
    }
  }

  const filtered = mappings.filter(m => 
    m.code.toLowerCase().includes(search.toLowerCase()) || 
    m.name.toLowerCase().includes(search.toLowerCase())
  )

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
          <p className="text-foreground/70 font-black text-lg max-w-2xl leading-tight">
            Klik pada sel <span className="text-primary italic">Nama Kustom</span> untuk mengedit data secara langsung.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddRow(true)}
            className="flex items-center gap-2 px-6 py-4 bg-primary text-white rounded-2xl text-sm font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> Tambah Manual
          </button>
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
            placeholder="Cari berdasarkan kode atau nama..."
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
              <tr className="bg-slate-50 dark:bg-input/50 border-b border-border">
                <th className="px-8 py-5 text-left text-[10px] uppercase font-black tracking-widest text-muted w-64">Kode Rekening</th>
                <th className="px-8 py-5 text-left text-[10px] uppercase font-black tracking-widest text-muted">Nama Kustom (Edit Langsung)</th>
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
                        placeholder="Kode: 5.x.x..."
                        value={newRow.code}
                        onChange={e => setNewRow({...newRow, code: e.target.value})}
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
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleSaveInline(newRow.code, newRow.name)}
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
                  <td colSpan={3} className="px-8 py-20 text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4 opacity-20" />
                    <p className="text-xs font-black text-muted uppercase tracking-[0.3em]">Memuat Data Master...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-8 py-20 text-center">
                    <div className="w-16 h-16 bg-muted/10 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-border">
                      <ListTree className="w-8 h-8 text-muted" />
                    </div>
                    <p className="text-base font-black text-foreground">Tidak Ada Data</p>
                    <p className="text-xs text-muted font-bold">Coba sinkronkan dengan BKU atau tambah manual.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((m) => (
                  <tr key={m.id} className="group hover:bg-primary/5 transition-colors border-b border-border last:border-0">
                    <td className="px-8 py-5 font-mono text-[11px] text-primary font-black">
                      {m.code}
                    </td>
                    <td className="px-8 py-5">
                      {editingId === m.id ? (
                        <div className="flex items-center gap-3 animate-in fade-in duration-300">
                          <input 
                            className="flex-1 bg-white dark:bg-input border border-primary rounded-xl px-4 py-2.5 text-sm font-black text-foreground outline-none shadow-lg shadow-primary/5"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSaveInline(m.code, editValue, m.id)}
                            onKeyDownCapture={e => e.key === 'Escape' && setEditingId(null)}
                            autoFocus
                          />
                          <button 
                            onClick={() => handleSaveInline(m.code, editValue, m.id)}
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
