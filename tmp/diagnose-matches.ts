import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log("--- AUDIT: Unmatched BKU vs Unmatched Documents ---")
  
  const bkuUnmatched = await prisma.bkuTransaction.findMany({
    where: { matchRecord: null, expenseTotal: { gt: 0 } },
    take: 20
  })

  const docsUnmatched = await prisma.document.findMany({
    where: { matchRecord: null },
    take: 20
  })

  console.log(`Unmatched BKU: ${bkuUnmatched.length}`)
  console.log(`Unmatched Docs: ${docsUnmatched.length}`)

  for (const bku of bkuUnmatched) {
    console.log(`\n[BKU] ID: ${bku.id.substring(0,8)} | Date: ${bku.date} | Amount: ${bku.expenseTotal} | Code: ${bku.code} | Desc: ${bku.description.substring(0,50)}`)
    
    // Find potential candidates manually (loose criteria)
    const candidates = docsUnmatched.filter(doc => {
      const amountDiff = Math.abs((doc.totalAmount || 0) - (bku.expenseTotal || 0))
      return amountDiff < 5000 // Within 5000
    })

    if (candidates.length > 0) {
      console.log(`  Potential Docs:`)
      candidates.forEach(doc => {
        console.log(`    - [DOC] ID: ${doc.id.substring(0,8)} | Date: ${doc.date?.toISOString().split('T')[0]} | Amount: ${doc.totalAmount} | Code: ${doc.kodeRek}${doc.subKegiatan} | Vendor: ${doc.vendorName}`)
      })
    } else {
      console.log(`  No candidates found in the sample.`)
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
