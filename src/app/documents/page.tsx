import { FileText, Bot } from "lucide-react"
export const dynamic = 'force-dynamic'
import DocumentUploader from "./DocumentUploader"
import DocumentList from "./DocumentList"
import MatchTrigger from "./MatchTrigger"
import { getDocuments } from "@/app/actions/documentActions"

export default async function DocumentsPage() {
  const documents = await getDocuments()

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-700">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex-1">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400 flex items-center gap-3">
            <FileText className="w-8 h-8 text-emerald-400" />
            Ekstraksi Dokumen AI
          </h1>
          <p className="text-slate-400 mt-2 text-sm max-w-2xl">Unggah Nota Pesanan, Berita Acara, atau Kwitansi untuk dibaca secara otomatis oleh AI dan dicocokkan dengan Buku Kas Umum (BKU).</p>
        </div>
        <div className="w-full md:w-auto min-w-[320px]">
          <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 backdrop-blur-md">
            <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Bot className="w-4 h-4" /> Analisis & Pencocokan AI
            </h3>
            <MatchTrigger />
          </div>
        </div>
      </header>

      {/* Upload area — compact top strip */}
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
        <DocumentUploader />
      </div>

      {/* Full-width spreadsheet */}
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
        <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-400" />
          Dokumen Tersimpan
          <span className="ml-2 text-xs text-slate-500 font-normal">({documents.length} dokumen)</span>
        </h2>
        <DocumentList initialDocuments={documents} />
      </div>
    </div>
  )
}
