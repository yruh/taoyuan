import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { MONSTER_GOALS, GUILD_SHOP_ITEMS } from '@/data/guild'
import { usePlayerStore } from './usePlayerStore'
import { useInventoryStore } from './useInventoryStore'

export const useGuildStore = defineStore('guild', () => {
  /** 按怪物ID记录击杀数 */
  const monsterKills = ref<Record<string, number>>({})

  /** 已领取奖励的讨伐目标monsterId集合 */
  const claimedGoals = ref<string[]>([])

  /** 已遭遇过的怪物ID集合（用于图鉴） */
  const encounteredMonsters = ref<string[]>([])

  /** 记录击杀 */
  const recordKill = (monsterId: string) => {
    monsterKills.value[monsterId] = (monsterKills.value[monsterId] ?? 0) + 1
    if (!encounteredMonsters.value.includes(monsterId)) {
      encounteredMonsters.value.push(monsterId)
    }
  }

  /** 记录遭遇（进入战斗时调用，不管是否击杀） */
  const recordEncounter = (monsterId: string) => {
    if (!encounteredMonsters.value.includes(monsterId)) {
      encounteredMonsters.value.push(monsterId)
    }
  }

  /** 获取某怪物击杀数 */
  const getKillCount = (monsterId: string): number => {
    return monsterKills.value[monsterId] ?? 0
  }

  /** 是否已遭遇某怪物 */
  const isEncountered = (monsterId: string): boolean => {
    return encounteredMonsters.value.includes(monsterId)
  }

  /** 已完成的讨伐目标数 */
  const completedGoalCount = computed(() => {
    return MONSTER_GOALS.filter(g => (monsterKills.value[g.monsterId] ?? 0) >= g.killTarget).length
  })

  /** 可领取奖励的目标 */
  const claimableGoals = computed(() => {
    return MONSTER_GOALS.filter(g => (monsterKills.value[g.monsterId] ?? 0) >= g.killTarget && !claimedGoals.value.includes(g.monsterId))
  })

  /** 领取讨伐奖励 */
  const claimGoal = (monsterId: string): boolean => {
    const goal = MONSTER_GOALS.find(g => g.monsterId === monsterId)
    if (!goal) return false
    if ((monsterKills.value[monsterId] ?? 0) < goal.killTarget) return false
    if (claimedGoals.value.includes(monsterId)) return false

    const playerStore = usePlayerStore()
    const inventoryStore = useInventoryStore()

    if (goal.reward.money) {
      playerStore.earnMoney(goal.reward.money)
    }
    if (goal.reward.items) {
      for (const item of goal.reward.items) {
        inventoryStore.addItem(item.itemId, item.quantity)
      }
    }
    claimedGoals.value.push(monsterId)
    return true
  }

  /** 公会商店：检查物品是否已解锁 */
  const isShopItemUnlocked = (itemId: string): boolean => {
    const item = GUILD_SHOP_ITEMS.find(i => i.itemId === itemId)
    if (!item) return false
    if (!item.unlockGoalCount) return true
    return completedGoalCount.value >= item.unlockGoalCount
  }

  /** 公会商店：购买物品 */
  const buyShopItem = (itemId: string): boolean => {
    const item = GUILD_SHOP_ITEMS.find(i => i.itemId === itemId)
    if (!item) return false
    if (!isShopItemUnlocked(itemId)) return false

    const playerStore = usePlayerStore()
    const inventoryStore = useInventoryStore()

    if (playerStore.money < item.price) return false
    playerStore.spendMoney(item.price)
    if (!inventoryStore.addItem(item.itemId, 1)) {
      playerStore.earnMoney(item.price)
      return false
    }
    return true
  }

  /** 序列化 */
  const serialize = () => ({
    monsterKills: { ...monsterKills.value },
    claimedGoals: [...claimedGoals.value],
    encounteredMonsters: [...encounteredMonsters.value]
  })

  /** 反序列化 */
  const deserialize = (data: ReturnType<typeof serialize>) => {
    monsterKills.value = data.monsterKills ?? {}
    claimedGoals.value = data.claimedGoals ?? []
    encounteredMonsters.value = data.encounteredMonsters ?? []
  }

  return {
    monsterKills,
    claimedGoals,
    encounteredMonsters,
    recordKill,
    recordEncounter,
    getKillCount,
    isEncountered,
    completedGoalCount,
    claimableGoals,
    claimGoal,
    isShopItemUnlocked,
    buyShopItem,
    serialize,
    deserialize
  }
})
