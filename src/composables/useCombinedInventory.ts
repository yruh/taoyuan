import { useInventoryStore } from '@/stores/useInventoryStore'
import { useWarehouseStore } from '@/stores/useWarehouseStore'
import type { Quality } from '@/types'

/** 合计背包 + 虚空原料箱中某物品数量 */
export const getCombinedItemCount = (itemId: string, quality?: Quality): number => {
  const inv = useInventoryStore()
  const wh = useWarehouseStore()
  const voidInput = wh.unlocked ? wh.getVoidInputChest() : null
  const chestCount = voidInput ? wh.getChestItemCount(voidInput.id, itemId, quality) : 0
  return inv.getItemCount(itemId, quality) + chestCount
}

/** 背包+虚空原料箱是否合计拥有足够数量 */
export const hasCombinedItem = (itemId: string, quantity: number = 1): boolean => getCombinedItemCount(itemId) >= quantity

/** 优先从背包消耗，不足部分从虚空原料箱消耗 */
export const removeCombinedItem = (itemId: string, quantity: number = 1, quality?: Quality): boolean => {
  const inv = useInventoryStore()
  const wh = useWarehouseStore()
  const voidInput = wh.unlocked ? wh.getVoidInputChest() : null
  const invCount = inv.getItemCount(itemId, quality)
  const chestCount = voidInput ? wh.getChestItemCount(voidInput.id, itemId, quality) : 0
  if (invCount + chestCount < quantity) return false
  const fromInv = Math.min(quantity, invCount)
  const fromChest = quantity - fromInv
  if (fromInv > 0) inv.removeItem(itemId, fromInv, quality)
  if (fromChest > 0 && voidInput) wh.removeItemFromChest(voidInput.id, itemId, fromChest, quality)
  return true
}

/** 查找背包+虚空原料箱中某物品的最低品质 */
export const getLowestCombinedQuality = (itemId: string): Quality => {
  const inv = useInventoryStore()
  const wh = useWarehouseStore()
  const voidInput = wh.unlocked ? wh.getVoidInputChest() : null
  const order: Quality[] = ['normal', 'fine', 'excellent', 'supreme']
  for (const q of order) {
    if (inv.getItemCount(itemId, q) > 0) return q
    if (voidInput && wh.getChestItemCount(voidInput.id, itemId, q) > 0) return q
  }
  return 'normal'
}
