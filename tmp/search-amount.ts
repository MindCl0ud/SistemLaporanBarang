import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log("--- SEARCH: BKU entries for 1,195,000 ---")
  
  const bkuMatches = await prisma.bkuTransaction.findMany({
    where: { expenseTotal: 1195000 }
  })

  console.log(`Found ${bkuMatches.length} matching BKU entries.`)

  for (const bku of bkuMatches) {
    console.log(`\n[BKU] ID: ${bku.id} | Month: ${bku.month} | Year: ${bku.year} | Date: ${bku.date} | Desc: ${bku.description}`)
    
    // Check if it's already matched
    const match = await prisma.matchRecord.findUnique({
      where: { bkuTransactionId: bku.id }
    })
    if (match) {
      console.log(`  ALREADY MATCHED to Doc ID: ${match.documentId}`)
    } else {
      console.log(`  UNMATCHED. Checking for candidate documents...`)
      const docs = await prisma.document.findMany({
        where: { totalAmount: 1195000, matchRecord: null }
      })
      docs.forEach(doc => {
        console.log(`    - [DOC] ID: ${doc.id} | Date: ${doc.date?.toISOString()} | Vendor: ${doc.vendorName} | CodeRek: ${doc.kodeRek} | SubKeg: ${doc.subKegiatan}`)
      })
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
