'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getBkuRecords(month: number, year: number) {
  return await prisma.bkuTransaction.findMany({
    where: { month, year },
    orderBy: { createdAt: 'desc' },
    include: { matchRecord: true }
  })
}

export async function addBkuRecord(data: FormData) {
  const month = Number(data.get('month'))
  const year = Number(data.get('year'))
  const code = data.get('code') as string
  const description = data.get('description') as string
  const receiptTotal = Number(data.get('receiptTotal')) || 0
  const expenseTotal = Number(data.get('expenseTotal')) || 0
  
  // Quick calculation for balance if needed, or user inputs
  const balance = Number(data.get('balance')) || 0

  await prisma.bkuTransaction.create({
    data: {
      month,
      year,
      code,
      description,
      receiptTotal,
      expenseTotal,
      balance,
    }
  })
  
  revalidatePath('/bku')
}

export async function deleteBkuRecord(id: string) {
  await prisma.bkuTransaction.delete({ where: { id } })
  revalidatePath('/bku')
}

export async function addBkuBulk(data: any[], month: number, year: number) {
  const records = data.map(item => ({
    month,
    year,
    code: String(item.Kode || item.code || item['Kode Rekening'] || ""),
    description: String(item.Uraian || item.description || item.Deskripsi || "Tanpa Deskripsi"),
    receiptTotal: Number(item.Penerimaan || item.receiptTotal || item.Terima || 0) || 0,
    expenseTotal: Number(item.Pengeluaran || item.expenseTotal || item.Keluar || 0) || 0,
    balance: Number(item.Saldo || item.balance || 0) || 0
  }))

  await prisma.bkuTransaction.createMany({
    data: records
  })

  revalidatePath('/bku')
  revalidatePath('/')
}
