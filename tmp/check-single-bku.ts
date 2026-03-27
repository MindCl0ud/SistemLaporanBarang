import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const bku = await prisma.bkuTransaction.findUnique({
    where: { id: 'cmn86c87f0044k004vxwvpqun' }
  })
  if (bku) {
    console.log(`BKU Code: ${bku.code}`)
    console.log(`BKU Date: ${bku.date}`)
    console.log(`BKU Desc: ${bku.description}`)
  } else {
    console.log("BKU not found.")
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
