'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function resetAllApplicationData() {
  try {
    // Delete in order to satisfy foreign keys
    await prisma.matchRecord.deleteMany({})
    await prisma.documentItem.deleteMany({})
    await prisma.document.deleteMany({})
    await prisma.bkuTransaction.deleteMany({})
    
    // Optional: Also clear account mappings if requested? 
    // Usually, mappings are "master data" so we keep them unless specified.
    // await prisma.accountCodeMapping.deleteMany({})

    revalidatePath('/')
    revalidatePath('/documents')
    revalidatePath('/bku')
    revalidatePath('/settings')
    
    return { success: true }
  } catch (error: any) {
    console.error("RESET ERROR:", error)
    return { success: false, error: error.message }
  }
}

export async function exportAllData() {
  const documents = await prisma.document.findMany({ include: { items: true } })
  const bku = await prisma.bkuTransaction.findMany()
  const mappings = await prisma.accountCodeMapping.findMany()
  
  return {
    documents,
    bku,
    mappings,
    exportedAt: new Date().toISOString()
  }
}
