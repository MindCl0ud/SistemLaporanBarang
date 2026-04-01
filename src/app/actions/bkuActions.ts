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

export async function getYearlyBkuRecords(year: number) {
  return await prisma.bkuTransaction.findMany({
    where: { year },
    orderBy: { createdAt: 'desc' }
  })
}

export async function getBkuComparison(month: number, year: number) {
  const allPastRecords = await prisma.bkuTransaction.findMany({
    where: {
      OR: [
        { year: { lt: year } },
        { AND: [{ year: year }, { month: { lt: month } }] }
      ]
    }
  })
  
  const openingBalance = allPastRecords.reduce((sum, r) => sum + (r.receiptTotal || 0) - (r.expenseTotal || 0), 0)

  const currentRecords = await prisma.bkuTransaction.findMany({ where: { month, year } })
  const currentExpense = currentRecords.reduce((sum, r) => sum + (r.expenseTotal || 0), 0)
  const currentReceipt = currentRecords.reduce((sum, r) => sum + (r.receiptTotal || 0), 0)
  const currentNet = currentReceipt - currentExpense
  
  let prevMonth = month - 1
  let prevYear = year
  if (prevMonth < 1) {
    prevMonth = 12
    prevYear = year - 1
  }
  
  const prevRecords = await prisma.bkuTransaction.findMany({ where: { month: prevMonth, year: prevYear } })
  const prevExpense = prevRecords.reduce((sum, r) => sum + (r.expenseTotal || 0), 0)
  const prevReceipt = prevRecords.reduce((sum, r) => sum + (r.receiptTotal || 0), 0)

  const allPastRecordsBeforePrev = await prisma.bkuTransaction.findMany({
    where: {
      OR: [
        { year: { lt: prevYear } },
        { AND: [{ year: prevYear }, { month: { lt: prevMonth } }] }
      ]
    }
  })
  const prevOpeningBalance = allPastRecordsBeforePrev.reduce((sum, r) => sum + (r.receiptTotal || 0) - (r.expenseTotal || 0), 0)

  const yearlyAgg = await prisma.bkuTransaction.aggregate({
    where: { year },
    _sum: { expenseTotal: true, receiptTotal: true }
  })

  return { 
    currentExpense, 
    currentReceipt, 
    currentBalance: currentNet,
    openingBalance,
    closingBalance: openingBalance + currentNet,
    prevExpense, 
    prevReceipt,
    prevOpeningBalance,
    prevBalance: prevReceipt - prevExpense,
    prevClosingBalance: prevOpeningBalance + (prevReceipt - prevExpense),
    yearlyExpense: yearlyAgg._sum.expenseTotal || 0,
    yearlyReceipt: yearlyAgg._sum.receiptTotal || 0
  }
}

export async function addBkuRecord(data: FormData) {
  const dateStr = data.get('date') as string | null
  let month = Number(data.get('month'))
  let year = Number(data.get('year'))
  
  if (dateStr && (dateStr.includes('-') || dateStr.includes('/'))) {
    const separator = dateStr.includes('-') ? '-' : '/'
    const parts = dateStr.split(separator)
    if (parts.length === 3) {
      const parsedMonth = parseInt(parts[1], 10)
      const parsedYear = parseInt(parts[2], 10)
      if (!isNaN(parsedMonth)) month = parsedMonth
      if (!isNaN(parsedYear)) year = parsedYear
    }
  }

  const code = data.get('code') as string
  const description = data.get('description') as string
  const receiptTotal = Number(data.get('receiptTotal')) || 0
  const expenseTotal = Number(data.get('expenseTotal')) || 0
  const balance = Number(data.get('balance')) || 0

  await prisma.bkuTransaction.create({
    data: {
      date: dateStr,
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
  revalidatePath('/')
}

export async function deleteBkuRecord(id: string) {
  await prisma.bkuTransaction.delete({ where: { id } })
  revalidatePath('/bku')
  revalidatePath('/')
}

export async function addBkuBulk(data: any[], month: number, year: number) {
  // Tidak ada pengecekan duplikat sama sekali.
  // Komponen gaji (Gaji Pokok, Tunjangan Keluarga, Iuran Askes, JKK, dst)
  // menggunakan kode rekening yang SAMA di Gaji Reguler, Gaji 13, dan THR,
  // sehingga semua baris harus masuk apa adanya tanpa diblokir.
  const rows = data.map((item: any) => ({
    date:         item.date        ? String(item.date)                  : null,
    month:        Number(item.month  || month),
    year:         Number(item.year   || year),
    code:         item.code        ? String(item.code).trim()           : null,
    description:  item.description ? String(item.description).trim()   : "Tanpa Deskripsi",
    receiptTotal: Number(item.receiptTotal || 0) || 0,
    expenseTotal: Number(item.expenseTotal || 0) || 0,
    balance:      Number(item.balance      || 0) || 0,
  }))

  const result = await prisma.bkuTransaction.createMany({ data: rows })

  revalidatePath('/bku')
  revalidatePath('/')
  return result.count
}

// --- ACCOUNT MAPPING ACTIONS ---

export async function getAccountMappings() {
  return await (prisma as any).accountCodeMapping.findMany({
    orderBy: { code: 'asc' }
  })
}

export async function upsertAccountMapping(code: string, name: string) {
  const result = await (prisma as any).accountCodeMapping.upsert({
    where: { code },
    update: { name },
    create: { code, name }
  })
  revalidatePath('/bku')
  revalidatePath('/settings/accounts')
  return result
}

export async function deleteAccountMapping(id: string) {
  await prisma.accountCodeMapping.delete({ where: { id } })
  revalidatePath('/bku')
  revalidatePath('/settings/accounts')
}

export async function syncAccountCodesFromBku() {
  const transactions = await prisma.bkuTransaction.findMany({
    select: {
      code: true,
      description: true
    },
    where: {
      AND: [
        { code: { not: null } },
        { code: { not: "" } }
      ]
    }
  })

  // Group by code and pick first description as default name
  const uniqueMap = new Map<string, string>()
  transactions.forEach((t: { code: string | null; description: string }) => {
    if (t.code && !uniqueMap.has(t.code)) {
      // Extract a decent name from description (before second segment or first part)
      const name = t.description.split(' - ')[0].trim() || t.description
      uniqueMap.set(t.code, name)
    }
  })

  const existing = await (prisma as any).accountCodeMapping.findMany({
    select: { code: true }
  })
  const existingCodes = new Set(existing.map((e: any) => e.code))

  let count = 0
  for (const [code, name] of uniqueMap.entries()) {
    if (!existingCodes.has(code)) {
      await (prisma as any).accountCodeMapping.create({
        data: { code, name }
      })
      count++
    }
  }

  revalidatePath('/settings/accounts')
  return { count }
}
