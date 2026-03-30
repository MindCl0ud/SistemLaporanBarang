'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function runMatchingEngine(month?: number, year?: number) {
  // Fetch unmatched BKU entries (optionally filtered by month/year)
  const whereClause: any = { matchRecord: null, expenseTotal: { gt: 0 } }
  if (month) whereClause.month = month
  if (year) whereClause.year = year

  const bkuEntries = await prisma.bkuTransaction.findMany({
    where: whereClause
  })

  // Fetch unmatched Documents
  const documents = await prisma.document.findMany({
    where: { matchRecord: null }
  })

  let matchCount = 0
  
  const normalizeCode = (c: string | null) => c ? c.replace(/[^0-9]/g, '') : '' 
  
  const parseBkuDate = (dStr: string | null) => {
    if (!dStr) return null
    const parts = dStr.split(/[-/]/)
    if (parts.length === 3) {
      if (parts[0].length === 4) return new Date(dStr)
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
    }
    return new Date(dStr)
  }

  for (const doc of documents) {
    let bestMatchBku: any = null
    let highestConfidence = 0

    const docKodeRekNorm = normalizeCode(doc.kodeRek)
    const docSubKegNorm = normalizeCode(doc.subKegiatan)

    for (const bku of bkuEntries) {
      let confidence = 0
      
      const bkuAmount = bku.expenseTotal || 0
      const docAmount = doc.totalAmount || 0
      const amountDiff = Math.abs(bkuAmount - docAmount)
      
      // 1. Amount Match (75% Base for Exact)
      if (bkuAmount === docAmount && bkuAmount > 0) {
        confidence += 0.75
      } else if (bkuAmount > 0 && amountDiff > 0) {
        const diffPercentage = (amountDiff / bkuAmount) * 100
        if (diffPercentage <= 1) confidence += 0.4
        else if (amountDiff < 1000) confidence += 0.2
      }

      // 2. Multi-Part Code Match (40% Weight)
      const bkuCodeNorm = normalizeCode(bku.code)
      let codeScore = 0
      if (docKodeRekNorm && bkuCodeNorm.includes(docKodeRekNorm)) codeScore += 0.15
      if (docSubKegNorm && bkuCodeNorm.includes(docSubKegNorm)) codeScore += 0.15
      
      if (codeScore >= 0.3) {
        const combinedDoc = normalizeCode(`${doc.subKegiatan}${doc.kodeRek}`)
        const combinedDocAlt = normalizeCode(`${doc.kodeRek}${doc.subKegiatan}`)
        if (bkuCodeNorm.includes(combinedDoc) || bkuCodeNorm.includes(combinedDocAlt)) {
          codeScore += 0.1
        }
      }
      confidence += Math.min(0.4, codeScore)

      // 3. Date Proximity Bonus (Up to +0.2)
      const bkuDate = parseBkuDate(bku.date)
      if (bkuDate && doc.date) {
        const diffDays = Math.abs(bkuDate.getTime() - doc.date.getTime()) / (1000 * 60 * 60 * 24)
        if (diffDays <= 0.5) confidence += 0.2
        else if (diffDays <= 3) confidence += 0.15
        else if (diffDays <= 7) confidence += 0.1
      }

      // 4. Description/Vendor Bonus (Up to +0.15)
      if (doc.vendorName && doc.vendorName !== "Tidak Diketahui") {
        if (bku.description.toLowerCase().includes(doc.vendorName.toLowerCase())) {
          confidence += 0.15
        }
      }

      if (confidence > highestConfidence) {
        highestConfidence = confidence
        bestMatchBku = bku
      }
    }

    if (bestMatchBku && highestConfidence >= 0.45) {
      const reason = highestConfidence >= 0.8 
        ? 'Cocok Sempurna (Nominal & Kode Rekening sesuai).'
        : `Cocok Tinggi (${(highestConfidence * 100).toFixed(0)}%) berdasarkan kesamaan data.`;

      await prisma.matchRecord.create({
        data: {
          bkuTransactionId: bestMatchBku.id,
          documentId: doc.id,
          confidence: highestConfidence,
          status: 'MATCHED',
          reasoning: reason
        }
      })
      matchCount++
      const index = bkuEntries.findIndex(b => b.id === bestMatchBku.id)
      if (index > -1) bkuEntries.splice(index, 1)
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
