import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log("--- FINAL MATCH STATE ---")
  const matches = await prisma.matchRecord.findMany({
    include: { bkuTransaction: true }
  })

  if (matches.length === 0) {
    console.log("No matches found.")
  }

  matches.forEach((m, i) => {
    console.log(`[Match ${i+1}] BKU Amount: ${m.bkuTransaction.expenseTotal} | Doc ID: ${m.documentId} | Confidence: ${m.confidence} | Reason: ${m.reasoning}`)
  })
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
