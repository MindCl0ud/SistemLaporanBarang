"use client"

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Box, Lock } from 'lucide-react'

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
      <Card className="w-full max-w-md border-none shadow-2xl shadow-slate-200 dark:shadow-none">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
            <Box className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-black tracking-tight">SIPINJAM</CardTitle>
            <CardDescription className="font-medium text-slate-500">
              Sistem Manajemen Aset & Persediaan
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nip" className="font-bold text-slate-700">NIP</Label>
              <div className="relative">
                <Input 
                  id="nip" 
                  placeholder="Masukkan NIP" 
                  className="rounded-xl border-slate-200 bg-slate-50/50 py-6"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-bold text-slate-700">Kata Sandi</Label>
              <div className="relative">
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  className="rounded-xl border-slate-200 bg-slate-50/50 py-6"
                />
              </div>
            </div>
            <Button className="w-full rounded-xl py-6 text-lg font-bold shadow-xl shadow-primary/20 transition-transform active:scale-95">
              Masuk
            </Button>
            <p className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 pt-4">
              Pemerintah Kota / Kabupaten
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
