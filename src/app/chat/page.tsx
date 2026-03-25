'use client'

import { useState } from "react"
import { MessageSquare, Send, Bot, User, Loader2 } from "lucide-react"

export default function ChatPage() {
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([
    {
      role: 'ai',
      content: 'Halo! Saya asisten AI DocuMatch. Anda bisa bertanya tentang ringkasan BKU, dokumen yang belum dicocokkan, atau pengeluaran bulan ini.'
    }
  ])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMsg = input.trim()
    setInput("")
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      // Basic heuristic responses for the Native App Demo without calling 3rd party APIs
      // In a real scenario, this would POST to /api/chat which uses Transformers.js or Ollama
      await new Promise(res => setTimeout(res, 1000))

      let reply = "Maaf, saya tidak mengerti. Coba tanyakan: 'Berapa total pengeluaran yang belum ada notanya?'"
      const lowered = userMsg.toLowerCase()

      if (lowered.includes('belum ada') || lowered.includes('tidak ada nota') || lowered.includes('tanpa bukti')) {
        reply = "Berdasarkan data BKU terakhir, terdapat 18 transaksi pengeluaran yang belum memiliki pasangan Dokumen/Nota. Anda bisa meninjaunya di menu BKU Bulanan."
      } else if (lowered.includes('total pengeluaran') || lowered.includes('bku')) {
        reply = "Untuk bulan ini, total pengeluaran yang tercatat di BKU adalah sekitar Rp 14.500.000, dengan Rp 12.000.000 sudah tervalidasi dengan nota."
      } else if (lowered.includes('terima kasih') || lowered.includes('makasih')) {
        reply = "Sama-sama! Ada lagi yang bisa saya bantu?"
      }

      setMessages(prev => [...prev, { role: 'ai', content: reply }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Terjadi kesalahan sistem.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-6rem)] flex flex-col animate-in fade-in duration-700">
      <header className="mb-6 flex items-center gap-3">
        <MessageSquare className="w-8 h-8 text-indigo-400" />
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
            Asisten AI
          </h1>
          <p className="text-sm text-slate-400">Tanya jawab (Native RAG) seputar data Laporan Barang</p>
        </div>
      </header>

      <div className="flex-1 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md flex flex-col overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none"></div>
        
        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'bg-indigo-500' : 'bg-slate-800 border border-white/10'
              }`}>
                {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-indigo-400" />}
              </div>
              <div className={`px-5 py-3 rounded-2xl max-w-[80%] text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-indigo-500 text-white rounded-tr-none shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
                  : 'bg-white/10 text-slate-200 border border-white/5 rounded-tl-none'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="px-5 py-3 rounded-2xl bg-white/10 text-slate-200 border border-white/5 rounded-tl-none flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                <span>Mengetik...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-black/20 border-t border-white/5">
          <form onSubmit={handleSend} className="relative flex items-center">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tanyakan sesuatu tentang data bulan ini..." 
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-5 pr-14 py-4 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button 
              type="submit" 
              disabled={loading || !input.trim()}
              className="absolute right-2 p-2.5 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white rounded-xl transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
