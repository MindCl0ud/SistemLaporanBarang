'use client'

import { useState } from 'react'
import { Bot, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { runMatchingEngine } from '@/app/actions/matchActions'

export default function MatchTrigger() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ count: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleMatch = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      // Get current month/year for matching (defaulting to current date if needed)
      const now = new Date()
      const count = await runMatchingEngine(now.getMonth() + 1, now.getFullYear())
      setResult({ count })
    } catch (err: any) {
      setError(err.message || 'Gagal menjalankan pemindaian kecocokan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={handleMatch}
        disabled={loading}
        className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-2xl text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all group"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Bot className="w-5 h-5 group-hover:scale-110 transition-transform" />
        )}
        {loading ? "Menganalisis Kecocokan BKU..." : "JALANKAN PENCOCOKAN AI"}
      </button>

      {result && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl animate-in zoom-in-95">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-200">
            Ditemukan {result.count} kecocokan baru untuk periode ini!
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl animate-in shake">
          <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400" />
          <p className="text-xs font-medium text-rose-700 dark:text-rose-200">{error}</p>
        </div>
      )}
    </div>
  )
}
