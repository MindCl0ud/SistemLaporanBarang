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
        const pdfResults = await parsePdfServer(formData) as any[]

        // Fallback for Scanned PDFs (Images wrapped in PDF)
        // If the first page has almost no text and no amount, trigger multi-page OCR
        const firstResult = pdfResults[0]
        const cleanFirstText = firstResult?.text?.replace(/\\f/g, '').trim() || ''
        
        if (cleanFirstText.length < 50 && (!firstResult || firstResult.data.totalAmount === 0)) {
          setStatusText('PDF Scan/Dokumen Gambar terdeteksi. Menyiapkan OCR Multi-Halaman...')
          const pdfjsLib = await import('pdfjs-dist')
          pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
          
          const arrayBuffer = await file.arrayBuffer()
          const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
          
          // Process up to first 5 pages
          const numPages = Math.min(pdfDoc.numPages, 5)
          
          for (let i = 1; i <= numPages; i++) {
            setStatusText(`Mengolah Halaman ${i} dari ${numPages}...`)
            const page = await pdfDoc.getPage(i)
            const viewport = page.getViewport({ scale: 2.0 })
            
            const canvas = document.createElement('canvas')
            canvas.width = viewport.width
            canvas.height = viewport.height
            const ctx = canvas.getContext('2d')
            
            if (ctx) {
              // @ts-ignore
              await page.render({ canvasContext: ctx, viewport }).promise
              const imgDataUrl = canvas.toDataURL('image/png')
              
              const pageResult = await parseDocumentImage(imgDataUrl, (msg) => setStatusText(`Halaman ${i}: ${msg}`))
              
              // Only save if it looks like a real document (has text or amount)
              if (pageResult.text.length > 50 || pageResult.data.totalAmount > 0) {
                setStatusText(`Menyimpan Halaman ${i}...`)
                await saveDocument({
                  type: pageResult.data.type,
                  vendorName: pageResult.data.vendorName,
                  totalAmount: pageResult.data.totalAmount,
                  extractedText: pageResult.text,
                  items: pageResult.data.items || [],
                  date: pageResult.data.date,
                  kodeRek: pageResult.data.kodeRek,
                  subKegiatan: pageResult.data.subKegiatan,
                  docNumber: pageResult.data.docNumber
                })
              }
            }
          }
        } else {
          // Searchable PDF with content - Save each identified logical document
          setStatusText(`Menyimpan ${pdfResults.length} Dokumen...`)
          for (const res of pdfResults) {
            await saveDocument({
              type: res.data.type,
              vendorName: res.data.vendorName,
              totalAmount: res.data.totalAmount,
              extractedText: res.text,
              items: res.data.items || [],
              date: res.data.date,
              kodeRek: res.data.kodeRek,
              subKegiatan: res.data.subKegiatan,
              docNumber: res.data.docNumber
            })
          }
        }
      } else {
        // Run Native OCR & AI Parsing for Single Images
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
