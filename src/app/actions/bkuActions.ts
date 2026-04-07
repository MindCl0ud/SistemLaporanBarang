'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getBkuRecords(month: number, year: number) {
  return await prisma.bkuTransaction.findMany({
    where: { month, year },
    orderBy: [
      { rowOrder: 'asc' }
    ],
    include: { matchRecord: true }
  })
}

export async function getYearlyBkuRecords(year: number) {
  return await prisma.bkuTransaction.findMany({
    where: { year },
    orderBy: { rowOrder: 'asc' }
  })
}

export async function getBkuComparison(month: number, year: number) {
  // Optimal DB-side aggregation for Opening Balance
  const aggPast = await prisma.bkuTransaction.aggregate({
    where: {
      OR: [
        { year: { lt: year } },
        { AND: [{ year: year }, { month: { lt: month } }] }
      ]
    },
    _sum: {
      expenseTotal: true,
      receiptTotal: true
    }
  })
  
  const openingBalance = (aggPast._sum.receiptTotal || 0) - (aggPast._sum.expenseTotal || 0)

  const currentAgg = await prisma.bkuTransaction.aggregate({
    where: { month, year },
    _sum: { expenseTotal: true, receiptTotal: true }
  })
  const currentExpense = currentAgg._sum.expenseTotal || 0
  const currentReceipt = currentAgg._sum.receiptTotal || 0
  const currentNet = currentReceipt - currentExpense
  
  let prevMonth = month - 1
  let prevYear = year
  if (prevMonth < 1) {
    prevMonth = 12
    prevYear = year - 1
  }
  
  const prevAgg = await prisma.bkuTransaction.aggregate({
    where: { month: prevMonth, year: prevYear },
    _sum: { expenseTotal: true, receiptTotal: true }
  })
  const prevExpense = prevAgg._sum.expenseTotal || 0
  const prevReceipt = prevAgg._sum.receiptTotal || 0

  const aggPrevPast = await prisma.bkuTransaction.aggregate({
    where: {
      OR: [
        { year: { lt: prevYear } },
        { AND: [{ year: prevYear }, { month: { lt: prevMonth } }] }
      ]
    },
    _sum: {
      expenseTotal: true,
      receiptTotal: true
    }
  })
  const prevOpeningBalance = (aggPrevPast._sum.receiptTotal || 0) - (aggPrevPast._sum.expenseTotal || 0)

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

  // Get current max rowOrder for this month/year to append at the end
  const lastRecord = await prisma.bkuTransaction.findFirst({
    where: { month, year },
    orderBy: { rowOrder: 'desc' },
    select: { rowOrder: true }
  })
  const nextOrder = (lastRecord?.rowOrder ?? -1) + 1

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
      rowOrder: nextOrder,
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
  const rows = data.map((item: any, idx: number) => ({
    date:         item.date        ? String(item.date)                  : null,
    month:        Number(item.month  || month),
    year:         Number(item.year   || year),
    code:         item.code        ? String(item.code).trim()           : null,
    description:  item.description ? String(item.description).trim()   : "Tanpa Deskripsi",
    expenseTotal: Number(item.expenseTotal || 0) || 0,
    balance:      Number(item.balance      || 0) || 0,
    rowOrder:     item.rowOrder !== undefined ? Number(item.rowOrder) : idx,
  }))

  const result = await prisma.bkuTransaction.createMany({ data: rows })

  revalidatePath('/bku')
  revalidatePath('/')
  return result.count
}

// --- ACCOUNT MAPPING ACTIONS ---

export async function getAccountMappings(year: number = 2026) {
  const mappings = await prisma.accountCodeMapping.findMany({
    where: { year },
    orderBy: [
      { kodeSubKeg: 'asc' },
      { kodeBelanja: 'asc' }
    ],
    include: { budgetLogs: { orderBy: { createdAt: 'desc' } } }
  })

  // Get all BKU transactions for this year to calculate realization
  const bkuTransactions = await prisma.bkuTransaction.findMany({
    where: { year },
    select: {
      code: true,
      expenseTotal: true,
      receiptTotal: true
    }
  })

  // Aggregate realization in memory for performance (assuming reasonable dataset sizes)
  return mappings.map(m => {
    const kSub = (m.kodeSubKeg || "").trim()
    const kBel = (m.kodeBelanja || "").trim()
    const combined = kSub && kBel ? `${kSub}.${kBel}` : kBel
    
    const realization = bkuTransactions.reduce((sum, t) => {
      if (!t.code) return sum
      const tCode = t.code.trim()
      
      // Match 1: Full concatenation (Full 13 segments)
      const isFullMatch = tCode === combined
      
      // Match 2: BKU only has the account code (6 segments), or ends with it
      // This catches cases where Sub-Keg is omitted in BKU record, or formatting differs.
      const isSuffixMatch = tCode.endsWith(kBel) && kBel.split('.').length >= 6
      const isBaseMatch = tCode === kBel

      if (isFullMatch || isSuffixMatch || isBaseMatch) {
         // Realization sums BOTH receipts and expenses for SP2D-style execution
         return sum + (t.expenseTotal || 0) + (t.receiptTotal || 0)
      }
      return sum
    }, 0)

    return {
      ...m,
      realization
    }
  })
}

export async function upsertAccountMapping(
  kodeBelanja: string, 
  name: string, 
  division?: string, 
  budget?: number, 
  kodeSubKeg?: string, 
  year: number = 2026, 
  revisedBudget?: number,
  hierarchy?: {
    kodeProgram?: string;
    namaProgram?: string;
    kodeKegiatan?: string;
    namaKegiatan?: string;
    namaSubKeg?: string;
  }
) {
  // Find existing to check budget change
  const existing = await prisma.accountCodeMapping.findUnique({
    where: { 
      kodeSubKeg_kodeBelanja_year: { 
        kodeSubKeg: kodeSubKeg || "", 
        kodeBelanja, 
        year 
      } 
    }
  })

  const newBudget = budget !== undefined ? budget : (existing?.budget || 0)
  const newRevisedBudget = revisedBudget !== undefined ? revisedBudget : (existing?.revisedBudget || 0)
  
  const result = await prisma.accountCodeMapping.upsert({
    where: { 
      kodeSubKeg_kodeBelanja_year: { 
        kodeSubKeg: kodeSubKeg || "", 
        kodeBelanja, 
        year 
      } 
    },
    update: { 
      name, 
      division, 
      budget: newBudget, 
      revisedBudget: newRevisedBudget,
      kodeSubKeg: kodeSubKeg || "",
      ...hierarchy
    },
    create: { 
      kodeBelanja, 
      name, 
      division, 
      budget: newBudget, 
      revisedBudget: newRevisedBudget,
      kodeSubKeg: kodeSubKeg || "",
      year,
      ...hierarchy
    }
  })

  // Log budget changes if applicable
  if (existing) {
    if (existing.budget !== newBudget) {
      await prisma.budgetLog.create({
        data: {
          mappingId: existing.id,
          field: "budget",
          oldBudget: existing.budget || 0,
          newBudget: newBudget,
          reason: "Update manual Pagu Awal"
        }
      })
    }
    if (existing.revisedBudget !== newRevisedBudget) {
      await prisma.budgetLog.create({
        data: {
          mappingId: existing.id,
          field: "revisedBudget",
          oldBudget: existing.revisedBudget || 0,
          newBudget: newRevisedBudget,
          reason: "Update manual Pagu Perubahan"
        }
      })
    }
  } else {
    if (newBudget !== 0) {
      await prisma.budgetLog.create({
        data: {
          mappingId: result.id,
          field: "budget",
          oldBudget: 0,
          newBudget: newBudget,
          reason: "Pagu Awal pertama kali"
        }
      })
    }
    if (newRevisedBudget !== 0) {
      await prisma.budgetLog.create({
        data: {
          mappingId: result.id,
          field: "revisedBudget",
          oldBudget: 0,
          newBudget: newRevisedBudget,
          reason: "Pagu Perubahan pertama kali"
        }
      })
    }
  }

  revalidatePath('/bku')
  revalidatePath('/settings/accounts')
  
  return await prisma.accountCodeMapping.findUnique({
    where: { id: result.id },
    include: { budgetLogs: { orderBy: { createdAt: 'desc' } } }
  })
}

export async function upsertAccountMappingBulk(data: any[], year: number = 2026) {
  let count = 0
  for (const item of data) {
    const { 
      kodeBelanja, 
      code, // fallback
      name, 
      division, 
      budget, 
      kodeSubKeg, 
      subKegiatan, // fallback
      revisedBudget,
      kodeProgram,
      namaProgram,
      kodeKegiatan,
      namaKegiatan,
      namaSubKeg
    } = item
    
    const finalKodeBelanja = kodeBelanja || code
    const finalKodeSubKeg = kodeSubKeg || subKegiatan
    
    if (!finalKodeBelanja || !name) continue

    await upsertAccountMapping(
      finalKodeBelanja, 
      name, 
      division, 
      budget, 
      finalKodeSubKeg, 
      year, 
      revisedBudget,
      {
        kodeProgram,
        namaProgram,
        kodeKegiatan,
        namaKegiatan,
        namaSubKeg
      }
    )
    count++
  }
  revalidatePath('/bku')
  revalidatePath('/settings/accounts')
  return { count }
}

export async function deleteAccountMapping(id: string) {
  await prisma.accountCodeMapping.delete({ where: { id } })
  revalidatePath('/bku')
  revalidatePath('/settings/accounts')
}

export async function syncAccountCodesFromBku(year: number = 2026) {
  const transactions = await prisma.bkuTransaction.findMany({
    select: {
      code: true,
      description: true
    },
    where: {
      year, // Only sync from target year
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

  const existing = await prisma.accountCodeMapping.findMany({
    where: { year },
    select: { kodeBelanja: true }
  })
  const existingCodes = new Set(existing.map((e: any) => e.kodeBelanja))
  let count = 0
  for (let [code, name] of uniqueMap.entries()) {
    let kodeSubKeg: string = ""
    
    // Auto-split if it looks like a combined code
    const parts = code.split('.')
    if (parts.length >= 7 && (code.startsWith('5.') || code.startsWith('5.01'))) {
      kodeSubKeg = parts.slice(0, 6).join('.')
      code = parts.slice(6).join('.')
    } else if (parts.length === 6) {
      // It's already just a kodeBelanja
      kodeSubKeg = ""
    }

    const exists = await prisma.accountCodeMapping.findUnique({
      where: { 
        kodeSubKeg_kodeBelanja_year: { 
          kodeSubKeg, 
          kodeBelanja: code, 
          year 
        } 
      }
    })

    if (!exists) {
      await prisma.accountCodeMapping.create({
        data: { kodeBelanja: code, name, budget: 0, kodeSubKeg, year }
      })
      count++
    }
  }

  revalidatePath('/settings/accounts')
  return { count }
}
