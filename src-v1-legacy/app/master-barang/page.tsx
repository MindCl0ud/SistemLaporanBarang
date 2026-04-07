import { getMasterItems } from "@/app/actions/masterItemActions"
import MasterItemManager from "./MasterItemManager"

export const dynamic = 'force-dynamic'

export default async function MasterItemPage() {
  const items = await getMasterItems()
  
  return (
    <div className="container mx-auto py-8 px-4">
      <MasterItemManager initialItems={items} />
    </div>
  )
}
