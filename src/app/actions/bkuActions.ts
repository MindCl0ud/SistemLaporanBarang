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

export async function getAccountMappings(year: number = 2026) {
  return await prisma.accountCodeMapping.findMany({
    where: { year },
    orderBy: { code: 'asc' },
    include: { budgetLogs: { orderBy: { createdAt: 'desc' } } }
  })
}

export async function upsertAccountMapping(code: string, name: string, division?: string, budget?: number, subKegiatan?: string, year: number = 2026, revisedBudget?: number) {
  // Find existing to check budget change
  const existing = await prisma.accountCodeMapping.findUnique({
    where: { code_year: { code, year } }
  })

  const newBudget = budget || (existing?.budget || 0)
  const newRevisedBudget = revisedBudget !== undefined ? revisedBudget : (existing?.revisedBudget || 0)
  
  const result = await prisma.accountCodeMapping.upsert({
    where: { code_year: { code, year } },
    update: { 
      name, 
      division, 
      budget: newBudget, 
      revisedBudget: newRevisedBudget,
      subKegiatan 
    },
    create: { 
      code, 
      name, 
      division, 
      budget: newBudget, 
      revisedBudget: newRevisedBudget,
      subKegiatan,
      year
    }
  })

  // Log budget changes if applicable
  if (existing) {
    // Check Original Budget
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
    // Check Revised Budget
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
    // Initial budget logs
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
  
  // Return the full updated object with logs
  return await prisma.accountCodeMapping.findUnique({
    where: { id: result.id },
    include: { budgetLogs: { orderBy: { createdAt: 'desc' } } }
  })
}

export async function upsertAccountMappingBulk(data: any[], year: number = 2026) {
  let count = 0
  for (const item of data) {
    const { code, name, division, budget, subKegiatan, revisedBudget } = item
    if (!code || !name) continue

    // Reuse existing individual upsert logic to ensure logging
    await upsertAccountMapping(code, name, division, budget, subKegiatan, year, revisedBudget)
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
    select: { code: true }
  })
  const existingCodes = new Set(existing.map((e: any) => e.code))
  let count = 0
  for (let [code, name] of uniqueMap.entries()) {
    let subKegiatan: string | undefined = undefined
    
    // Auto-split if it looks like a combined code
    const parts = code.split('.')
    if (parts.length >= 7 && (code.startsWith('5.') || code.startsWith('5.01'))) {
      subKegiatan = parts.slice(0, 6).join('.')
      code = parts.slice(6).join('.')
    }

    if (!existingCodes.has(code)) {
      await prisma.accountCodeMapping.create({
        data: { code, name, budget: 0, subKegiatan, year }
      })
      count++
    }
  }

  revalidatePath('/settings/accounts')
  return { count }
}
