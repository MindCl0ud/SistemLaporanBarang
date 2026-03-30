import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const records = await prisma.matchRecord.findMany({
    select: { status: true }
  })
  console.log('Current MatchRecord statuses:', Array.from(new Set(records.map(r => r.status))))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
