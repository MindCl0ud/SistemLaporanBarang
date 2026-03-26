'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getDocuments() {
  return await prisma.document.findMany({
    orderBy: { createdAt: 'desc' },
    include: { 
      items: true, 
      matchRecord: {
        include: { bkuTransaction: true }
      }
    }
  })
}

export async function saveDocument(data: any) {
  const { type, docNumber, vendorName, totalAmount, date, extractedText, items, kodeRek, subKegiatan } = data

  const doc = await prisma.document.create({
    data: {
      type: type || "Nota",
      docNumber: docNumber || "",
      kodeRek: kodeRek || "",
      subKegiatan: subKegiatan || "",
      vendorName: vendorName || "Tidak Diketahui",
      totalAmount: Number(totalAmount) || 0,
      date: date ? new Date(date) : new Date(),
      extractedText: extractedText || "",
      items: {
        create: items || []
      }
    }
  })

  revalidatePath('/documents')
  revalidatePath('/')
  
  return doc
}

export async function deleteDocument(id: string) {
  await prisma.document.delete({ where: { id } })
  revalidatePath('/documents')
  revalidatePath('/')
}
