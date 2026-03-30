'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getMasterItems() {
  return await prisma.masterItem.findMany({
    orderBy: { code: 'asc' }
  })
}

export async function saveMasterItem(data: { code: string; description: string; unit?: string; price?: number }) {
  const item = await prisma.masterItem.upsert({
    where: { code: data.code },
    update: {
      description: data.description,
      unit: data.unit,
      price: data.price ? Number(data.price) : undefined
    },
    create: {
      code: data.code,
      description: data.description,
      unit: data.unit,
      price: data.price ? Number(data.price) : 0
    }
  })
  revalidatePath('/master-barang')
  return item
}

export async function deleteMasterItem(id: string) {
  await prisma.masterItem.delete({
    where: { id }
  })
  revalidatePath('/master-barang')
}

export async function importMasterItems(items: any[]) {
  // Batch upsert logic
  const results = await Promise.all(items.map(it => 
    prisma.masterItem.upsert({
      where: { code: it.code },
      update: { description: it.description, unit: it.unit, price: Number(it.price) || 0 },
      create: { code: it.code, description: it.description, unit: it.unit, price: Number(it.price) || 0 }
    })
  ))
  revalidatePath('/master-barang')
  return results.length
}
