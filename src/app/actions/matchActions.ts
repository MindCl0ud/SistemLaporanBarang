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
      
      // Compare amount
      if (bku.expenseTotal === doc.totalAmount && (doc.totalAmount || 0) > 0) {
        confidence += 0.6
      } else if (Math.abs((bku.expenseTotal || 0) - (doc.totalAmount || 0)) < 1000) {
         confidence += 0.4
      }

      // Keyword match
      if (bku.description.toLowerCase().includes(doc.vendorName?.toLowerCase() || 'xyz123')) {
        confidence += 0.3
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
