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

export async function getBkuComparison(month: number, year: number) {
  // Calculate Opening Balance (all records before this month/year)
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

  // Calculate Opening Balance for Previous Month
  const allPastRecordsBeforePrev = await prisma.bkuTransaction.findMany({
    where: {
      OR: [
        { year: { lt: prevYear } },
        { AND: [{ year: prevYear }, { month: { lt: prevMonth } }] }
      ]
    }
  })
  const prevOpeningBalance = allPastRecordsBeforePrev.reduce((sum, r) => sum + (r.receiptTotal || 0) - (r.expenseTotal || 0), 0)

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
    prevClosingBalance: prevOpeningBalance + (prevReceipt - prevExpense)
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
  let newRecords = 0;
  
  for (const item of data) {
    // Normalisasi kode: string kosong → null agar konsisten di DB
    const rawCode = item.code ? String(item.code).trim() : "";
    const code = rawCode || null;

    const description = String(item.description || "Tanpa Deskripsi").trim();
    const receiptTotal = Number(item.receiptTotal || 0) || 0;
    const expenseTotal = Number(item.expenseTotal || 0) || 0;
    const balance = Number(item.balance || 0) || 0;
    const date = item.date ? String(item.date) : null;
    const itemMonth = item.month || month;
    const itemYear = item.year || year;

    // Pengecekan duplikat yang benar:
    // Sertakan `code` agar baris dengan uraian sama tapi kode rekening
    // berbeda TIDAK dianggap duplikat (misal: "Gaji Pokok" dengan kode
    // 5.1.01.01.01.0001 berbeda dengan "Gaji Pokok" tanpa kode)
    const exists = await prisma.bkuTransaction.findFirst({
      where: {
        month: itemMonth,
        year: itemYear,
        code: code,
        description,
        receiptTotal,
        expenseTotal
      }
    });

    if (!exists) {
      await prisma.bkuTransaction.create({
        data: {
          date,
          month: itemMonth,
          year: itemYear,
          code: code ?? undefined,
          description,
          receiptTotal,
          expenseTotal,
          balance
        }
      });
      newRecords++;
    }
  }

  revalidatePath('/bku')
  revalidatePath('/')
  return newRecords;
}
