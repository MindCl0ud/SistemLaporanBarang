'use client' // actually this should be a server action file, removing 'use client'

'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getBudgetMode() {
  const setting = await prisma.globalSetting.findUnique({
    where: { key: 'useRevisedBudget' }
  })
  return setting?.value === 'true'
}

export async function updateBudgetMode(enabled: boolean) {
  await prisma.globalSetting.upsert({
    where: { key: 'useRevisedBudget' },
    update: { value: String(enabled) },
    create: { key: 'useRevisedBudget', value: String(enabled) }
  })
  revalidatePath('/settings/accounts')
  revalidatePath('/bku')
}
