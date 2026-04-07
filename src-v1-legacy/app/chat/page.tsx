'use client'

import { useState, useEffect, useRef } from "react"
import { MessageSquare, Send, Bot, User, Loader2, Sparkles, AlertTriangle, PieChart, FileText, LayoutDashboard } from "lucide-react"
import { processLocalQuery } from "@/app/actions/chatActions"

export default function ChatPage() {
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([
    {
      role: 'ai',
      content: 'Halo! Saya asisten data Anda. Saya bisa menjawab pertanyaan seputar nota, BKU, vendor, dan sisa anggaran secara instan dari database lokal.'
    }
  ])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  const handleSend = async (val?: string) => {
    const text = val || input.trim()
    if (!text) return

    setInput("")
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)

    try {
      const reply = await processLocalQuery(text)
      setMessages(prev => [...prev, { role: 'ai', content: reply }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Maaf, terjadi gangguan pada mesin data.' }])
    } finally {
      setLoading(false)
    }
  }

  const quickReplies = [
    { label: "Berapa total nota?", icon: <FileText className="w-3 h-3" />, query: "Berapa jumlah nota?" },
    { label: "Cek sisa anggaran", icon: <PieChart className="w-3 h-3" />, query: "Berapa sisa pagu anggaran?" },
    { label: "Transaksi tanpa nota", icon: <AlertTriangle className="w-3 h-3" />, query: "Cek transaksi tanpa bukti" },
    { label: "Siapa vendor terbanyak?", icon: <LayoutDashboard className="w-3 h-3" />, query: "Siapa vendor paling sering?" },
  ]

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-6rem)] flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-700">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-primary border border-primary/20">
             <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
              Asisten Data Cerdas
              <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
            </h1>
            <p className="text-[10px] text-muted uppercase font-black tracking-widest">REAL-TIME DATA-DRIVEN ASSISTANT</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/5 border border-emerald-500/20 rounded-full">
           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
           <span className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">Database Connected</span>
        </div>
      </header>

      <div className="flex-1 bg-card border border-border rounded-[2rem] overflow-hidden flex flex-col shadow-2xl shadow-indigo-500/5 relative group">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"></div>
        
        {/* Chat History */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar scroll-smooth">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-4 animate-in fade-in slide-in-from-bottom-1 duration-300 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg shrink-0 ${
                msg.role === 'user' ? 'bg-primary text-white' : 'bg-accent/50 text-primary border border-primary/10'
              }`}>
                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              <div className={`px-5 py-3 rounded-2xl max-w-[80%] text-sm leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-primary text-white rounded-tr-none font-medium' 
                  : 'bg-accent/30 text-foreground border border-border rounded-tl-none font-bold'
              }`}>
                {msg.content.split('\n').map((line, lid) => (
                   <p key={lid} className={lid > 0 ? 'mt-2' : ''}>
                     {line.startsWith('- ') ? <span className="block ml-2">{line}</span> : line.split('**').map((part, pidx) => (
                        pidx % 2 === 1 ? <strong key={pidx} className="text-primary-foreground underline decoration-primary/30">{part}</strong> : part
                     ))}
                   </p>
                ))}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-4 animate-pulse">
              <div className="w-10 h-10 rounded-2xl bg-accent/50 flex items-center justify-center text-primary border border-primary/10">
                <Bot className="w-5 h-5" />
              </div>
              <div className="px-5 py-3 rounded-2xl bg-accent/20 text-muted-foreground border border-border rounded-tl-none flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-[10px] uppercase font-black tracking-widest">Sedang Menganalisis Database...</span>
              </div>
            </div>
          )}
        </div>

        {/* QUICK REPLIES */}
        <div className="px-6 py-2 flex flex-wrap gap-2">
            {quickReplies.map((reply, idx) => (
               <button 
                 key={idx}
                 onClick={() => handleSend(reply.query)}
                 className="flex items-center gap-2 px-3 py-1.5 bg-accent/20 hover:bg-primary hover:text-white border border-border rounded-full text-[10px] font-black uppercase tracking-tight transition-all active:scale-95 shadow-sm"
               >
                  {reply.icon}
                  {reply.label}
               </button>
            ))}
        </div>

        {/* Input Area */}
        <div className="p-6 bg-accent/10 border-t border-border">
          <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="relative flex items-center">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tanyakan angka nyata dalam database..." 
              className="w-full bg-card border border-border rounded-2xl pl-6 pr-16 py-5 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-inner"
            />
            <button 
              type="submit" 
              disabled={loading || !input.trim()}
              className="absolute right-2.5 p-3.5 bg-primary hover:bg-primary/90 disabled:opacity-30 text-white rounded-xl shadow-lg transition-all active:scale-95"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          <p className="text-center text-[9px] text-muted-foreground mt-3 font-black uppercase tracking-widest">100% On-Device - No Cloud Access - No Server Tracking</p>
        </div>
      </div>
    </div>
  )
}
