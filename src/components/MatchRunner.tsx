'use client'

import { useState } from 'react'
import { Webhook, Loader2, CheckCircle2 } from 'lucide-react'
import { runMatchingEngine } from '@/app/actions/matchActions'
import { useRouter } from 'next/navigation'

export default function MatchRunner() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<number | null>(null)
  const router = useRouter()

  const handleRun = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      const matchCount = await runMatchingEngine()
      setResult(matchCount)
      router.refresh()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button 
        onClick={handleRun}
        disabled={loading}
        className="w-full py-3 px-4 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-xl font-medium transition-colors shadow-[0_0_20px_rgba(99,102,241,0.2)] shrink-0 flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Webhook className="w-4 h-4" />}
        {loading ? "Menjalankan AI Engine..." : "Jalankan Pencocokan Otomatis"}
      </button>

      {result !== null && (
        <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium italic">Selesai! {result} dokumen baru tercocokkan dengan BKU.</p>
        </div>
      )}
    </div>
  )
}
