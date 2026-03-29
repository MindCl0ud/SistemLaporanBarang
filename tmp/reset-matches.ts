import { PrismaClient } from '@prisma/client'
import { runMatchingEngine } from '../src/app/actions/matchActions'

const prisma = new PrismaClient()

async function main() {
  console.log("--- RESETTING MATCHES to apply new weights ---")
  const deleted = await prisma.matchRecord.deleteMany({})
  console.log(`Deleted ${deleted.count} existing matches.`)

  console.log("Running Global Matching Engine...")
  const matches = await runMatchingEngine()
  console.log(`Successfully created ${matches} new matches using refined logic.`)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
