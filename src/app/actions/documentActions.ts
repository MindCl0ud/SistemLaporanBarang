'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getDocuments() {
  return await prisma.document.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100, // Optimalisasi: Membatasi query agar tidak melambatkan server
    include: { 
      items: true, 
      matchRecord: {
        include: { bkuTransaction: true }
      }
    }
  })
}

export async function saveDocument(data: any) {
  const { 
    type, docNumber, vendorName, totalAmount, date, 
    extractedText, items, kodeRek, subKegiatan,
    baNumber, baDate, paymentFor
  } = data

  const doc = await prisma.document.create({
    data: {
      type: type || "Nota",
      docNumber: docNumber || "",
      baNumber: baNumber || "",
      baDate: baDate ? new Date(baDate) : null,
      kodeRek: kodeRek || "",
      subKegiatan: subKegiatan || "",
      vendorName: vendorName || "Tidak Diketahui",
      paymentFor: paymentFor || "",
      totalAmount: Number(totalAmount) || 0,
      date: date ? new Date(date) : new Date(),
      extractedText: extractedText || "",
      items: {
        create: items.map((item: any) => ({
          itemCode: item.itemCode || "",
          description: item.description || "",
          quantity: Number(item.quantity) || 0,
          unit: item.unit || "",
          price: Number(item.price) || 0,
          total: Number(item.total) || 0
        })) || []
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

export async function updateDocumentItem(id: string, data: {
  itemCode?: string
  description?: string
  quantity?: number
  unit?: string
  price?: number
  total?: number
}) {
  await prisma.documentItem.update({ where: { id }, data })
  revalidatePath('/documents')
}

export async function updateDocument(id: string, data: {
  docNumber?: string
  vendorName?: string
  kodeRek?: string
  subKegiatan?: string
  baNumber?: string
  totalAmount?: number
  paymentFor?: string
}) {
  const doc = await prisma.document.update({ where: { id }, data })
  revalidatePath('/documents')
  revalidatePath('/')
  return doc
}

export async function deleteDocumentItem(id: string) {
  await prisma.documentItem.delete({ where: { id } })
  revalidatePath('/documents')
}
