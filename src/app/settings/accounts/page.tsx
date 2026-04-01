'use client'

import { useState, useEffect } from 'react'
import { ListTree, Plus, Save, Trash2, Loader2, Search, Pencil } from 'lucide-react'
import { getAccountMappings, upsertAccountMapping, deleteAccountMapping } from '@/app/actions/bkuActions'

export default function AccountMappingPage() {
  const [mappings, setMappings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [newMapping, setNewMapping] = useState({ code: '', name: '' })
  const [saving, setSaving] = useState(false)

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
      setNewMapping({ code: '', name: '' })
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

  const filtered = mappings.filter(m => 
    m.code.toLowerCase().includes(search.toLowerCase()) || 
    m.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-black text-foreground flex items-center gap-3">
          <ListTree className="w-8 h-8 text-primary" />
          Master Rekening
        </h1>
        <p className="text-foreground/80 mt-2 font-black">Kelola nama khusus untuk kode rekening agar laporan lebih mudah dibaca.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Form */}
        <div className="md:col-span-1">
          <div className="p-6 rounded-3xl bg-card border border-border shadow-sm sticky top-8">
            <h2 className="text-sm font-black text-foreground uppercase tracking-widest mb-6 flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              Tambah / Edit
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-muted uppercase mb-1 tracking-widest">Kode Rekening</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 5.1.02.01..."
                  className="w-full bg-white dark:bg-input border border-border rounded-xl px-4 py-2.5 text-sm font-bold text-foreground focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-muted/60"
                  value={newMapping.code}
                  onChange={e => setNewMapping({ ...newMapping, code: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-muted uppercase mb-1 tracking-widest">Nama Kustom</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Belanja Alat Tulis"
                  className="w-full bg-white dark:bg-input border border-border rounded-xl px-4 py-2.5 text-sm font-bold text-foreground focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-muted/60"
                  value={newMapping.name}
                  onChange={e => setNewMapping({ ...newMapping, name: e.target.value })}
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full mt-2 flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-xl text-sm font-black shadow-lg shadow-primary/20 transition-all"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Simpan Pemetaan
              </button>
            </form>
          </div>
        </div>

        {/* List */}
        <div className="md:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Cari kode atau nama..."
              className="w-full bg-card border border-border rounded-2xl pl-12 pr-4 py-3 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-primary transition-all shadow-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-input/50">
                  <th className="text-left px-6 py-4 text-[10px] font-black text-muted uppercase tracking-widest border-b border-border">Kode</th>
                  <th className="text-left px-6 py-4 text-[10px] font-black text-muted uppercase tracking-widest border-b border-border">Nama Kustom</th>
                  <th className="text-center px-6 py-4 text-[10px] font-black text-muted uppercase tracking-widest border-b border-border w-24">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-foreground font-black italic">Memuat data...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-foreground/70 font-black italic">Belum ada pemetaan.</td>
                  </tr>
                ) : filtered.map(m => (
                  <tr key={m.id} className="hover:bg-primary/5 transition-colors border-b border-border/50 last:border-0 group">
                    <td className="px-6 py-4 font-mono text-xs text-primary font-bold">{m.code}</td>
                    <td className="px-6 py-4 font-bold text-foreground">{m.name}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => setNewMapping({ code: m.code, name: m.name })}
                          className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-all shadow-sm border border-transparent hover:border-primary/20"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="p-2 text-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
