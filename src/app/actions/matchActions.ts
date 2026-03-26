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

      // 2. Code String Match (Strong Indicator: Full Code)
      // Raw concatenation — subKegiatan already contains the dot prefix (e.g. "5.1.02.03.02.0035")
      // So fullDocCode = "5.01.01.2.09.00025.1.02.03.02.0035" stripped of all spaces,
      // which must match the BKU code field stored the same way.
      const rawDocCode = (doc.subKegiatan
        ? `${doc.kodeRek}${doc.subKegiatan}`
        : doc.kodeRek || '')
        .replace(/\s+/g, '')

      const bkuCode = bku.code?.replace(/\s+/g, '') || ''

      if (bkuCode && rawDocCode && bkuCode === rawDocCode) {
        // Exact full-code match is the strongest signal
        confidence += 0.5
      } else if (bkuCode && rawDocCode && (bkuCode.includes(rawDocCode) || rawDocCode.includes(bkuCode))) {
        confidence += 0.3
      } else {
        // Fallback: both start with the same base activity code
        const prefix = '5.01.01.2.09.0002'
        if (bkuCode.startsWith(prefix) && rawDocCode.startsWith(prefix)) {
          confidence += 0.2
        }
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
      const reason = highestConfidence >= 0.8 
        ? 'Cocok Sempurna (Kode Rekening & Nominal sama persis).'
        : 'Cocok berdasarkan kesamaan nominal dan sebagian kode rekening.';

      await prisma.matchRecord.create({
        data: {
          bkuTransactionId: bku.id,
          documentId: bestMatchDoc.id,
          confidence: highestConfidence,
          status: 'MATCHED',
          reasoning: reason
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
