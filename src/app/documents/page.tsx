import { FileText } from "lucide-react"
export const dynamic = 'force-dynamic'
import DocumentUploader from "./DocumentUploader"
import DocumentList from "./DocumentList"
import { getDocuments } from "@/app/actions/documentActions"

export default async function DocumentsPage() {
  const documents = await getDocuments()

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
      <header>
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400 flex items-center gap-3">
          <FileText className="w-8 h-8 text-emerald-400" />
          Ekstraksi Dokumen AI
        </h1>
        <p className="text-slate-400 mt-2">Unggah Nota Pesanan, Berita Acara, atau Kwitansi untuk dibaca secara otomatis oleh AI.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <DocumentUploader />
        </div>
        <div className="lg:col-span-2">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md min-h-[500px]">
            <h2 className="text-lg font-medium text-white mb-6">Dokumen Tersimpan</h2>
             <DocumentList initialDocuments={documents} />
          </div>
        </div>
      </div>
    </div>
  )
}
