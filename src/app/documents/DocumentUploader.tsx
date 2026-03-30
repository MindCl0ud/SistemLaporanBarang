'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Loader2, AlertCircle, FileText, CheckCircle2, Plus } from 'lucide-react'
import { parseDocumentImage } from '@/lib/ai/documentParser'
import { parsePdfServer } from '@/lib/ai/pdfParser'
import { saveDocument } from '@/app/actions/documentActions'
import { useRouter } from 'next/navigation'
import ManualDocumentForm from './ManualDocumentForm'

export default function DocumentUploader() {
  const [loading, setLoading] = useState(false)
  const [statusText, setStatusText] = useState('')
  const [showManualForm, setShowManualForm] = useState(false)
  const router = useRouter()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [rawText, setRawText] = useState('')
  const [pendingData, setPendingData] = useState<any>(null)
  const [capturedImageUrl, setCapturedImageUrl] = useState<string>('')
  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setLoading(true)
    setError('')
    setSuccess(false)
    setRawText('')
    setPendingData(null)
    setStatusText('Menginisialisasi AI...')

    try {
      const fileUrl = URL.createObjectURL(file)
      setCapturedImageUrl(fileUrl)

      if (file.type === 'application/pdf') {
        setStatusText('Memproses PDF...')
        const masterData: any = {
          type: "Dokumen Gabungan",
          vendorName: "Tidak Diketahui",
          totalAmount: 0,
          extractedText: "",
          pageItems: [] as any[],
          paymentFor: ""
        }

        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
        const arrayBuffer = await file.arrayBuffer()
        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        const numPages = Math.min(pdfDoc.numPages, 5)
        
        for (let i = 1; i <= numPages; i++) {
          setStatusText(`Mengolah Halaman ${i} dari ${numPages}...`)
          const page = await pdfDoc.getPage(i)
          const viewport = page.getViewport({ scale: 2.5 })
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          canvas.width = viewport.width
          canvas.height = viewport.height
          if (ctx) {
            // @ts-ignore
            await page.render({ canvasContext: ctx, viewport }).promise
            const img = canvas.toDataURL('image/jpeg', 0.9)
            const pageRes = await parseDocumentImage(img, (msg) => setStatusText(`Hal ${i}: ${msg}`))
            
            masterData.extractedText += "\n" + pageRes.text
            setRawText(p => p + "\n" + pageRes.text)
            
            if (pageRes.data.totalAmount > masterData.totalAmount) masterData.totalAmount = pageRes.data.totalAmount
            if (pageRes.data.vendorName && pageRes.data.vendorName !== 'Tidak Diketahui') masterData.vendorName = pageRes.data.vendorName
            if (pageRes.data.paymentFor) masterData.paymentFor += " " + pageRes.data.paymentFor
            if (pageRes.data.items) masterData.pageItems.push(...pageRes.data.items)
          }
        }
        
        setPendingData({
          ...masterData,
          items: masterData.pageItems
        })
        setShowManualForm(true)

      } else {
        const result = await parseDocumentImage(fileUrl, (msg) => setStatusText(msg))
        setRawText(result.text)
        setPendingData({ ...result.data, extractedText: result.text })
        setShowManualForm(true)
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan')
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
          onClick={() => {
            setPendingData(null)
            setCapturedImageUrl('')
            setShowManualForm(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-xl text-sm font-bold hover:bg-indigo-500/20 transition-all"
        >
          <Plus className="w-4 h-4" /> Input Manual
        </button>
      </div>
      
      <div className="space-y-4">

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
          <div className="mt-6 space-y-4">
            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-indigo-500 dark:text-indigo-400 animate-spin" />
              <p className="text-sm text-indigo-700 dark:text-indigo-200 font-medium">{statusText}</p>
            </div>
            
            {rawText && (
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-border animate-in fade-in">
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Hasil Ekstraksi Teks (Raw)</p>
                <pre className="text-[10px] font-mono text-slate-600 dark:text-slate-400 overflow-x-auto whitespace-pre-wrap max-h-[150px] overflow-y-auto">
                  {rawText}
                </pre>
              </div>
            )}
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
        <ManualDocumentForm 
          onClose={() => {
            setShowManualForm(false)
            setPendingData(null)
          }} 
          onSuccess={() => {
            setSuccess(true)
            router.refresh()
          }}
          initialData={pendingData}
          imageUrl={capturedImageUrl}
        />
      )}
    </div>
  )
}
