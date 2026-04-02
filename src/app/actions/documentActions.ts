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
  division: z.string().nullable().optional(),
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
      baNumber, baDate, paymentFor, unit, division
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
        division: division || "",
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

export async function batchImportDocuments(rows: any[]) {
  try {
    // 1. Grouping Logic
    // Kita kelompokkan berdasarkan DocNumber + Vendor + Date
    const groups = new Map<string, any>()

    rows.forEach(row => {
      const docKey = `${row.docNumber || 'NO_DOC'}_${row.vendorName || 'NO_VENDOR'}_${row.date || 'NO_DATE'}`
      
      if (!groups.has(docKey)) {
        groups.set(docKey, {
          type: row.type || "Nota",
          docNumber: row.docNumber || "",
          baNumber: row.baNumber || "",
          baDate: row.baDate ? new Date(row.baDate) : null,
          vendorName: row.vendorName || "Tidak Diketahui",
          date: row.date ? new Date(row.date) : new Date(),
          kodeRek: row.kodeRek || "",
          subKegiatan: row.subKegiatan || "",
          paymentFor: row.paymentFor || "",
          unit: row.unit || "", // Global unit
          division: row.division || "",
          items: []
        })
      }

      const group = groups.get(docKey)
      if (row.itemDescription) {
        group.items.push({
          description: row.itemDescription,
          itemCode: row.itemCode || "",
          quantity: Number(row.itemQty) || 0,
          unit: row.itemUnit || "",
          price: Number(row.itemPrice) || 0,
          total: (Number(row.itemQty) || 0) * (Number(row.itemPrice) || 0)
        })
      }
    })

    // 2. Database Transaction
    const results = await prisma.$transaction(async (tx) => {
      const createdDocs = []
      for (const docData of groups.values()) {
        const totalAmount = docData.items.reduce((sum: number, it: any) => sum + it.total, 0)
        
        const doc = await tx.document.create({
          data: {
            ...docData,
            totalAmount,
            items: {
              create: docData.items
            }
          }
        })
        createdDocs.push(doc)
      }
      return createdDocs
    })

    revalidatePath('/documents')
    revalidatePath('/')
    
    return { success: true, count: results.length }
  } catch (error: any) {
    console.error("BATCH IMPORT ERROR:", error)
    return { success: false, error: error.message || "Gagal mengimpor data batch." }
  }
}


async function getOrCreateManualDocument(tx: any) {
  let manualDoc = await tx.document.findFirst({
    where: { docNumber: 'MANUAL-REPORT-BUILDER' }
  })

  if (!manualDoc) {
    manualDoc = await tx.document.create({
      data: {
        type: 'Nota',
        docNumber: 'MANUAL-REPORT-BUILDER',
        vendorName: 'Entri Manual',
        paymentFor: 'Entri Manual Melalui Report Builder',
        totalAmount: 0,
        date: new Date(),
      }
    })
  }
  return manualDoc
}

export async function updateDocumentItemsBatch(items: any[]) {
  try {
    const results = await prisma.$transaction(async (tx) => {
      const updatedItems = []
      const affectedDocIds = new Set<string>()

      for (const item of items) {
        // 1. Determine Document ID
        let docId = item.documentId
        if (!docId || item.docNo === 'Manual') {
          const manualDoc = await getOrCreateManualDocument(tx)
          docId = manualDoc.id
        }

        // 2. Update or Create
        if (item.id && !item.id.includes('.')) { // Simple check for cuid vs math.random
          const updated = await tx.documentItem.update({
            where: { id: item.id },
            data: {
              description: item.desc,
              quantity: Number(item.qty) || 0,
              unit: item.unit,
              price: Number(item.price) || 0,
              total: Number(item.total) || 0,
              itemCode: item.itemCode,
            }
          })
          updatedItems.push(updated)
          affectedDocIds.add(updated.documentId)
        } else {
          const created = await tx.documentItem.create({
            data: {
              documentId: docId,
              description: item.desc,
              quantity: Number(item.qty) || 0,
              unit: item.unit,
              price: Number(item.price) || 0,
              total: Number(item.total) || 0,
              itemCode: item.itemCode,
            }
          })
          updatedItems.push(created)
          affectedDocIds.add(created.documentId)
        }
      }

      // 3. Recalculate totalAmount for all affected documents
      for (const docId of affectedDocIds) {
        const docItems = await tx.documentItem.findMany({ where: { documentId: docId } })
        const totalAmount = docItems.reduce((sum: number, it: any) => sum + (it.total || 0), 0)
        await tx.document.update({
          where: { id: docId },
          data: { totalAmount }
        })
      }

      return updatedItems
    })

    revalidatePath('/documents')
    revalidatePath('/')
    return { success: true, count: results.length }
  } catch (error: any) {
    console.error("BATCH UPDATE ITEMS ERROR:", error)
    return { success: false, error: error.message || "Gagal memperbarui item secara batch." }
  }
}
