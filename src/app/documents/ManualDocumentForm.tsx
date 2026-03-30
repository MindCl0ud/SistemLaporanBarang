'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Save, Plus, Trash2, Loader2, Maximize2, Minimize2, FileText } from 'lucide-react'
import { saveDocument } from '@/app/actions/documentActions'

interface ManualDocumentFormProps {
  onClose: () => void
  onSuccess: () => void
  initialData?: any
  imageUrl?: string
}

export default function ManualDocumentForm({ onClose, onSuccess, initialData, imageUrl }: ManualDocumentFormProps) {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isSplitView, setIsSplitView] = useState(!!imageUrl)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const [formData, setFormData] = useState({
    type: initialData?.type || 'Kwitansi',
    date: initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    docNumber: initialData?.docNumber || '',
    baNumber: initialData?.baNumber || '',
    baDate: initialData?.baDate ? new Date(initialData.baDate).toISOString().split('T')[0] : '',
    vendorName: initialData?.vendorName || '',
    totalAmount: initialData?.totalAmount || 0,
    kodeRek: initialData?.kodeRek || '',
    subKegiatan: initialData?.subKegiatan || '',
    paymentFor: initialData?.paymentFor || '',
    extractedText: initialData?.extractedText || '',
    items: initialData?.items?.map((it: any) => ({
      itemCode: it.itemCode || '',
      description: it.description || '',
      quantity: it.quantity || 1,
      unit: it.unit || 'buah',
      price: it.price || 0,
      total: it.total || 0
    })) || [{ description: '', itemCode: '', quantity: 1, unit: '', price: 0, total: 0 }]
  })

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', itemCode: '', quantity: 1, unit: '', price: 0, total: 0 }]
    }))
  }

  const [showRawText, setShowRawText] = useState(false)

  const handleRemoveItem = (index: number) => {
    const newItems = formData.items.filter((_it: any, i: number) => i !== index)
    setFormData(prev => ({
      ...prev,
      items: newItems,
      totalAmount: newItems.reduce((sum: number, it: any) => sum + (Number(it.total) || 0), 0)
    }))
  }

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items]
    const item = { ...newItems[index], [field]: value }
    item.total = (Number(item.quantity) || 0) * (Number(item.price) || 0)
    newItems[index] = item
    
    setFormData(prev => ({
      ...prev,
      items: newItems,
      totalAmount: newItems.reduce((sum: number, it: any) => sum + (it.total || 0), 0)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await saveDocument({
        ...formData,
        imageUrl: imageUrl || null
      })
      
      if (result.success) {
        onSuccess()
        onClose()
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (err: any) {
      console.error(err)
      alert(`Error: ${err.message || 'Gagal menyimpan dokumen.'}`)
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className={`bg-card border border-border rounded-2xl overflow-hidden shadow-2xl flex flex-col transition-all duration-500 ${isSplitView ? 'w-full max-w-[95vw] h-[90vh]' : 'w-full max-w-4xl max-h-[90vh]'}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-input/50">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              {imageUrl ? 'Review & Simpan Dokumen AI' : 'Input Dokumen Manual'}
            </h2>
            {imageUrl && (
              <div className="flex items-center gap-2 bg-slate-500/5 p-1 rounded-xl border border-border">
                <button 
                  onClick={() => setIsSplitView(!isSplitView)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${isSplitView ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-500/10'}`}
                >
                  {isSplitView ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                  Split View
                </button>
                <button 
                  onClick={() => setShowRawText(!showRawText)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${showRawText ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-500/10'}`}
                >
                  <FileText className="w-3 h-3" />
                  Raw Text
                </button>
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-1 text-slate-500 dark:text-slate-400 hover:text-foreground transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* PDF/Image Preview Side (Split View) */}
          {isSplitView && imageUrl && (
            <div className="w-1/2 border-r border-border bg-slate-100 dark:bg-slate-900 overflow-auto p-4 flex flex-col items-center">
              {showRawText ? (
                <div className="w-full h-full p-6 bg-white dark:bg-slate-800 rounded-xl border border-border overflow-y-auto animate-in fade-in zoom-in-95">
                  <h3 className="text-[10px] font-bold text-indigo-600 uppercase mb-4 tracking-widest">Extracted Raw Text</h3>
                  <pre className="text-xs font-mono text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {formData.extractedText || "Tidak ada teks mentah yang tersedia."}
                  </pre>
                </div>
              ) : (
                <img 
                  src={imageUrl || initialData?.imageUrl} 
                  alt="Original Document" 
                  onError={(e) => {
                    console.error("Image failed to load:", imageUrl);
                    const target = e.target as HTMLImageElement;
                    target.src = "https://placehold.co/600x800?text=Scan+Gagal+Dimuat";
                  }}
                  className="max-w-full h-auto shadow-lg rounded border border-border animate-in zoom-in-95" 
                />
              )}
            </div>
          )}

          {/* Form Body */}
          <form onSubmit={handleSubmit} className={`flex-1 overflow-y-auto p-6 space-y-6 ${isSplitView ? 'w-1/2' : 'w-full'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tipe Dokumen</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Kwitansi">Kwitansi</option>
                    <option value="Berita Acara Penerimaan Barang">BA Penerimaan</option>
                    <option value="Nota Pesanan">Nota Pesanan</option>
                    <option value="Dokumen Gabungan">Dokumen Gabungan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nama Vendor / Penyedia</label>
                  <input
                    type="text"
                    required
                    value={formData.vendorName}
                    onChange={e => setFormData({ ...formData, vendorName: e.target.value })}
                    placeholder="Contoh: Sumber Mas"
                    className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                {/* Payment Description (NEW) */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Uraian Pembayaran</label>
                  <textarea
                    rows={3}
                    value={formData.paymentFor}
                    onChange={e => setFormData({ ...formData, paymentFor: e.target.value })}
                    placeholder="Contoh: Belanja Pemeliharaan Alat Angkutan Darat..."
                    className="w-full bg-input border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
              </div>

              {/* Dates & Codes */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Kode Rekening</label>
                    <input
                      type="text"
                      value={formData.kodeRek}
                      onChange={e => setFormData({ ...formData, kodeRek: e.target.value })}
                      className="w-full bg-input border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sub Kegiatan</label>
                    <input
                      type="text"
                      value={formData.subKegiatan}
                      onChange={e => setFormData({ ...formData, subKegiatan: e.target.value })}
                      className="w-full bg-input border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tanggal Dokumen</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                      className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nomor Dokumen</label>
                    <input
                      type="text"
                      value={formData.docNumber}
                      onChange={e => setFormData({ ...formData, docNumber: e.target.value })}
                      className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Total Keseluruhan</label>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-lg">
                    Rp {new Intl.NumberFormat('id-ID').format(formData.totalAmount)}
                  </div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Rincian Item & Kode Barang</h3>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all"
                >
                  <Plus className="w-3 h-3" /> Tambah Baris
                </button>
              </div>
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-input/50 text-slate-500 dark:text-slate-400">
                    <tr className="bg-input/80 border-b border-border">
                      <th className="text-left px-3 py-2 text-[10px] font-bold text-foreground/50 uppercase tracking-widest w-24">Kode</th>
                      <th className="text-left px-3 py-2 text-[10px] font-bold text-foreground/50 uppercase tracking-widest">Deskripsi</th>
                      <th className="text-center px-3 py-2 text-[10px] font-bold text-foreground/50 uppercase tracking-widest w-16">Qty</th>
                      <th className="text-center px-3 py-2 text-[10px] font-bold text-foreground/50 uppercase tracking-widest w-16">Satuan</th>
                      <th className="text-right px-3 py-2 text-[10px] font-bold text-foreground/50 uppercase tracking-widest w-28">Harga</th>
                      <th className="text-right px-3 py-2 text-[10px] font-bold text-foreground/50 uppercase tracking-widest w-28">Total</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {formData.items.map((item: any, idx: number) => (
                      <tr key={idx} className="border-b border-border/50 hover:bg-indigo-500/5 transition-colors">
                        <td className="px-2 py-1.5">
                          <input
                            type="text"
                            value={item.itemCode || ''}
                            onChange={e => handleItemChange(idx, 'itemCode', e.target.value)}
                            placeholder="Kode..."
                            className="w-full bg-input border border-border/50 rounded px-2 py-1 text-[11px] text-indigo-400 font-mono focus:ring-1 focus:ring-indigo-500 outline-none"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="text"
                            required
                            value={item.description}
                            onChange={e => handleItemChange(idx, 'description', e.target.value)}
                            className="w-full bg-transparent border-none focus:ring-0 text-foreground"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            required
                            value={item.quantity}
                            onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                            className="w-full bg-transparent border-none text-center focus:ring-0"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="text"
                            value={item.unit || ''}
                            onChange={e => handleItemChange(idx, 'unit', e.target.value)}
                            className="w-full bg-transparent border-none text-center focus:ring-0 text-slate-500"
                            placeholder="Satuan"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            required
                            value={item.price}
                            onChange={e => handleItemChange(idx, 'price', e.target.value)}
                            className="w-full bg-transparent border-none text-right focus:ring-0 font-mono"
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                          {new Intl.NumberFormat('id-ID').format(item.total)}
                        </td>
                        <td className="p-1 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 rounded transition-all"
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
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-input/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-foreground">
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-lg transition-all"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Simpan Dokumen
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
