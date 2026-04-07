'use server'

import prisma from "@/lib/prisma"

export async function processLocalQuery(input: string) {
  const query = input.toLowerCase()
  
  try {
    // 1. INTENT: COUNT DOCUMENTS
    if (query.includes('berapa nota') || query.includes('jumlah dokumen') || query.includes('banyak nota')) {
      const count = await prisma.document.count()
      const total = await prisma.document.aggregate({ _sum: { totalAmount: true } })
      return `Saat ini ada **${count} dokumen** yang telah terinput, dengan total nilai transaksi sebesar **${formatIDR(total._sum.totalAmount || 0)}**.`
    }

    // 2. INTENT: BKU TOTALS / EXPENSE
    if (query.includes('total pengeluaran') || query.includes('berapa belanja') || query.includes('total belanja')) {
      const stats = await prisma.bkuTransaction.aggregate({
        _sum: { expenseTotal: true }
      })
      return `Total pengeluaran yang tercatat di BKU hingga saat ini adalah **${formatIDR(stats._sum.expenseTotal || 0)}**.`
    }

    // 3. INTENT: UNMATCHED / PENDING
    if (query.includes('belum ada nota') || query.includes('tidak ada bukti') || query.includes('cek transaksi') || query.includes('pending')) {
      const bkuCount = await prisma.bkuTransaction.count()
      const matchedCount = await prisma.matchRecord.count()
      const unmatched = bkuCount - matchedCount
      
      if (unmatched === 0) {
        return "Luar biasa! Semua transaksi BKU sudah memiliki pasangan bukti nota yang cocok."
      }
      return `Ada **${unmatched} transaksi BKU** yang belum memiliki pasangan nota. Anda sebaiknya segera mengunggah bukti untuk transaksi tersebut di menu BKU Bulanan.`
    }

    // 4. INTENT: VENDOR
    if (query.includes('vendor') || query.includes('penyedia') || query.includes('toko')) {
      const topVendors = await prisma.document.groupBy({
        by: ['vendorName'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 3
      })
      
      if (topVendors.length === 0) return "Belum ada data vendor yang terekam."
      const list = topVendors.map(v => `- **${v.vendorName || 'Tanpa Nama'}** (${v._count.id} dokumen)`).join('\n')
      return `Berikut adalah 3 vendor dengan interaksi terbanyak:\n${list}`
    }

    // 5. INTENT: BUDGET / PAGU
    if (query.includes('anggaran') || query.includes('pagu') || query.includes('sisa')) {
      const mappings = await prisma.accountCodeMapping.findMany()
      const bkuStats = await prisma.bkuTransaction.aggregate({ _sum: { expenseTotal: true } })
      
      const totalBudget = mappings.reduce((sum, m: any) => sum + (m.budget || 0), 0)
      const totalSpent = bkuStats._sum.expenseTotal || 0
      const remaining = totalBudget - totalSpent
      const percent = totalBudget > 0 ? (totalSpent / totalBudget * 100).toFixed(1) : '0'

      return `Total Pagu Anggaran Anda adalah **${formatIDR(totalBudget)}**. Realisasi saat ini **${formatIDR(totalSpent)}** (**${percent}%**). Sisa anggaran tersedia: **${formatIDR(remaining)}**.`
    }

    // 6. INTENT: GREETING & CAPABILITIES
    if (query.includes('halo') || query.includes('hai') || query.includes('bisa apa') || query.includes('help') || query.includes('tolong')) {
      return "Halo! Saya asisten data Anda. Saya bisa menjawab pertanyaan seputar:\n- **Jumlah Nota** (ex: 'Berapa banyak nota?')\n- **Status BKU** (ex: 'Cek transaksi tanpa nota')\n- **Vendor** (ex: 'Siapa vendor paling sering?')\n- **Anggaran** (ex: 'Berapa sisa pagu?')\n\nSilakan tanya apa saja!"
    }

    // FALLBACK
    return "Maaf, saya belum memahami pertanyaan tersebut. Coba tanyakan tentang **'sisa anggaran'**, **'nota yang belum ada'**, atau **'siapa vendor terbanyak'**."

  } catch (error) {
    console.error("CHAT ERROR:", error)
    return "Terjadi kendala saat mengakses database. Silakan coba sesaat lagi."
  }
}

function formatIDR(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)
}
