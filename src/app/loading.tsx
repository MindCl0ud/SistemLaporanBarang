import { Loader2 } from "lucide-react"

export default function GlobalLoading() {
  return (
    <div className="w-full min-h-[60vh] flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
       <div className="flex flex-col items-center gap-4">
         <div className="relative flex items-center justify-center">
           <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
           <div className="w-16 h-16 bg-card border border-border rounded-2xl flex items-center justify-center shadow-xl relative z-10 animate-in zoom-in-95 duration-500">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
           </div>
         </div>
         <div className="text-center">
            <h3 className="text-sm font-black text-foreground/80 tracking-tight">
              Memasuki Halaman...
            </h3>
            <p className="text-[9px] text-muted font-black tracking-[0.2em] uppercase mt-1">
              Sistem Laporan Terpadu
            </p>
         </div>
       </div>
    </div>
  )
}
