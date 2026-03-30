'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Save, FileUp, Loader2, Search, Package, AlertCircle } from 'lucide-react'
import { saveMasterItem, deleteMasterItem, importMasterItems } from '@/app/actions/masterItemActions'
import { useRouter } from 'next/navigation'

export default function MasterItemManager({ initialItems }: { initialItems: any[] }) {
  const [items, setItems] = useState(initialItems)
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newItem, setNewItem] = useState({ code: '', description: '', unit: 'buah', price: 0 })
  const router = useRouter()

  const filteredItems = items.filter(it => 
    it.code.toLowerCase().includes(search.toLowerCase()) || 
    it.description.toLowerCase().includes(search.toLowerCase())
  )

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      await saveMasterItem(newItem)
      setNewItem({ code: '', description: '', unit: 'buah', price: 0 })
      setShowAddForm(false)
      router.refresh()
    })
  }

  const handleDelete = async (id: string) => {
    if (confirm('Hapus item ini dari master data?')) {
      startTransition(async () => {
        await deleteMasterItem(id)
        router.refresh()
      })
    }
  }

  // Handle CSV Import (Simple)
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = async (event) => {
      const csv = event.target?.result as string
      const lines = csv.split('\n').filter(l => l.trim())
      const parsed = lines.slice(1).map(l => {
        const [code, description, unit, price] = l.split(',').map(s => s.trim())
        return { code, description, unit, price: Number(price) || 0 }
      }).filter(it => it.code && it.description)
      
      if (parsed.length > 0) {
        startTransition(async () => {
          await importMasterItems(parsed)
          router.refresh()
        })
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-3">
            <Package className="w-8 h-8 text-indigo-500" /> Master Data Barang
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium italic opacity-70">
            Kelola database kode barang untuk sinkronisasi otomatis bku.
          </p>
        </div>
        
        <div className="flex gap-2">
          <label className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl text-xs font-bold hover:bg-input transition-all cursor-pointer shadow-sm">
            <FileUp className="w-4 h-4 text-emerald-500" /> Impor CSV
            <input type="file" accept=".csv" onChange={handleImport} className="hidden" />
          </label>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-slate-400 hover:text-black transition-all shadow-md shadow-indigo-500/10"
          >
            <Plus className="w-4 h-4" /> Tambah Item
          </button>
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={handleAdd} className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 grid grid-cols-1 md:grid-cols-4 gap-4 animate-in slide-in-from-top-2 duration-300">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-indigo-400 uppercase">Kode Barang</label>
            <input 
              required className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={newItem.code} onChange={e => setNewItem({...newItem, code: e.target.value})}
              placeholder="Contoh: K-102"
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-[10px] font-black text-indigo-400 uppercase">Deskripsi Barang</label>
            <input 
              required className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})}
              placeholder="Nama barang lengkap..."
            />
          </div>
          <div className="flex items-end gap-2">
             <div className="space-y-1 flex-1">
              <label className="text-[10px] font-black text-indigo-400 uppercase">Satuan</label>
              <input 
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})}
              />
            </div>
            <button 
              disabled={isPending}
              className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-40 h-[38px] transition-colors"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            </button>
          </div>
        </form>
      )}

      <div className="bg-card rounded-2xl border border-border shadow-lg overflow-hidden">
        <div className="p-4 border-b border-border bg-input/20 flex items-center gap-3">
          <Search className="w-4 h-4 text-slate-400" />
          <input 
            className="bg-transparent border-none text-sm w-full outline-none text-foreground placeholder:text-slate-500 font-medium"
            placeholder="Cari berdasarkan kode atau deskripsi..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-input/10 text-left border-b border-border">
                <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest w-40">Kode</th>
                <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Deskripsi</th>
                <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest w-24">Satuan</th>
                <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest w-20 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-indigo-500/5 transition-colors group">
                  <td className="px-6 py-4 font-mono text-indigo-600 dark:text-indigo-400 font-bold">{item.code}</td>
                  <td className="px-6 py-4 text-foreground font-medium">{item.description}</td>
                  <td className="px-6 py-4 text-slate-500 text-xs font-bold uppercase">{item.unit || '—'}</td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500 italic">
                    <div className="flex flex-col items-center gap-2">
                       <AlertCircle className="w-8 h-8 opacity-20" />
                       <span>Tidak menemukan data yang cocok...</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
