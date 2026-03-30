'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

// 1. Fungsi Utama untuk Melakukan Pencocokan
export async function matchDocumentWithBku(documentId: string, bkuId: string) {
  const doc = await prisma.document.findUnique({ where: { id: documentId } })
  const bku = await prisma.bkuTransaction.findUnique({ where: { id: bkuId } })
  
  if (!doc || !bku) throw new Error("Data tidak ditemukan")

  // Otomatis update Nomor Dokumen (Kwitansi) berdasarkan Nomor Bukti BKU
  const updatedDoc = await prisma.document.update({
    where: { id: documentId },
    data: {
      docNumber: bku.code || doc.docNumber 
    }
  })

  // Simpan record matching
  await prisma.matchRecord.create({
    data: {
      documentId: documentId,
      bkuTransactionId: bkuId,
      confidence: 0.95, // Disetujui manual (tinggi)
      status: 'MATCHED'
    }
  })

  revalidatePath('/documents')
  revalidatePath('/bku')
  
  return updatedDoc
}

// 2. Fungsi Hapus Kecocokan
export async function removeMatch(matchId: string) {
  await prisma.matchRecord.delete({
    where: { id: matchId }
  })

  revalidatePath('/documents')
  revalidatePath('/bku')
}

// 3. FITUR BARU: Pencarian/Saran BKU Berdasarkan Algoritma Fuzzy
export async function suggestBkuForDocument(documentId: string) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { items: true }
  })
  
  if (!doc) return []

  // Ambil transaksi BKU yang nominalnya pengeluaran (expense)
  const candidates = await prisma.bkuTransaction.findMany({
    where: { matchRecord: null, expenseTotal: { gt: 0 } }
  })

  // Kata kunci: 'Untuk Pembayaran' + Semua nama item yang diekstrak
  const searchString = `${doc.paymentFor || ''} ${doc.items.map(i => i.description).join(' ')}`.toLowerCase()
  const searchWords = searchString.match(/\b\w+\b/g) || []

  const scored = candidates.map(bku => {
    const bkuWords = bku.description.toLowerCase().match(/\b\w+\b/g) || []
    let matchCount = 0
    
    // Algoritma overlap kata dasar
    searchWords.forEach(sw => {
      if (sw.length > 3 && bkuWords.includes(sw)) matchCount++
    })
    
    // Beri bobot sangat besar jika Total Nominal sama persis
    const isExactAmount = bku.expenseTotal === doc.totalAmount
    const confidence = (matchCount / (bkuWords.length || 1)) + (isExactAmount ? 1.5 : 0)

    return { ...bku, confidence }
  })

  // Kembalikan top 3 kecocokan tertinggi
  return scored
    .filter(s => s.confidence > 0.5)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3)
}
