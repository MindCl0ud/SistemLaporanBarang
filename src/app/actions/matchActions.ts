'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function runMatchingEngine(month: number, year: number) {
  // Fetch unmatched BKU entries for the month
  const bkuEntries = await prisma.bkuTransaction.findMany({
    where: { month, year, matchRecord: null, expenseTotal: { gt: 0 } }
  })

  // Fetch unmatched Documents
  const documents = await prisma.document.findMany({
    where: { matchRecord: null }
  })

  let matchCount = 0

  for (const bku of bkuEntries) {
    let bestMatchDoc = null
    let highestConfidence = 0

    for (const doc of documents) {
      let confidence = 0
      
      // 1. Compare amount (Primary Weight)
      if (bku.expenseTotal === doc.totalAmount && (doc.totalAmount || 0) > 0) {
        confidence += 0.5
      } else if (Math.abs((bku.expenseTotal || 0) - (doc.totalAmount || 0)) < 1000) {
         confidence += 0.3
      }

      // 2. Code Suffix Match (New - Very Strong Indicator)
      // Prefix to ignore: 5.01.01.2.09.0002
      const prefix = "5.01.01.2.09.0002"
      const bkuSuffix = bku.code?.startsWith(prefix) ? bku.code.replace(prefix, "").replace(/^\./, "") : bku.code
      const docSuffix = doc.subKegiatan || (doc.kodeRek?.startsWith(prefix) ? doc.kodeRek.replace(prefix, "").replace(/^\./, "") : "")

      if (bkuSuffix && docSuffix && bkuSuffix === docSuffix) {
        confidence += 0.4
      }

      // 3. Keyword match (Secondary Weight)
      if (bku.description.toLowerCase().includes(doc.vendorName?.toLowerCase() || 'xyz123')) {
        confidence += 0.2
      }

      if (confidence > highestConfidence) {
        highestConfidence = confidence
        bestMatchDoc = doc
      }
    }

    if (bestMatchDoc && highestConfidence >= 0.5) {
      // Create match record
      await prisma.matchRecord.create({
        data: {
          bkuTransactionId: bku.id,
          documentId: bestMatchDoc.id,
          confidence: highestConfidence,
          status: 'MATCHED',
          reasoning: 'Otomatis dicocokkan berdasarkan kesamaan jumlah nominal dan kata kunci.'
        }
      })
      matchCount++
      // Remove doc from array to prevent double matching
      const index = documents.findIndex(d => d.id === bestMatchDoc.id)
      if (index > -1) documents.splice(index, 1)
    }
  }

  revalidatePath('/')
  revalidatePath('/bku')
  revalidatePath('/documents')
  return matchCount
}

export async function getDashboardStats() {
  const totalDocs = await prisma.document.count()
  const matchedDocs = await prisma.matchRecord.count()
  const bkuWithoutDocs = await prisma.bkuTransaction.count({
    where: { matchRecord: null, expenseTotal: { gt: 0 } }
  })
  
  const accuracy = totalDocs > 0 ? ((matchedDocs / totalDocs) * 100).toFixed(1) : "0"
  
  const recentMatches = await prisma.matchRecord.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { bkuTransaction: true, document: true }
  })

  return { totalDocs, matchedDocs, bkuWithoutDocs, accuracy, recentMatches }
}
