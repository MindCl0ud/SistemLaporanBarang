'use client'

import { useState } from 'react'
import { FileText, List, TableProperties } from 'lucide-react'
import DocumentList from './DocumentList'
import DocumentItemsReport from './DocumentItemsReport'

export default function DocumentViewContainer({ initialDocuments }: { initialDocuments: any[] }) {
  const [activeTab, setActiveTab] = useState<'docs' | 'items'>('docs')

  return (
    <div className="space-y-6">
      {/* TABS (BKU Style) */}
      <div className="flex items-center gap-2 bg-input/40 p-1 rounded-2xl w-fit border border-border mt-4">
        <button
          onClick={() => setActiveTab('docs')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all ${activeTab === 'docs' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted hover:bg-accent'}`}
        >
          <List className="w-4 h-4" />
          Daftar Dokumen
        </button>
        <button
          onClick={() => setActiveTab('items')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all ${activeTab === 'items' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted hover:bg-accent'}`}
        >
          <TableProperties className="w-4 h-4" />
          Laporan Detail Item
        </button>
      </div>

      {activeTab === 'docs' ? (
        <div className="p-4 md:p-8 rounded-[2.5rem] bg-white dark:bg-card border border-border backdrop-blur-md shadow-2xl shadow-indigo-500/5 animate-in fade-in zoom-in-95 duration-300">
           <div className="flex items-center gap-3 mb-8">
             <div className="w-1.5 h-6 bg-primary rounded-full"></div>
             <h2 className="text-xl font-black text-foreground tracking-tight">Dokumen Tersimpan</h2>
             <span className="bg-primary/10 text-primary text-[10px] px-2 py-1 rounded-full border border-primary/20 uppercase font-black">Total: {initialDocuments.length}</span>
           </div>
           <DocumentList initialDocuments={initialDocuments} />
        </div>
      ) : (
        <div className="p-4 md:p-8 rounded-[2.5rem] bg-white dark:bg-card border border-border backdrop-blur-md shadow-2xl shadow-indigo-500/5 animate-in fade-in zoom-in-95 duration-300">
           <DocumentItemsReport documents={initialDocuments} />
        </div>
      )}
    </div>
  )
}
