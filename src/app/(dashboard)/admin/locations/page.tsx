import React from 'react'
import { prisma } from '@/lib/prisma'
import { Plus, MapPin, Users, Hash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default async function LocationsPage() {
  const bidangList = await prisma.bidang.findMany({
    include: {
      _count: {
        select: { users: true, items: true }
      }
    },
    orderBy: { nama: 'asc' }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Master Bidang</h1>
          <p className="text-xs font-medium text-slate-500">Daftar unit kerja dan lokasi aset.</p>
        </div>
        <Button className="rounded-xl font-bold">
          <Plus className="mr-2 h-4 w-4" /> Tambah Bidang
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {bidangList.map((bidang) => (
          <Card key={bidang.id} className="border-none shadow-sm dark:bg-slate-900 overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center justify-between p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{bidang.nama}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{bidang.kode || 'Tanpa Kode'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="text-center">
                    <p className="text-xs font-black text-slate-700 dark:text-slate-200">{bidang._count.users}</p>
                    <p className="text-[8px] font-bold uppercase text-slate-400">Pegawai</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-black text-slate-700 dark:text-slate-200">{bidang._count.items}</p>
                    <p className="text-[8px] font-bold uppercase text-slate-400">Aset</p>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 px-5 py-2 text-right dark:bg-slate-800/50">
                <button className="text-[10px] font-black uppercase tracking-widest text-primary">Edit Detail</button>
              </div>
            </CardContent>
          </Card>
        ))}

        {bidangList.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <MapPin className="mx-auto h-12 w-12 text-slate-200" />
            <p className="mt-2 text-sm font-medium text-slate-400">Belum ada data bidang kerja.</p>
          </div>
        )}
      </div>
    </div>
  )
}
