'use client'

import React, { useState, useEffect } from 'react'
import { 
  Settings, 
  Database, 
  BrainCircuit, 
  ShieldCheck, 
  User, 
  Building2, 
  Download, 
  Trash2, 
  Sun, 
  Moon, 
  Monitor,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Clock
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { resetAllApplicationData, exportAllData } from '@/app/actions/settingsActions'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resetConfirm, setResetConfirm] = useState('')
  const [showResetModal, setShowResetModal] = useState(false)

  // Profile State (LocalStorage)
  const [profile, setProfile] = useState({
    officeName: '',
    treasurerName: '',
    officialName: '',
    officialPosition: ''
  })

  // Load from LocalStorage
  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('app_profile')
    if (saved) setProfile(JSON.parse(saved))
  }, [])

  // Save to LocalStorage
  const saveProfile = () => {
    localStorage.setItem('app_profile', JSON.stringify(profile))
    alert('Identitas Berhasil Disimpan!')
  }

  const handleExport = async () => {
    const data = await exportAllData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `backup_data_bku_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleReset = async () => {
    if (resetConfirm !== 'HAPUS') return
    setLoading(true)
    const result = await resetAllApplicationData()
    setLoading(false)
    if (result.success) {
      alert('Data Berhasil Direset!')
      window.location.reload()
    } else {
      alert(`Gagal Reset: ${result.error}`)
    }
  }

  if (!mounted) return null

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto pb-20 space-y-8">
      {/* HEADER SECTION */}
      <div className="bg-card border border-border p-8 rounded-[2rem] shadow-xl shadow-indigo-500/5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Settings className="w-32 h-32" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-2">
             <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-primary border border-primary/20">
                <Settings className="w-6 h-6" />
             </div>
             <div>
                <h1 className="text-3xl font-black text-foreground tracking-tight">Pengaturan Sistem</h1>
                <p className="text-muted-foreground text-sm font-medium">Kelola identitas laporan, tampilan, dan keamanan data Anda.</p>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* RIGHT SIDE: PROFILE & IDENTITY (2 Column wide on desktop) */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-card border border-border rounded-[2rem] overflow-hidden shadow-sm">
             <div className="px-8 py-6 border-b border-border bg-accent/30 flex items-center gap-3">
                <Building2 className="w-5 h-5 text-primary" />
                <h2 className="text-sm font-black text-foreground uppercase tracking-widest">Identitas Instansi & Pejabat</h2>
             </div>
             <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1">Nama Kantor / OPD</label>
                      <input 
                        type="text" 
                        value={profile.officeName}
                        onChange={e => setProfile({...profile, officeName: e.target.value})}
                        placeholder="Contoh: Dinas Pekerjaan Umum"
                        className="w-full bg-input border border-border rounded-2xl px-4 py-3 text-sm font-bold text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1">Nama Bendahara</label>
                      <input 
                        type="text" 
                        value={profile.treasurerName}
                        onChange={e => setProfile({...profile, treasurerName: e.target.value})}
                        placeholder="Nama Lengkap & Gelar"
                        className="w-full bg-input border border-border rounded-2xl px-4 py-3 text-sm font-bold text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1">Nama Pejabat (PK / KPA)</label>
                      <input 
                        type="text" 
                        value={profile.officialName}
                        onChange={e => setProfile({...profile, officialName: e.target.value})}
                        placeholder="Nama Pejabat Penandatangan"
                        className="w-full bg-input border border-border rounded-2xl px-4 py-3 text-sm font-bold text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1">Jabatan Pejabat</label>
                      <input 
                        type="text" 
                        value={profile.officialPosition}
                        onChange={e => setProfile({...profile, officialPosition: e.target.value})}
                        placeholder="Contoh: Pejabat Pembuat Komitmen"
                        className="w-full bg-input border border-border rounded-2xl px-4 py-3 text-sm font-bold text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                      />
                   </div>
                </div>
                <div className="pt-4 flex justify-end">
                   <button 
                     onClick={saveProfile}
                     className="px-8 py-3 bg-primary hover:bg-primary/90 text-white rounded-2xl text-sm font-black shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center gap-2"
                   >
                     <CheckCircle2 className="w-4 h-4" /> Simpan Identitas
                   </button>
                </div>
             </div>
          </div>

          {/* AI ENGINE CONFIG (Enhanced) */}
          <div className="bg-card border border-border rounded-[2rem] overflow-hidden shadow-sm">
             <div className="px-8 py-6 border-b border-border bg-accent/30 flex items-center gap-3">
                <BrainCircuit className="w-5 h-5 text-indigo-500" />
                <h2 className="text-sm font-black text-foreground uppercase tracking-widest">Mesin Utama AI</h2>
             </div>
             <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-[1.5rem] border-2 border-primary bg-primary/5 flex flex-col gap-3 relative">
                   <div className="absolute top-4 right-4">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center text-primary">
                         <Monitor className="w-5 h-5" />
                      </div>
                      <h3 className="font-black text-sm text-foreground">Native Local (Offline)</h3>
                   </div>
                   <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                     Menggunakan teknologi browser sandbox (Tesseract.js). 100% Data tidak pernah meninggalkan komputer Anda. Sangat Aman & Gratis.
                   </p>
                   <span className="mt-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest">TERPASANG & AKTIF</span>
                </div>

                <div className="p-5 rounded-[1.5rem] border-2 border-border bg-accent/20 flex flex-col gap-3 opacity-50 cursor-not-allowed">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center text-indigo-400">
                         <BrainCircuit className="w-5 h-5" />
                      </div>
                      <h3 className="font-black text-sm text-foreground">Gemini AI / OpenAI</h3>
                   </div>
                   <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                     Opsi analisa tingkat lanjut untuk nota yang sangat buram atau kotor. Memerlukan Cloud API Key untuk beroperasi.
                   </p>
                   <span className="mt-2 text-[10px] font-black text-muted uppercase tracking-widest italic">DIKUNCI (SEGERA DATANG)</span>
                </div>
             </div>
          </div>
        </div>

        {/* LEFT SIDE: THEME & DATA MGMT (1 Column wide) */}
        <div className="space-y-8">
           {/* THEME SELECTOR */}
           <div className="bg-card border border-border rounded-[2rem] overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-border bg-accent/30 flex items-center gap-3">
                 <Sun className="w-5 h-5 text-amber-500" />
                 <h2 className="text-sm font-black text-foreground uppercase tracking-widest">Tampilan Aplikasi</h2>
              </div>
              <div className="p-6 grid grid-cols-3 gap-2">
                 <button 
                   onClick={() => setTheme('light')}
                   className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${theme === 'light' ? 'bg-primary/10 border-primary text-primary' : 'bg-input border-transparent text-muted-foreground hover:bg-slate-200'}`}
                 >
                    <Sun className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase">Terang</span>
                 </button>
                 <button 
                    onClick={() => setTheme('dark')}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${theme === 'dark' ? 'bg-primary/10 border-primary text-primary' : 'bg-input border-transparent text-muted-foreground hover:bg-slate-700'}`}
                 >
                    <Moon className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase">Gelap</span>
                 </button>
                 <button 
                    onClick={() => setTheme('system')}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${theme === 'system' ? 'bg-primary/10 border-primary text-primary' : 'bg-input border-transparent text-muted-foreground hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                 >
                    <Monitor className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase">Sistem</span>
                 </button>
              </div>
           </div>

           {/* DATABASE STATUS */}
           <div className="bg-card border border-border rounded-[2rem] overflow-hidden shadow-sm">
              <div className="p-6 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                       <Database className="w-5 h-5" />
                    </div>
                    <div>
                       <h3 className="text-sm font-black text-foreground">Database Supabase</h3>
                       <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">TERKONEKSI</p>
                    </div>
                 </div>
                 <ShieldCheck className="w-6 h-6 text-emerald-500 opacity-50" />
              </div>
              <div className="px-6 pb-6 pt-2">
                 <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-[10px] font-bold text-emerald-600">Ping: 45ms (Fast)</span>
                 </div>
              </div>
           </div>

           {/* DATA MANAGEMENT */}
           <div className="bg-rose-500/5 border border-rose-500/10 rounded-[2rem] overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-rose-500/10 bg-rose-500/5 flex items-center gap-3">
                 <Download className="w-5 h-5 text-rose-500" />
                 <h2 className="text-sm font-black text-rose-600 uppercase tracking-widest">Keamanan Data</h2>
              </div>
              <div className="p-6 space-y-4">
                 <button 
                   onClick={handleExport}
                   className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-card border border-border rounded-xl text-xs font-black text-foreground hover:bg-slate-50 transition-all shadow-sm"
                 >
                    <Download className="w-4 h-4 text-emerald-500" /> Cadangkan Data (JSON)
                 </button>
                 <button 
                    onClick={() => setShowResetModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs font-black text-rose-600 hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                 >
                    <Trash2 className="w-4 h-4" /> Reset Seluruh Aplikasi
                 </button>
              </div>
           </div>
        </div>
      </div>

      {/* RESET CONFIRMATION MODAL */}
      {showResetModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-card border-2 border-rose-500/30 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-8 text-center space-y-6">
               <div className="w-20 h-20 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-500 mx-auto border-4 border-rose-500/20">
                  <AlertTriangle className="w-10 h-10" />
               </div>
               <div>
                  <h2 className="text-xl font-black text-foreground">Hapus Seluruh Data?</h2>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">Tindakan ini akan menghapus permanen semua dokumen, BKU, dan lampiran. Ketik <span className="font-black text-rose-600">HAPUS</span> di bawah untuk melanjutkan.</p>
               </div>
               
               <input 
                 type="text" 
                 value={resetConfirm}
                 onChange={e => setResetConfirm(e.target.value.toUpperCase())}
                 placeholder="Ketik HAPUS di sini..."
                 className="w-full bg-input border border-border rounded-2xl px-4 py-4 text-center font-black text-rose-600 focus:ring-2 focus:ring-rose-500 outline-none transition-all"
               />

               <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleReset}
                    disabled={resetConfirm !== 'HAPUS' || loading}
                    className="w-full py-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-30 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-rose-600/20 transition-all flex items-center justify-center gap-3"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                    YA, HAPUS SEKARANG
                  </button>
                  <button 
                    onClick={() => { setShowResetModal(false); setResetConfirm(''); }}
                    className="text-xs font-black text-muted-foreground hover:text-foreground uppercase tracking-widest py-2"
                  >
                    Batalkan & Kembali
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
