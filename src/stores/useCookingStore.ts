import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { RecipeDef } from '@/types'
import { getRecipeById } from '@/data'
import { useInventoryStore } from './useInventoryStore'
import { usePlayerStore } from './usePlayerStore'
import { useSkillStore } from './useSkillStore'
import { useAchievementStore } from './useAchievementStore'
import { useWalletStore } from './useWalletStore'
import { useHomeStore } from './useHomeStore'
import { getCombinedItemCount, removeCombinedItem } from '@/composables/useCombinedInventory'

export const useCookingStore = defineStore('cooking', () => {
  const inventoryStore = useInventoryStore()
  const playerStore = usePlayerStore()
  const skillStore = useSkillStore()

  /** 已解锁的食谱ID列表 */
  const unlockedRecipes = ref<string[]>([
    'stir_fried_cabbage',
    'honey_tea',
    'ginger_soup',
    'bamboo_shoot_stir_fry',
    'dried_persimmon',
    'sesame_paste',
    'corn_pancake',
    'scrambled_egg_rice',
    'stir_fried_potato',
    'boiled_egg',
    'congee',
    'roasted_sweet_potato',
    'vegetable_soup',
    'chive_egg_stir_fry',
    'peanut_candy',
    'silkie_egg_soup'
  ])

  /** 当天生效的食物增益 */
  const activeBuff = ref<RecipeDef['effect']['buff'] | null>(null)

  /** 已解锁的食谱定义 */
  const recipes = computed(() => unlockedRecipes.value.map(id => getRecipeById(id)).filter((r): r is RecipeDef => r !== undefined))

  /** 检查是否有足够材料 */
  const canCook = (recipeId: string): boolean => {
    const recipe = getRecipeById(recipeId)
    if (!recipe) return false
    if (!unlockedRecipes.value.includes(recipeId)) return false
    // 检查技能等级门槛
    if (recipe.requiredSkill) {
      const skill = skillStore.getSkill(recipe.requiredSkill.type)
      if (skill.level < recipe.requiredSkill.level) return false
    }
    return recipe.ingredients.every(ing => getCombinedItemCount(ing.itemId) >= ing.quantity)
  }

  /** 烹饪 */
  const cook = (recipeId: string): { success: boolean; message: string } => {
    const recipe = getRecipeById(recipeId)
    if (!recipe) return { success: false, message: '食谱不存在。' }
    if (!unlockedRecipes.value.includes(recipeId)) return { success: false, message: '尚未解锁此食谱。' }

    // 检查材料
    for (const ing of recipe.ingredients) {
      if (getCombinedItemCount(ing.itemId) < ing.quantity) {
        return { success: false, message: '材料不足。' }
      }
    }

    // 消耗材料
    for (const ing of recipe.ingredients) {
      removeCombinedItem(ing.itemId, ing.quantity)
    }

    // 添加食物到背包
    inventoryStore.addItem(`food_${recipe.id}`)
    useAchievementStore().recordRecipeCooked()
    return { success: true, message: `烹饪了${recipe.name}！` }
  }

  /** 食用烹饪品 */
  const eat = (recipeId: string): { success: boolean; message: string } => {
    const foodItemId = `food_${recipeId}`
    if (!inventoryStore.removeItem(foodItemId)) {
      return { success: false, message: '背包中没有这个食物。' }
    }

    const recipe = getRecipeById(recipeId)
    if (!recipe) return { success: false, message: '食谱数据丢失。' }

    // 炼金师专精：食物恢复+50%
    const walletStore = useWalletStore()
    const homeStore = useHomeStore()
    const chefBonus = 1 + walletStore.getCookingRestoreBonus()
    const alchemistBonus = skillStore.getSkill('foraging').perk10 === 'alchemist' ? 1.5 : 1.0
    const kitchenBonus = homeStore.getKitchenBonus()
    const staminaRestore = Math.floor(recipe.effect.staminaRestore * alchemistBonus * chefBonus * kitchenBonus)
    playerStore.restoreStamina(staminaRestore)
    let msg = `食用了${recipe.name}，恢复${staminaRestore}体力`

    if (recipe.effect.healthRestore) {
      const healthRestore = Math.floor(recipe.effect.healthRestore * alchemistBonus * chefBonus * kitchenBonus)
      playerStore.restoreHealth(healthRestore)
      msg += `、${healthRestore}生命值`
    }
    msg += '。'

    if (recipe.effect.buff) {
      activeBuff.value = { ...recipe.effect.buff }
      msg += ` ${recipe.effect.buff.description}`
      // 「体力全恢复」类buff：立即将体力回满
      if (recipe.effect.buff.type === 'stamina') {
        playerStore.restoreStamina(playerStore.maxStamina)
      }
    }

    return { success: true, message: msg }
  }

  /** 解锁食谱 */
  const unlockRecipe = (recipeId: string): boolean => {
    if (unlockedRecipes.value.includes(recipeId)) return false
    const recipe = getRecipeById(recipeId)
    if (!recipe) return false
    unlockedRecipes.value.push(recipeId)
    return true
  }

  /** 每日重置增益 */
  const dailyReset = () => {
    activeBuff.value = null
  }

  const serialize = () => {
    return { unlockedRecipes: unlockedRecipes.value, activeBuff: activeBuff.value }
  }

  const deserialize = (data: ReturnType<typeof serialize>) => {
    unlockedRecipes.value = data.unlockedRecipes
    activeBuff.value = data.activeBuff
  }

  return {
    unlockedRecipes,
    activeBuff,
    recipes,
    canCook,
    cook,
    eat,
    unlockRecipe,
    dailyReset,
    serialize,
    deserialize
  }
})
