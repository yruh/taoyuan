import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { MachineType, ProcessingSlot, Quality } from '@/types'
import {
  PROCESSING_MACHINES,
  SPRINKLERS,
  FERTILIZERS,
  BAITS,
  TACKLES,
  TAPPER,
  CRAB_POT_CRAFT,
  BOMBS,
  getRecipesForMachine,
  getProcessingRecipeById
} from '@/data/processing'
import { useInventoryStore } from './useInventoryStore'
import { usePlayerStore } from './usePlayerStore'
import { useSkillStore } from './useSkillStore'
import { useBreedingStore } from './useBreedingStore'
import { useWarehouseStore } from './useWarehouseStore'
import { addLog } from '@/composables/useGameLog'
import { hasCombinedItem, removeCombinedItem, getLowestCombinedQuality } from '@/composables/useCombinedInventory'

/** 最大放置机器数 */
const MAX_MACHINES = 15

export const useProcessingStore = defineStore('processing', () => {
  const inventoryStore = useInventoryStore()
  const playerStore = usePlayerStore()
  const skillStore = useSkillStore()

  /** 已放置的加工机器（运行中的槽位） */
  const machines = ref<ProcessingSlot[]>([])

  /** 当前放置数量 */
  const machineCount = computed(() => machines.value.length)

  // === 制造(Craft) ===

  /** 检查是否有足够材料制造某样东西 */
  const canCraft = (craftCost: { itemId: string; quantity: number }[], craftMoney: number): boolean => {
    if (playerStore.money < craftMoney) return false
    return craftCost.every(c => hasCombinedItem(c.itemId, c.quantity))
  }

  /** 消耗材料 */
  const consumeCraftMaterials = (craftCost: { itemId: string; quantity: number }[], craftMoney: number): boolean => {
    if (!canCraft(craftCost, craftMoney)) return false
    if (!playerStore.spendMoney(craftMoney)) return false
    for (const c of craftCost) {
      if (!removeCombinedItem(c.itemId, c.quantity)) {
        // 回退（简化处理：理论上不会到这里因为canCraft已检查）
        playerStore.earnMoney(craftMoney)
        return false
      }
    }
    return true
  }

  /** 制造并放置一台加工机器 */
  const craftMachine = (machineType: MachineType): boolean => {
    if (machines.value.length >= MAX_MACHINES) return false
    const def = PROCESSING_MACHINES.find(m => m.id === machineType)
    if (!def) return false
    if (!consumeCraftMaterials(def.craftCost, def.craftMoney)) return false
    machines.value.push({
      machineType,
      recipeId: null,
      inputItemId: null,
      daysProcessed: 0,
      totalDays: 0,
      ready: false
    })
    return true
  }

  /** 制造洒水器（返回物品ID放入背包） */
  const craftSprinkler = (sprinklerId: string): boolean => {
    const def = SPRINKLERS.find(s => s.id === sprinklerId)
    if (!def) return false
    if (!consumeCraftMaterials(def.craftCost, def.craftMoney)) return false
    inventoryStore.addItem(def.id)
    return true
  }

  /** 制造肥料 */
  const craftFertilizer = (fertilizerId: string): boolean => {
    const def = FERTILIZERS.find(f => f.id === fertilizerId)
    if (!def) return false
    if (!consumeCraftMaterials(def.craftCost, def.craftMoney)) return false
    inventoryStore.addItem(def.id)
    return true
  }

  /** 制造鱼饵 */
  const craftBait = (baitId: string): boolean => {
    const def = BAITS.find(b => b.id === baitId)
    if (!def) return false
    if (!consumeCraftMaterials(def.craftCost, def.craftMoney)) return false
    inventoryStore.addItem(def.id)
    return true
  }

  /** 制造浮漂 */
  const craftTackle = (tackleId: string): boolean => {
    const def = TACKLES.find(t => t.id === tackleId)
    if (!def) return false
    if (!consumeCraftMaterials(def.craftCost, def.craftMoney)) return false
    inventoryStore.addItem(def.id)
    return true
  }

  /** 制造采脂器 */
  const craftTapper = (): boolean => {
    if (!consumeCraftMaterials(TAPPER.craftCost, TAPPER.craftMoney)) return false
    inventoryStore.addItem(TAPPER.id)
    return true
  }

  /** 制造蟹笼 */
  const craftCrabPot = (): boolean => {
    if (!consumeCraftMaterials(CRAB_POT_CRAFT.craftCost, CRAB_POT_CRAFT.craftMoney)) return false
    inventoryStore.addItem(CRAB_POT_CRAFT.id)
    return true
  }

  /** 制造炸弹 */
  const craftBomb = (bombId: string): boolean => {
    const def = BOMBS.find(b => b.id === bombId)
    if (!def) return false
    if (!consumeCraftMaterials(def.craftCost, def.craftMoney)) return false
    inventoryStore.addItem(def.id)
    return true
  }

  // === 加工操作 ===

  /** 检测背包+仓库中某物品的最低品质（removeItem 默认消耗顺序） */
  const getLowestQuality = (itemId: string): Quality => {
    return getLowestCombinedQuality(itemId)
  }

  /** 向已放置的机器投入原料开始加工 */
  const startProcessing = (slotIndex: number, recipeId: string): boolean => {
    const slot = machines.value[slotIndex]
    if (!slot || slot.recipeId !== null) return false // 正在加工中
    const recipe = getProcessingRecipeById(recipeId)
    if (!recipe || recipe.machineType !== slot.machineType) return false

    // 消耗输入材料（蜂箱无需输入），记录投入品质
    let quality: Quality = 'normal'
    if (recipe.inputItemId !== null) {
      quality = getLowestQuality(recipe.inputItemId)
      if (!removeCombinedItem(recipe.inputItemId, recipe.inputQuantity, quality)) return false
    }

    slot.recipeId = recipeId
    slot.inputItemId = recipe.inputItemId
    slot.inputQuality = quality
    slot.daysProcessed = 0
    slot.totalDays = recipe.processingDays
    slot.ready = false
    return true
  }

  /** 收取加工产物 */
  const collectProduct = (slotIndex: number): string | null => {
    const slot = machines.value[slotIndex]
    if (!slot || !slot.ready || !slot.recipeId) return null

    const recipe = getProcessingRecipeById(slot.recipeId)
    if (!recipe) return null

    // 优先放入虚空成品箱，箱子满则回退到背包
    const warehouseStore = useWarehouseStore()
    const voidOutput = warehouseStore.getVoidOutputChest()
    if (
      voidOutput &&
      warehouseStore.addItemToChest(voidOutput.id, recipe.outputItemId, recipe.outputQuantity, slot.inputQuality ?? 'normal')
    ) {
      // 成功放入成品箱
    } else {
      inventoryStore.addItem(recipe.outputItemId, recipe.outputQuantity, slot.inputQuality ?? 'normal')
    }

    // 种子制造机额外触发育种种子生成
    if (slot.machineType === 'seed_maker' && slot.inputItemId) {
      const breedingStore = useBreedingStore()
      const farmingLevel = skillStore.farmingLevel
      if (breedingStore.trySeedMakerGeneticSeed(slot.inputItemId, farmingLevel)) {
        addLog('种子制造机额外产出了一颗育种种子！')
      }
    }

    // 重置槽位
    slot.recipeId = null
    slot.inputItemId = null
    slot.inputQuality = undefined
    slot.daysProcessed = 0
    slot.totalDays = 0
    slot.ready = false

    return recipe.outputItemId
  }

  /** 拆除机器（退回加工原料 + 已完成产物 + 机器制作材料） */
  const removeMachine = (slotIndex: number): boolean => {
    const slot = machines.value[slotIndex]
    if (!slot) return false

    // 如果已完成：先收取产物
    if (slot.recipeId && slot.ready) {
      const recipe = getProcessingRecipeById(slot.recipeId)
      if (recipe) {
        const warehouseStore = useWarehouseStore()
        const voidOutput = warehouseStore.getVoidOutputChest()
        if (
          voidOutput &&
          warehouseStore.addItemToChest(voidOutput.id, recipe.outputItemId, recipe.outputQuantity, slot.inputQuality ?? 'normal')
        ) {
          // 成功放入成品箱
        } else {
          inventoryStore.addItem(recipe.outputItemId, recipe.outputQuantity, slot.inputQuality ?? 'normal')
        }
      }
    }
    // 如果正在加工：退回原料
    else if (slot.recipeId && !slot.ready && slot.inputItemId) {
      const recipe = getProcessingRecipeById(slot.recipeId)
      if (recipe && recipe.inputItemId) {
        inventoryStore.addItem(recipe.inputItemId, recipe.inputQuantity, slot.inputQuality ?? 'normal')
      }
    }

    // 退还机器制作材料
    const machineDef = PROCESSING_MACHINES.find(m => m.id === slot.machineType)
    if (machineDef) {
      for (const mat of machineDef.craftCost) {
        inventoryStore.addItem(mat.itemId, mat.quantity)
      }
      playerStore.earnMoney(machineDef.craftMoney)
    }

    machines.value.splice(slotIndex, 1)
    return true
  }

  /** 取消加工（退回原料，机器回到空闲状态） */
  const cancelProcessing = (slotIndex: number): boolean => {
    const slot = machines.value[slotIndex]
    if (!slot || !slot.recipeId) return false
    // 如果正在加工且有原料投入，退回原料
    if (!slot.ready && slot.inputItemId) {
      const recipe = getProcessingRecipeById(slot.recipeId)
      if (recipe && recipe.inputItemId) {
        inventoryStore.addItem(recipe.inputItemId, recipe.inputQuantity, slot.inputQuality ?? 'normal')
      }
    }
    // 重置为空闲
    slot.recipeId = null
    slot.inputItemId = null
    slot.inputQuality = undefined
    slot.daysProcessed = 0
    slot.totalDays = 0
    slot.ready = false
    return true
  }

  /** 获取某台机器可用的加工配方列表 */
  const getAvailableRecipes = (machineType: MachineType) => {
    return getRecipesForMachine(machineType)
  }

  // === 每日更新 ===

  const dailyUpdate = () => {
    const collected: string[] = []
    const readyNames: string[] = []
    const warehouseStore = useWarehouseStore()
    const voidOutput = warehouseStore.getVoidOutputChest()
    for (const slot of machines.value) {
      if (!slot.recipeId || slot.ready) continue
      slot.daysProcessed++
      if (slot.daysProcessed >= slot.totalDays) {
        const recipe = getProcessingRecipeById(slot.recipeId)
        if (recipe) {
          if (recipe.inputItemId === null) {
            // 无需原料的机器（蜂箱、蚯蚓箱）：自动收取并重启
            if (
              voidOutput &&
              warehouseStore.addItemToChest(voidOutput.id, recipe.outputItemId, recipe.outputQuantity, slot.inputQuality ?? 'normal')
            ) {
              // 成功放入成品箱
            } else {
              inventoryStore.addItem(recipe.outputItemId, recipe.outputQuantity, slot.inputQuality ?? 'normal')
            }
            collected.push(recipe.name)
            slot.daysProcessed = 0
            slot.inputQuality = undefined
            slot.ready = false
          } else {
            // 需要原料的机器：标记为完成，等待玩家手动收取
            slot.ready = true
            readyNames.push(recipe.name)
          }
        } else {
          slot.ready = true
        }
      }
    }
    if (collected.length > 0) {
      const counts = new Map<string, number>()
      for (const name of collected) {
        counts.set(name, (counts.get(name) ?? 0) + 1)
      }
      const summary = Array.from(counts.entries())
        .map(([name, count]) => (count > 1 ? `${name}x${count}` : name))
        .join('、')
      addLog(`工坊自动收取了：${summary}。`)
    }
    if (readyNames.length > 0) {
      const counts = new Map<string, number>()
      for (const name of readyNames) {
        counts.set(name, (counts.get(name) ?? 0) + 1)
      }
      const summary = Array.from(counts.entries())
        .map(([name, count]) => (count > 1 ? `${name}x${count}` : name))
        .join('、')
      addLog(`加工完成：${summary}，去工坊收取吧。`)
    }
  }

  // === 序列化 ===

  const serialize = () => {
    return { machines: machines.value }
  }

  const deserialize = (data: ReturnType<typeof serialize>) => {
    machines.value = data.machines ?? []
  }

  return {
    machines,
    machineCount,
    MAX_MACHINES,
    canCraft,
    consumeCraftMaterials,
    craftMachine,
    craftSprinkler,
    craftFertilizer,
    craftBait,
    craftTackle,
    craftTapper,
    craftCrabPot,
    craftBomb,
    startProcessing,
    collectProduct,
    cancelProcessing,
    removeMachine,
    getAvailableRecipes,
    dailyUpdate,
    serialize,
    deserialize
  }
})
