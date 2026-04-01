import { FileText, Bot } from "lucide-react"
export const dynamic = 'force-dynamic'
import DocumentUploader from "./DocumentUploader"
import DocumentViewContainer from "./DocumentViewContainer"
import MatchTrigger from "./MatchTrigger"
import { getDocuments } from "@/app/actions/documentActions"

export default async function DocumentsPage() {
  const documents = await getDocuments()

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-700">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex-1">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 flex items-center gap-3">
            <FileText className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
            Ekstraksi Dokumen AI
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm max-w-2xl font-medium tracking-tight">Unggah Nota Pesanan, Berita Acara, atau Kwitansi untuk dibaca secara otomatis oleh AI dan dicocokkan dengan Buku Kas Umum (BKU).</p>
        </div>
        <div className="w-full md:w-auto min-w-[320px]">
          <div className="p-5 rounded-2xl bg-card border border-border backdrop-blur-md shadow-sm">
            <h3 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Bot className="w-4 h-4" /> Analisis & Pencocokan AI
            </h3>
            <MatchTrigger />
          </div>
        </div>
      </header>

      {/* Upload area — compact top strip */}
      <div className="p-4 rounded-3xl bg-card border border-border backdrop-blur-md shadow-sm">
        <DocumentUploader />
      </div>

      <DocumentViewContainer initialDocuments={documents} />
    </div>
  )
}
