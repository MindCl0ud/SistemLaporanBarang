'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Loader2, AlertCircle, FileText, CheckCircle2, Plus } from 'lucide-react'
import { parseDocumentImage } from '@/lib/ai/documentParser'
import { parsePdfServer } from '@/lib/ai/pdfParser'
import { saveDocument } from '@/app/actions/documentActions'
import { parseWithGemini } from '@/app/actions/geminiActions'
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
  const [aiEngine, setAiEngine] = useState<'tesseract' | 'gemini'>('gemini') // Default to Gemini per user request
  
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
        if (aiEngine === 'gemini') {
          setStatusText('Memproses dokumen PDF untuk Gemini (1 Request)...')
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
          })
          
          setStatusText('Meminta Analisis dari Google Gemini AI...')
          const formData = new FormData()
          formData.append('images', base64) // Gemini action supports application/pdf mimeType natively
          
          const geminiData = await parseWithGemini(formData)
          setRawText(JSON.stringify(geminiData, null, 2))
          setPendingData(geminiData)
          setShowManualForm(true)
        } else {
          setStatusText('Memproses PDF Lokal...')
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
          const numPages = Math.min(pdfDoc.numPages, 5) // Handle up to 5 pages
          
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
        }

      } else {
        // Handle direct image uploads
        if (aiEngine === 'gemini') {
          setStatusText('Memproses Gambar ke Format Base64...')
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
          })
          
          setStatusText('Meminta Analisis dari Google Gemini AI...')
          const formData = new FormData()
          formData.append('images', base64)
          const geminiData = await parseWithGemini(formData)
          setRawText(JSON.stringify(geminiData, null, 2))
          setPendingData(geminiData)
          setShowManualForm(true)
        } else {
          const result = await parseDocumentImage(fileUrl, (msg) => setStatusText(msg))
          setRawText(result.text)
          setPendingData({ ...result.data, extractedText: result.text })
          setShowManualForm(true)
        }
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
          className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl text-sm font-bold hover:bg-primary/20 transition-all"
        >
          <Plus className="w-4 h-4" /> Input Manual
        </button>
      </div>
      
      <div className="space-y-4">

        <div
          {...getRootProps()}
          className={`relative overflow-hidden border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer bg-input/20 duration-300 flex flex-col items-center justify-center min-h-[250px] ${isDragActive ? 'border-primary bg-primary/10 scale-[1.02]' : 'border-border dark:border-primary/30 hover:border-primary hover:bg-input/40 dark:hover:bg-black/40'}`}
        >
          <input {...getInputProps()} />
          <Upload className={`w-16 h-16 mb-4 transition-colors ${isDragActive ? 'text-primary' : 'text-muted-foreground opacity-50'}`} />
          <div className="space-y-1">
            <p className="text-base font-bold text-foreground opacity-90">
              {isDragActive ? "Lepaskan file di sini..." : "Tarik & Lepas Gambar Dokumen atau PDF"}
            </p>
            <p className="text-sm text-muted">Mendukung JPG, PNG, WEBP, dan PDF</p>
          </div>
        </div>

        {/* AI ENGINE TOGGLE */}
        <div className="flex items-center justify-center p-2">
          <div className="inline-flex bg-input border border-border rounded-xl p-1">
            <button
              onClick={() => setAiEngine('tesseract')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                aiEngine === 'tesseract' 
                  ? 'bg-card text-foreground shadow-sm border border-border' 
                  : 'text-muted hover:text-foreground'
              }`}
            >
              🚀 Lokal (Tesseract)
            </button>
            <button
              onClick={() => setAiEngine('gemini')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                aiEngine === 'gemini' 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'text-muted hover:text-foreground'
              }`}
            >
              ✨ Super Presisi (Gemini Cloud)
            </button>
          </div>
        </div>

        {loading && (
          <div className="mt-6 space-y-4">
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <p className="text-sm text-primary font-medium">{statusText}</p>
            </div>
            
            {rawText && (
              <div className="p-4 rounded-xl bg-input border border-border animate-in fade-in">
                <p className="text-[10px] font-bold text-muted uppercase mb-2">Hasil Ekstraksi Teks (Raw)</p>
                <pre className="text-[10px] font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap max-h-[150px] overflow-y-auto">
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
