import { Settings, Database, BrainCircuit, ShieldCheck } from 'lucide-react'

export const metadata = {
  title: 'Pengaturan - DocuMatch AI',
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-black/20 p-6 rounded-2xl border border-white/5 backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Settings className="text-slate-400" />
            Pengaturan Sistem
          </h1>
          <p className="text-slate-400 text-sm mt-1">Konfigurasi Database dan Mesin Pembaca AI (Fitur Segera Datang)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model AI Config */}
        <div className="bg-black/20 p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BrainCircuit className="w-6 h-6 text-indigo-400" />
              <h2 className="text-lg font-medium text-white">Mesin Utama AI</h2>
            </div>
            <span className="px-2 py-1 bg-indigo-500/20 text-indigo-300 text-xs rounded border border-indigo-500/30">Aktif</span>
          </div>
          
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 rounded-xl border border-indigo-500/30 bg-indigo-500/5 cursor-pointer">
              <input type="radio" name="ai_model" defaultChecked className="mt-1" />
              <div>
                <p className="text-sm font-medium text-white">Opsi 1: Native Local (Browser & Node.js)</p>
                <p className="text-xs text-slate-400 mt-1">Menggunakan Tesseract (Gambar) dan pdf2json (PDF). Cocok untuk penggunaan gratis 100% offline & privasi tinggi.</p>
              </div>
            </label>
            
            <label className="flex items-start gap-3 p-3 rounded-xl border border-white/10 bg-white/5 opacity-50 cursor-not-allowed">
              <input type="radio" name="ai_model" disabled className="mt-1" />
              <div>
                <p className="text-sm font-medium text-white text-opacity-80">Opsi 2: OpenAI API (Vision)</p>
                <p className="text-xs text-slate-400 mt-1">Analisa nota ultra-pintar dari gambar buram. (Masih Terkunci: Butuh API Key khusus)</p>
              </div>
            </label>
          </div>
        </div>

        {/* Database Config */}
        <div className="bg-black/20 p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6 text-emerald-400" />
            <h2 className="text-lg font-medium text-white">Status Database</h2>
          </div>
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-200">Supabase PostgreSQL</p>
              <p className="text-xs text-emerald-400/80">Terhubung Cepat (Prisma ORM)</p>
            </div>
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
        </div>
      </div>
    </div>
  )
}
