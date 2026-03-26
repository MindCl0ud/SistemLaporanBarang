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
  const currentRecords = await prisma.bkuTransaction.findMany({ where: { month, year } })
  const currentExpense = currentRecords.reduce((sum, r) => sum + (r.expenseTotal || 0), 0)
  
  let prevMonth = month - 1
  let prevYear = year
  if (prevMonth < 1) {
    prevMonth = 12
    prevYear = year - 1
  }
  
  const prevRecords = await prisma.bkuTransaction.findMany({ where: { month: prevMonth, year: prevYear } })
  const prevExpense = prevRecords.reduce((sum, r) => sum + (r.expenseTotal || 0), 0)

  return { currentExpense, prevExpense }
}

export async function addBkuRecord(data: FormData) {
  const date = data.get('date') as string | null
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
      date,
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
  revalidatePath('/')
}

export async function addBkuBulk(data: any[], month: number, year: number) {
  let newRecords = 0;
  
  for (const item of data) {
    const code = String(item.code || "");
    const description = String(item.description || "Tanpa Deskripsi");
    const receiptTotal = Number(item.receiptTotal || 0) || 0;
    const expenseTotal = Number(item.expenseTotal || 0) || 0;
    const balance = Number(item.balance || 0) || 0;
    const date = item.date ? String(item.date) : null;
    const itemMonth = item.month || month;
    const itemYear = item.year || year;

    // Lakukan pencegahan pendobelan data
    const exists = await prisma.bkuTransaction.findFirst({
      where: {
        month: itemMonth,
        year: itemYear,
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
          code,
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
