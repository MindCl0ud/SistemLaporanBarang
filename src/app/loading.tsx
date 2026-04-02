import { Loader2 } from "lucide-react"

export default function GlobalLoading() {
  return (
    <div className="w-full min-h-[80vh] flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
       <div className="flex flex-col items-center gap-6">
         <div className="relative flex items-center justify-center">
           <div className="absolute inset-0 bg-indigo-500/30 dark:bg-indigo-500/20 blur-2xl rounded-full animate-pulse"></div>
           <div className="w-20 h-20 bg-card border-2 border-indigo-500/50 rounded-2xl flex items-center justify-center shadow-2xl relative z-10 rotate-3 animate-in spin-in-12 duration-1000">
              <Loader2 className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-spin" />
           </div>
         </div>
         <div className="space-y-1.5 text-center mt-2">
            <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-300">
              Menyiapkan Halaman
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black tracking-widest uppercase">
              BARANG & ANGGARAN AI
            </p>
         </div>
       </div>
    </div>
  )
}
