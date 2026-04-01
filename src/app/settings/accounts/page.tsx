'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ListTree, 
  Plus, 
  Save, 
  Trash2, 
  Loader2, 
  Search, 
  Pencil, 
  RefreshCw, 
  X,
  CreditCard,
  Hash,
  ArrowRight
} from 'lucide-react'
import { getAccountMappings, upsertAccountMapping, deleteAccountMapping, syncAccountCodesFromBku } from '@/app/actions/bkuActions'

export default function AccountMappingPage() {
  const [mappings, setMappings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [newMapping, setNewMapping] = useState({ id: '', code: '', name: '' })
  const [saving, setSaving] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMapping.code || !newMapping.name) return
    
    setSaving(true)
    try {
      await upsertAccountMapping(newMapping.code, newMapping.name)
      setNewMapping({ id: '', code: '', name: '' })
      fetchMappings()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus pemetaan ini?')) return
    await deleteAccountMapping(id)
    fetchMappings()
  }

  const handleEdit = (m: any) => {
    setNewMapping({ id: m.id, code: m.code, name: m.name })
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
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
    <div className="max-w-[1400px] mx-auto px-4 py-8 space-y-12 min-h-screen">
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-2">
            <Hash className="w-3 h-3" /> Sistem Pemetaan Data
          </div>
          <h1 className="text-4xl font-black text-foreground flex items-center gap-4 tracking-tighter">
            <div className="p-3 rounded-2xl bg-primary text-white shadow-xl shadow-primary/20">
              <ListTree className="w-8 h-8" />
            </div>
            Master Rekening
          </h1>
          <p className="text-foreground/70 font-black text-lg max-w-2xl leading-tight">
            Personalisasi kode rekening BKU yang rumit menjadi nama yang mudah dikenali untuk laporan yang lebih intuitif.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSync}
            disabled={loading}
            className="group flex items-center gap-2 px-6 py-4 bg-white dark:bg-card hover:bg-primary hover:text-white text-foreground rounded-2xl text-sm font-black border border-border hover:border-primary transition-all shadow-xl shadow-indigo-500/5 active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 transition-transform group-hover:rotate-180 duration-500 ${loading ? 'animate-spin' : ''}`} />
            Sinkronisasi dari BKU
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* LEFT COLUMN: FORM */}
        <motion.div 
          ref={formRef}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-4 sticky top-10"
        >
          <div className="p-8 rounded-[2.5rem] bg-white dark:bg-card border border-border shadow-2xl shadow-indigo-500/5 space-y-8 relative overflow-hidden group">
            {/* Ambient Background Accent */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-700 font-black" />
            
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-foreground flex items-center gap-3">
                {newMapping.id ? <Pencil className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
                {newMapping.id ? 'Edit Rekening' : 'Tambah Rekening'}
              </h2>
              {newMapping.id && (
                <button 
                  onClick={() => setNewMapping({ id: '', code: '', name: '' })}
                  className="p-2 hover:bg-input rounded-xl transition-colors text-muted"
                  title="Batalkan Edit"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-foreground/50 uppercase tracking-[0.2em] ml-1">Kode Rekening</label>
                <div className="relative group/input">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within/input:text-primary transition-colors" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 5.1.02.01..."
                    className="w-full bg-slate-50 dark:bg-input border border-border rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-foreground focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all placeholder:text-muted/40 shadow-inner"
                    value={newMapping.code}
                    onChange={e => setNewMapping({ ...newMapping, code: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-foreground/50 uppercase tracking-[0.2em] ml-1">Nama Kustom</label>
                <div className="relative group/input">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within/input:text-primary transition-colors" />
                  <textarea
                    required
                    rows={3}
                    placeholder="Contoh: Belanja Alat Tulis Kantor (BOS)..."
                    className="w-full bg-slate-50 dark:bg-input border border-border rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-foreground focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all placeholder:text-muted/40 shadow-inner resize-none"
                    value={newMapping.name}
                    onChange={e => setNewMapping({ ...newMapping, name: e.target.value })}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-[1.5rem] text-sm font-black shadow-2xl shadow-primary/30 transition-all active:scale-95 group/btn"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />}
                {newMapping.id ? 'Simpan Perubahan' : 'Daftarkan Rekening'}
              </button>
            </form>
          </div>
        </motion.div>

        {/* RIGHT COLUMN: LIST */}
        <div className="lg:col-span-8 space-y-6">
          {/* SEARCH & FILTER BAR */}
          <div className="flex items-center gap-4 bg-white dark:bg-card p-2 pr-4 rounded-[2rem] border border-border shadow-2xl shadow-indigo-500/5">
            <div className="relative flex-1">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <input
                type="text"
                placeholder="Cari kode atau nama rekening..."
                className="w-full bg-transparent border-none rounded-2xl pl-16 pr-6 py-4 text-base font-bold text-foreground outline-none placeholder:text-muted/40"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-input rounded-xl border border-border text-[10px] font-black text-muted uppercase">
              {filtered.length} Rekening Terdaftar
            </div>
          </div>

          {/* CARDS LIST */}
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence mode="popLayout">
              {loading ? (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="py-32 text-center space-y-4"
                >
                  <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto opacity-20" />
                  <p className="text-foreground/30 font-black uppercase tracking-[0.3em] text-xs">Menyelaraskan Data...</p>
                </motion.div>
              ) : filtered.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-32 text-center space-y-6 bg-slate-50 dark:bg-card/30 rounded-[3rem] border-2 border-dashed border-border"
                >
                  <div className="w-20 h-20 bg-muted/20 rounded-full flex items-center justify-center mx-auto">
                    <ListTree className="w-10 h-10 text-muted" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xl font-black text-foreground">Data Masih Kosong</p>
                    <p className="text-foreground/50 text-sm font-bold">Belum ada pemetaan kode rekening yang ditemukan.</p>
                  </div>
                </motion.div>
              ) : (
                filtered.map((m, idx) => (
                  <motion.div
                    key={m.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.03 }}
                    className="group relative bg-white dark:bg-card border border-border hover:border-primary/30 rounded-[2rem] p-6 pr-8 transition-all hover:shadow-2xl hover:shadow-indigo-500/10"
                  >
                    <div className="flex items-start gap-6">
                      {/* Icon/Badge */}
                      <div className="hidden sm:flex shrink-0 w-14 h-14 rounded-2xl bg-slate-50 dark:bg-input border border-border items-center justify-center group-hover:bg-primary/5 group-hover:border-primary/20 transition-colors">
                        <CreditCard className="w-6 h-6 text-muted group-hover:text-primary transition-colors" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span className="font-mono text-[10px] font-black text-primary bg-primary/5 px-3 py-1 rounded-full border border-primary/10 tracking-tight">
                            {m.code}
                          </span>
                        </div>
                        <h3 className="text-lg font-black text-foreground leading-snug break-words">
                          {m.name}
                        </h3>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                        <button
                          onClick={() => handleEdit(m)}
                          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 rounded-xl text-xs font-black hover:bg-primary hover:text-white transition-all border border-transparent"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-black hover:bg-rose-500 hover:text-white transition-all border border-transparent"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Hapus
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
