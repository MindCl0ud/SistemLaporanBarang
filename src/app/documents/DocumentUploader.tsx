'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { UploadCloud, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { parseDocumentImage } from '@/lib/ai/documentParser'
import { parsePdfServer } from '@/lib/ai/pdfParser'
import { saveDocument } from '@/app/actions/documentActions'

export default function DocumentUploader() {
  const [loading, setLoading] = useState(false)
  const [statusText, setStatusText] = useState('')
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
      let result: any;
      // Convert to object URL for image preview or processing if it's an image
      const fileUrl = URL.createObjectURL(file)

      if (file.type === 'application/pdf') {
        setStatusText('Mengekstrak Teks dari PDF (Server)...')
        const formData = new FormData()
        formData.append('file', file)
        result = await parsePdfServer(formData)

        // Fallback for Scanned PDFs (Images wrapped in PDF)
        if (result.text.trim().length < 50 && result.data.totalAmount === 0) {
          setStatusText('PDF Scan terdeteksi. Menyiapkan Mesin Pembaca Gambar...')
          // Dynamically import to keep bundle small
          const pdfjsLib = await import('pdfjs-dist')
          // Use unpkg CDN for the worker to avoid Next.js bundling issues
          pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
          
          const arrayBuffer = await file.arrayBuffer()
          const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
          const page = await pdfDoc.getPage(1)
          const viewport = page.getViewport({ scale: 2.0 })
          
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          const ctx = canvas.getContext('2d')
          
          if (ctx) {
            setStatusText('Mengubah PDF menjadi Gambar (Local)...')
            // @ts-ignore
            await page.render({ canvasContext: ctx, viewport }).promise
            const imgDataUrl = canvas.toDataURL('image/png')
            
            setStatusText('Memulai OCR Gambar PDF...')
            result = await parseDocumentImage(imgDataUrl, (msg) => setStatusText(msg))
            if (!result.data.type) result.data.type = "Nota"
          }
        }
      } else {
        // Run Native OCR & AI Parsing for Images
        result = await parseDocumentImage(fileUrl, (msg) => setStatusText(msg))
      }

      setStatusText('Menyimpan ke Database...')
      
      // Save to Supabase (via Server Action)
      await saveDocument({
        type: result.data.type,
        vendorName: result.data.vendorName,
        totalAmount: result.data.totalAmount,
        extractedText: result.text
      })

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
    <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-blue-500/5 border border-indigo-500/20 backdrop-blur-md">
      <h2 className="text-lg font-medium text-white mb-4">Unggah Dokumen</h2>
      
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${isDragActive ? 'border-indigo-400 bg-indigo-500/10 scale-105' : 'border-indigo-500/30 hover:border-indigo-400 bg-black/20 hover:bg-black/40'}`}
      >
        <input {...getInputProps()} />
        <UploadCloud className={`w-12 h-12 mb-4 transition-colors ${isDragActive ? 'text-indigo-400' : 'text-slate-400'}`} />
        <p className="text-sm font-medium text-slate-200 text-center">
          {isDragActive ? "Lepaskan file di sini..." : "Tarik & Lepas Gambar Dokumen atau PDF ke sini"}
        </p>
        <p className="text-xs text-slate-400 mt-2 text-center">Mendukung JPG, PNG, WEBP, dan PDF</p>
      </div>

      {loading && (
        <div className="mt-6 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
          <p className="text-sm text-indigo-200 font-medium">{statusText}</p>
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <p className="text-sm text-rose-200">{error}</p>
        </div>
      )}

      {success && !loading && (
        <div className="mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-200">Dokumen berhasil diekstrak!</p>
            <p className="text-xs text-emerald-400/80 mt-1">Data telah disimpan ke database tersinkronisasi AI.</p>
          </div>
        </div>
      )}
    </div>
  )
}
