import React from 'react'
import { prisma } from '@/lib/prisma'
import { Plus, Package, Car, Monitor, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

export default async function ItemsPage() {
  const items = await prisma.item.findMany({
    include: { bidang: true },
    orderBy: { createdAt: 'desc' }
  })

  const atkItems = items.filter(i => i.tipe === 'HABIS_PAKAI')
  const assetItems = items.filter(i => i.tipe === 'ASET_TETAP')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Master Barang</h1>
          <p className="text-xs font-medium text-slate-500">Kelola katalog ATK dan Aset Tetap.</p>
        </div>
        <Button className="rounded-xl font-bold md:flex hidden">
          <Plus className="mr-2 h-4 w-4" /> Tambah Barang
        </Button>
        <Button size="icon" className="md:hidden rounded-xl">
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input 
          placeholder="Cari nama barang atau kode..." 
          className="rounded-xl border-none bg-white pl-10 shadow-sm"
        />
      </div>

      <Tabs defaultValue="atk" className="w-full">
        <TabsList className="grid w-full grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
          <TabsTrigger value="atk" className="rounded-lg font-bold">ATK / Habis Pakai</TabsTrigger>
          <TabsTrigger value="asset" className="rounded-lg font-bold">Aset / Fasilitas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="atk" className="mt-6 space-y-4">
          {atkItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-400">
              <Package className="h-10 w-10 opacity-20" />
              <p className="text-sm font-medium">Belum ada data ATK.</p>
            </div>
          ) : (
            atkItems.map(item => (
              <ItemCard key={item.id} item={item} />
            ))
          )}
        </TabsContent>
        
        <TabsContent value="asset" className="mt-6 space-y-4">
           {assetItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-400">
              <Monitor className="h-10 w-10 opacity-20" />
              <p className="text-sm font-medium">Belum ada data Aset.</p>
            </div>
          ) : (
            assetItems.map(item => (
              <ItemCard key={item.id} item={item} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ItemCard({ item }: { item: any }) {
  const isAtk = item.tipe === 'HABIS_PAKAI'
  const isLowStock = isAtk && item.currentStok <= item.stokMinimal

  return (
    <div className="flex items-center gap-4 rounded-3xl border border-transparent bg-white p-4 shadow-sm transition-all active:scale-[0.98] dark:bg-slate-900 overflow-hidden">
      <div className={cn(
        "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ring-1 ring-slate-100 dark:ring-slate-800",
        isAtk ? "bg-slate-50 text-slate-600" : "bg-primary/5 text-primary"
      )}>
        {isAtk ? <Package className="h-7 w-7" /> : (item.licensePlate ? <Car className="h-7 w-7" /> : <Monitor className="h-7 w-7" />)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-black text-slate-800 dark:text-slate-100 truncate">{item.nama}</p>
          {isLowStock && (
            <Badge variant="destructive" className="h-4 px-1.5 text-[8px] font-black uppercase tracking-tighter">Low</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {item.kodeBarang || 'Tanpa Kode'}
          </span>
          <span className="text-[10px] font-bold text-slate-300">•</span>
          <span className="text-[10px] font-bold text-slate-400">
            {item.bidang?.nama || 'Gudang Utama'}
          </span>
        </div>
      </div>
      <div className="text-right shrink-0">
        {isAtk ? (
          <div className="space-y-0.5">
            <p className="text-sm font-black text-slate-900 dark:text-white">{item.currentStok}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase">{item.satuan}</p>
          </div>
        ) : (
          <Badge variant={item.isAvailable ? "outline" : "secondary"} className={cn(
            "rounded-lg text-[9px] font-black uppercase tracking-tight",
            item.isAvailable ? "border-emerald-500 text-emerald-600" : "bg-slate-100 text-slate-400"
          )}>
            {item.isAvailable ? 'Tersedia' : 'Terpakai'}
          </Badge>
        )}
      </div>
    </div>
  )
}

import { cn } from '@/lib/utils'
