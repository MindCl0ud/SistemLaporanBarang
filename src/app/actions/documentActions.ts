'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// --- VALIDATION SCHEMAS ---
const DocumentItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Deskripsi wajib diisi"),
  itemCode: z.string().nullable().optional(),
  quantity: z.coerce.number().nullable().optional().default(1),
  price: z.coerce.number().nullable().optional().default(0),
  unit: z.string().nullable().optional(),
  total: z.coerce.number().nullable().optional().default(0),
})

const DocumentSchema = z.object({
  type: z.string().default("Nota"),
  docNumber: z.string().nullable().optional(),
  baNumber: z.string().nullable().optional(),
  baDate: z.any().nullable().optional(),
  kodeRek: z.string().nullable().optional(),
  subKegiatan: z.string().nullable().optional(),
  vendorName: z.string().nullable().optional(),
  totalAmount: z.coerce.number().nullable().optional().default(0),
  date: z.any().nullable().optional(),
  extractedText: z.string().nullable().optional(),
  paymentFor: z.string().nullable().optional(),
  unit: z.string().nullable().optional(),
  items: z.array(DocumentItemSchema).optional(),
})

import { unstable_cache } from "next/cache"

function sanitizePayload(data: any): any {
  if (Array.isArray(data)) return data.map(sanitizePayload)
  // Check for null or Date instances which shouldn't be recursed
  if (data === null || data instanceof Date) return data
  
  if (typeof data === 'object') {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        value === "" ? null : sanitizePayload(value)
      ])
    )
  }
  return data
}

export const getDocuments = unstable_cache(
  async () => {
    return await prisma.document.findMany({
      orderBy: { createdAt: 'desc' },
      include: { 
        items: true, 
        matchRecord: {
          include: { bkuTransaction: true }
        }
      }
    })
  },
  ['documents-list'],
  { tags: ['documents'] }
)

export async function saveDocument(rawData: any) {
  try {
    // 1. Server-side validation
    const validation = DocumentSchema.safeParse(rawData)
    if (!validation.success) {
      const errorMsg = validation.error.issues.map(i => `${i.path.join('.') || 'Global'}: ${i.message}`).join(', ')
      console.error("Save Document Validation Error:", errorMsg)
      return { success: false, error: `Validasi Gagal: ${errorMsg}` }
    }

    const data = validation.data
    const { 
      type, docNumber, vendorName, totalAmount, date, 
      extractedText, items, kodeRek, subKegiatan,
      baNumber, baDate, paymentFor, unit
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
        totalAmount: totalAmount || 0,
        date: date ? new Date(date) : new Date(),
        extractedText: extractedText || "",
        paymentFor: paymentFor || "",
        unit: unit || "",
        items: {
          create: items?.map(item => ({
            description: item.description,
            itemCode: item.itemCode || "",
            quantity: item.quantity || 0,
            unit: item.unit || "",
            price: item.price || 0,
            total: item.total || 0,
          })) || []
        }
      }
    })

    revalidatePath('/documents')
    revalidatePath('/')
    
    return { success: true, doc }
  } catch (error: any) {
    console.error("CRITICAL SAVE ERROR:", error)
    return { success: false, error: error.message || "Terjadi kesalahan internal saat menyimpan." }
  }
}

export async function deleteDocument(id: string) {
  await prisma.document.delete({ where: { id } })
  revalidatePath('/documents')
  revalidatePath('/')
}

export async function updateDocumentItem(id: string, data: z.infer<typeof DocumentItemSchema>) {
  const result = await prisma.documentItem.update({ where: { id }, data: {
    description: data.description,
    itemCode: data.itemCode,
    quantity: data.quantity,
    price: data.price,
    total: data.total
  }})
  revalidatePath('/documents')
  return result
}

export async function updateDocument(id: string, rawData: any) {
  const data = DocumentSchema.partial().parse(rawData)
  const { items, ...updateData } = data

  const doc = await prisma.document.update({ 
    where: { id }, 
    data: {
      ...updateData,
      date: data.date ? new Date(data.date) : undefined,
      baDate: data.baDate ? new Date(data.baDate) : undefined,
    } 
  })
  revalidatePath('/documents')
  revalidatePath('/')
  return { success: true, doc }
}

export async function deleteDocumentItem(id: string) {
  await prisma.documentItem.delete({ where: { id } })
  revalidatePath('/documents')
}

