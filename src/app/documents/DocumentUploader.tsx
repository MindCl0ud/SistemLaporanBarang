'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Loader2, AlertCircle, CheckCircle2, Plus } from 'lucide-react'
import { parseDocumentImage } from '@/lib/ai/documentParser'
import { parsePdfServer } from '@/lib/ai/pdfParser'
import { saveDocument } from '@/app/actions/documentActions'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

// OPTIMALISASI NEXT.JS: Lazy Loading (Dynamic Import)
// Komponen ManualDocumentForm hanya akan diunduh oleh browser JIKA user menekan tombol "Input Manual".
// Ini mengurangi ukuran bundle JavaScript halaman utama secara signifikan.
const ManualDocumentForm = dynamic(() => import('./ManualDocumentForm'), {
  loading: () => (
    <div className="flex justify-center items-center p-8 bg-card rounded-2xl border border-border mt-4">
      <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      <span className="ml-3 text-sm text-slate-500">Memuat formulir...</span>
    </div>
  ),
  ssr: false // Form ini banyak menggunakan state client-side, aman untuk di-disable SSR-nya
})

export default function DocumentUploader() {
  const [loading, setLoading] = useState(false)
  const [statusText, setStatusText] = useState('')
  const [showManualForm, setShowManualForm] = useState(false)
  const router = useRouter()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setLoading(true)
    setError('')
    setSuccess(false)
    setStatusText('Menginisialisasi AI...')

    try {
      const fileUrl = URL.createObjectURL(file)

      if (file.type === 'application/pdf') {
        setStatusText('Mengekstrak Teks dari PDF (Server)...')
        const formData = new FormData()
        formData.append('file', file)
        const pdfResults = await parsePdfServer(formData) as any[]

        // Consolidation Object
        const masterData: any = {
          type: "Dokumen Gabungan",
          vendorName: "Tidak Diketahui",
          totalAmount: 0,
          extractedText: "",
          pageItems: [] as { type: string, items: any[] }[],
          date: null,
          baDate: null,
          docNumber: "",
          baNumber: "",
          kodeRek: "",
          subKegiatan: ""
        }

        const processPageResult = (res: any) => {
          if (!res) return
          masterData.extractedText += "\n" + res.text
          
          if (res.data.totalAmount > masterData.totalAmount) {
            masterData.totalAmount = res.data.totalAmount
          }
          if (res.data.vendorName && res.data.vendorName !== 'Tidak Diketahui') {
            masterData.vendorName = res.data.vendorName
          }
          if (res.data.kodeRek) masterData.kodeRek = res.data.kodeRek
          if (res.data.subKegiatan) masterData.subKegiatan = res.data.subKegiatan

          if (res.data.items && res.data.items.length > 0) {
            masterData.pageItems.push({
              type: res.data.type,
              items: res.data.items
            })
          }

          if (res.data.type === 'Berita Acara Penerimaan Barang') {
            masterData.baNumber = res.data.docNumber
            masterData.baDate = res.data.date
          } else if (res.data.type === 'Kwitansi') {
            masterData.docNumber = res.data.docNumber
            masterData.date = res.data.date
          } else if (res.data.type === 'Nota Pesanan') {
            if (!masterData.docNumber) masterData.docNumber = res.data.docNumber
            if (!masterData.date) masterData.date = res.data.date
          }
        }

        setStatusText('Memuat Halaman PDF...')
        // OPTIMALISASI: Dynamic import library berat PDF.js hanya saat dibutuhkan
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

        const arrayBuffer = await file.arrayBuffer()
        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        const numPages = Math.min(pdfDoc.numPages, 5) // Batasi maksimal 5 halaman untuk mencegah kelebihan beban RAM
        
        for (let i = 1; i <= numPages; i++) {
          setStatusText(`Mengolah Halaman ${i} dari ${numPages}...`)
          const page = await pdfDoc.getPage(i)
          const viewport = page.getViewport({ scale: 3.5 })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          const ctx = canvas.getContext('2d')
          if (ctx) {
            // @ts-ignore
            await page.render({ canvasContext: ctx, viewport }).promise
            const imgDataUrl = canvas.toDataURL('image/jpeg', 0.95)
            const pageResult = await parseDocumentImage(imgDataUrl, (msg) => setStatusText(`Halaman ${i}: ${msg}`))
            processPageResult(pageResult)
          }
        }

        if (pdfResults && pdfResults.length > 0) {
          pdfResults.forEach((res: any) => {
            if (!res?.data) return
            if (res.data.vendorName && res.data.vendorName !== 'Tidak Diketahui' && masterData.vendorName === 'Tidak Diketahui') {
              masterData.vendorName = res.data.vendorName
            }
            if (res.data.kodeRek && !masterData.kodeRek) masterData.kodeRek = res.data.kodeRek
            if (res.data.subKegiatan && !masterData.subKegiatan) masterData.subKegiatan = res.data.subKegiatan
            if (res.data.baNumber && !masterData.baNumber) masterData.baNumber = res.data.baNumber
          })
        }

        setStatusText('Membersihkan Data Item (Prioritas Berita Acara)...')
        const baPages = masterData.pageItems.filter((p: any) => p.type === 'Berita Acara Penerimaan Barang')
        const kwitansiPages = masterData.pageItems.filter((p: any) => p.type === 'Kwitansi')
        
        let targetItems: any[] = []
        if (baPages.length > 0) {
          targetItems = baPages.flatMap((p: any) => p.items)
        } else if (kwitansiPages.length > 0) {
          targetItems = kwitansiPages.flatMap((p: any) => p.items)
        } else {
          targetItems = masterData.pageItems.flatMap((p: any) => p.items)
        }

        const finalMap = new Map<string, any>()
        targetItems.forEach(it => {
          if (!it.description || !/[a-zA-Z]{2,}/.test(it.description)) return
          if (it.quantity > 99) return 
          if (it.total > 0 && it.price > 0) {
            const expected = it.quantity * it.price
            if (Math.abs(expected - it.total) > 2 * it.total && it.total > 1000) return
          }
          const key = it.description.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 15)
          if (!finalMap.has(key)) finalMap.set(key, it)
        })

        let finalItems = Array.from(finalMap.values())
        finalItems.sort((a, b) => b.description.length - a.description.length)
        
        const cleanedItems: any[] = []
        for (const item of finalItems) {
          const descVal = item.description.toLowerCase().replace(/\s+/g, '')
          const isFragment = cleanedItems.some(existing => {
            const existingDesc = existing.description.toLowerCase().replace(/\s+/g, '')
            return existingDesc.includes(descVal) && (item.price === existing.price || item.total === existing.total)
          })
          if (!isFragment) cleanedItems.push(item)
        }

        const itemsTotalSum = cleanedItems.reduce((acc, it) => acc + (it.total || 0), 0)
        let finalTotal = masterData.totalAmount
        if (finalTotal === 0 && itemsTotalSum > 0) finalTotal = itemsTotalSum

        setStatusText('Menyimpan Dokumen Gabungan...')
        await saveDocument({
          type: "Dokumen Gabungan",
          vendorName: masterData.vendorName,
          totalAmount: finalTotal,
          extractedText: masterData.extractedText,
          items: cleanedItems,
          date: masterData.date || masterData.baDate || new Date(),
          baDate: masterData.baDate,
          kodeRek: masterData.kodeRek,
          subKegiatan: masterData.subKegiatan,
          docNumber: masterData.docNumber,
          baNumber: masterData.baNumber
        })

      } else {
        const result = await parseDocumentImage(fileUrl, (msg) => setStatusText(msg))
        setStatusText('Menyimpan ke Database...')
        await saveDocument({
          type: result.data.type,
          vendorName: result.data.vendorName,
          totalAmount: result.data.totalAmount,
          extractedText: result.text,
          items: result.data.items || [],
          date: result.data.date,
          kodeRek: result.data.kodeRek,
          subKegiatan: result.data.subKegiatan,
          docNumber: result.data.docNumber
        })
      }

      setSuccess(true)
      URL.revokeObjectURL(fileUrl)
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memproses dokumen')
    } finally {
      setLoading(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'application/pdf': ['.pdf'] },
    multiple: false
  })

  return (
    <div className="p-6 rounded-2xl bg-card border border-border shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-foreground flex items-center gap-2">
           Unggah Dokumen
        </h2>
        <button
          onClick={() => setShowManualForm(!showManualForm)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-xl text-sm font-bold hover:bg-indigo-500/20 transition-all"
        >
          <Plus className={`w-4 h-4 transition-transform ${showManualForm ? 'rotate-45' : ''}`} /> 
          {showManualForm ? 'Tutup Manual' : 'Input Manual'}
        </button>
      </div>
      
      <div className={`space-y-4 transition-all duration-300 ${showManualForm ? 'hidden' : 'block'}`}>
        <div
          {...getRootProps()}
          className={`relative overflow-hidden border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer bg-input/20 duration-300 flex flex-col items-center justify-center min-h-[250px] ${isDragActive ? 'border-indigo-400 bg-indigo-500/10 scale-[1.02]' : 'border-border dark:border-indigo-500/30 hover:border-indigo-400 hover:bg-input/40 dark:hover:bg-black/40'}`}
        >
          <input {...getInputProps()} />
          <Upload className={`w-16 h-16 mb-4 transition-colors ${isDragActive ? 'text-indigo-500' : 'text-slate-300 dark:text-slate-400'}`} />
          <div className="space-y-1">
            <p className="text-base font-bold text-foreground opacity-90">
              {isDragActive ? "Lepaskan file di sini..." : "Tarik & Lepas Gambar Dokumen atau PDF"}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Mendukung JPG, PNG, WEBP, dan PDF</p>
          </div>
        </div>

        {loading && (
          <div className="mt-6 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-indigo-500 dark:text-indigo-400 animate-spin" />
            <p className="text-sm text-indigo-700 dark:text-indigo-200 font-medium">{statusText}</p>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 dark:text-rose-400 shrink-0" />
            <p className="text-sm text-rose-700 dark:text-rose-200">{error}</p>
          </div>
        )}

        {success && !loading && (
          <div className="mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-200">Dokumen berhasil diekstrak!</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400/80 mt-1">Data telah disimpan ke database tersinkronisasi AI.</p>
            </div>
          </div>
        )}
      </div>

      {showManualForm && (
        <div className="animate-in fade-in slide-in-from-top-2">
          <ManualDocumentForm 
            onClose={() => setShowManualForm(false)} 
            onSuccess={() => {
              setShowManualForm(false)
              router.refresh()
            }} 
          />
        </div>
      )}
    </div>
  )
}
