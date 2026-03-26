'use client'

import React, { useState } from 'react'
import { X, Save, Plus, Trash2, Loader2 } from 'lucide-react'
import { saveDocument } from '@/app/actions/documentActions'

interface ManualDocumentFormProps {
  onClose: () => void
  onSuccess: () => void
}

export default function ManualDocumentForm({ onClose, onSuccess }: ManualDocumentFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    type: 'Kwitansi',
    date: new Date().toISOString().split('T')[0],
    docNumber: '',
    baNumber: '',
    baDate: '',
    vendorName: '',
    totalAmount: 0,
    kodeRek: '',
    subKegiatan: '',
    items: [{ description: '', quantity: 1, price: 0, total: 0 }]
  })

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, price: 0, total: 0 }]
    }))
  }

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items]
    const item = { ...newItems[index], [field]: value }
    item.total = item.quantity * item.price
    newItems[index] = item
    
    setFormData(prev => ({
      ...prev,
      items: newItems,
      totalAmount: newItems.reduce((sum, it) => sum + it.total, 0)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await saveDocument({
        ...formData,
        extractedText: "Input Manual"
      })
      onSuccess()
      onClose()
    } catch (err) {
      console.error(err)
      alert('Gagal menyimpan dokumen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/50">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-400" />
            Input Dokumen Manual
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tipe Dokumen</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Kwitansi">Kwitansi</option>
                  <option value="Berita Acara Penerimaan Barang">BA Penerimaan</option>
                  <option value="Nota Pesanan">Nota Pesanan</option>
                  <option value="Dokumen Gabungan">Dokumen Gabungan (Kwitansi + BA)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nama Vendor</label>
                <input
                  type="text"
                  required
                  value={formData.vendorName}
                  onChange={e => setFormData({ ...formData, vendorName: e.target.value })}
                  placeholder="Contoh: Sumber Mas"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Kode Rekening</label>
                  <input
                    type="text"
                    value={formData.kodeRek}
                    onChange={e => setFormData({ ...formData, kodeRek: e.target.value })}
                    placeholder="5.01.01.2.09.0002"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sub Kegiatan</label>
                  <input
                    type="text"
                    value={formData.subKegiatan}
                    onChange={e => setFormData({ ...formData, subKegiatan: e.target.value })}
                    placeholder="5.1.02.03.02.0035"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Dates & Numbers */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tanggal Kwitansi</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nomor Kwitansi</label>
                  <input
                    type="text"
                    value={formData.docNumber}
                    onChange={e => setFormData({ ...formData, docNumber: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tanggal BA</label>
                  <input
                    type="date"
                    value={formData.baDate}
                    onChange={e => setFormData({ ...formData, baDate: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nomor BA</label>
                  <input
                    type="text"
                    value={formData.baNumber}
                    onChange={e => setFormData({ ...formData, baNumber: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Total Keseluruhan</label>
                <div className="bg-slate-950/50 border border-slate-800 rounded-lg px-3 py-2 text-indigo-400 font-mono font-bold text-lg">
                  Rp {new Intl.NumberFormat('id-ID').format(formData.totalAmount)}
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Rincian Item</h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all"
              >
                <Plus className="w-3 h-3" /> Tambah Baris
              </button>
            </div>
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-800/50 text-slate-400">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Deskripsi</th>
                    <th className="px-3 py-2 text-center font-semibold w-16">Qty</th>
                    <th className="px-3 py-2 text-right font-semibold w-32">Harga Satuan</th>
                    <th className="px-3 py-2 text-right font-semibold w-32">Total</th>
                    <th className="px-3 py-2 text-center font-semibold w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {formData.items.map((item, idx) => (
                    <tr key={idx} className="bg-slate-900/40">
                      <td className="p-1">
                        <input
                          type="text"
                          required
                          value={item.description}
                          onChange={e => handleItemChange(idx, 'description', e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 text-white placeholder:text-slate-600"
                          placeholder="Masukkan nama barang..."
                        />
                      </td>
                      <td className="p-1">
                        <input
                          type="number"
                          required
                          value={item.quantity}
                          onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))}
                          className="w-full bg-transparent border-none text-center focus:ring-0 text-white"
                        />
                      </td>
                      <td className="p-1">
                        <input
                          type="number"
                          required
                          value={item.price}
                          onChange={e => handleItemChange(idx, 'price', Number(e.target.value))}
                          className="w-full bg-transparent border-none text-right focus:ring-0 text-indigo-300 font-mono"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-400">
                        {new Intl.NumberFormat('id-ID').format(item.total)}
                      </td>
                      <td className="p-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-400/10 rounded transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-800/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-500/50 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Simpan Dokumen
          </button>
        </div>
      </div>
    </div>
  )
}
