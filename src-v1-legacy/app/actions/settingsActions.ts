'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getBudgetMode() {
  try {
    const setting = await prisma.globalSetting.findUnique({
      where: { key: 'useRevisedBudget' }
    })
    return setting?.value === 'true'
  } catch (e) {
    return false
  }
}

export async function updateBudgetMode(enabled: boolean) {
  await prisma.globalSetting.upsert({
    where: { key: 'useRevisedBudget' },
    update: { value: String(enabled) },
    create: { key: 'useRevisedBudget', value: String(enabled) }
  })
  revalidatePath('/settings/accounts')
  revalidatePath('/bku')
}

export async function exportAllData() {
  const documents = await prisma.document.findMany({
    include: { items: true }
  })
  const bkuTransactions = await prisma.bkuTransaction.findMany()
  const matchRecords = await prisma.matchRecord.findMany()
  const accountMappings = await prisma.accountCodeMapping.findMany({
    include: { budgetLogs: true }
  })
  const masterItems = await prisma.masterItem.findMany()
  const settings = await prisma.globalSetting.findMany()

  return {
    documents,
    bkuTransactions,
    matchRecords,
    accountMappings,
    masterItems,
    settings,
    exportedAt: new Date().toISOString()
  }
}

export async function resetAllApplicationData() {
  try {
    await prisma.$transaction([
      prisma.matchRecord.deleteMany(),
      prisma.documentItem.deleteMany(),
      prisma.document.deleteMany(),
      prisma.bkuTransaction.deleteMany(),
      prisma.budgetLog.deleteMany(),
      prisma.accountCodeMapping.deleteMany(),
      prisma.masterItem.deleteMany(),
      prisma.globalSetting.deleteMany(),
    ])

    revalidatePath('/')
    revalidatePath('/bku')
    revalidatePath('/documents')
    revalidatePath('/settings')
    
    return { success: true }
  } catch (error: any) {
    console.error("Reset Error:", error)
    return { success: false, error: error.message }
  }
}
