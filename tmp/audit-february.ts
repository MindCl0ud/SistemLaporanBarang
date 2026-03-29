import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log("--- BKU AUDIT: Februari 2026 Entries ---")
  
  const bkuEntries = await prisma.bkuTransaction.findMany({
    where: { month: 2, year: 2026 },
    orderBy: { createdAt: 'asc' } // Keep order from upload
  })

  bkuEntries.forEach((bku, index) => {
    console.log(`[Row ${index+1}] ID: ${bku.id.substring(0,8)} | Date: ${bku.date} | Amount: ${bku.expenseTotal} | Code: ${bku.code} | Desc: ${bku.description.substring(0,60)}`)
  })
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
