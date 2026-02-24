<template>
  <div>
    <h3 class="text-accent text-sm mb-3">灶台</h3>

    <!-- 已解锁食谱 -->
    <div class="space-y-2 mb-4">
      <div
        v-for="recipe in cookingStore.recipes"
        :key="recipe.id"
        class="game-panel flex flex-col md:flex-row md:items-center md:justify-between space-y-2"
      >
        <div>
          <p class="text-sm">{{ recipe.name }}</p>
          <p class="text-xs text-muted">
            材料：
            <template v-for="(ing, idx) in recipe.ingredients" :key="ing.itemId">
              <span v-if="idx > 0">、</span>
              <span :class="inventoryStore.getItemCount(ing.itemId) >= ing.quantity ? '' : 'text-danger'">
                {{ getItemById(ing.itemId)?.name }} {{ inventoryStore.getItemCount(ing.itemId) }}/{{ ing.quantity }}
              </span>
            </template>
          </p>
          <p class="text-xs text-success">
            恢复{{ recipe.effect.staminaRestore }}体力
            <span v-if="recipe.effect.buff" class="text-water ml-1">{{ recipe.effect.buff.description }}</span>
          </p>
        </div>
        <Button class="shrink-0" :icon="UtensilsCrossed" :disabled="!cookingStore.canCook(recipe.id)" @click="handleCook(recipe.id)">
          烹饪
        </Button>
      </div>
      <p v-if="cookingStore.recipes.length === 0" class="text-xs text-muted">还没有食谱。</p>
    </div>

    <!-- 当前增益 -->
    <div v-if="cookingStore.activeBuff" class="game-panel">
      <p class="text-xs text-water">
        <Zap :size="14" class="inline" />
        当前增益：{{ cookingStore.activeBuff.description }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { UtensilsCrossed, Zap } from 'lucide-vue-next'
  import { useCookingStore, useInventoryStore, useGameStore } from '@/stores'
  import { getItemById } from '@/data'
  import { ACTION_TIME_COSTS } from '@/data/timeConstants'
  import { sfxClick } from '@/composables/useAudio'
  import { addLog } from '@/composables/useGameLog'
  import { handleEndDay } from '@/composables/useEndDay'
  import Button from '@/components/game/Button.vue'

  const cookingStore = useCookingStore()
  const inventoryStore = useInventoryStore()
  const gameStore = useGameStore()

  const handleCook = (recipeId: string) => {
    if (gameStore.isPastBedtime) {
      addLog('太晚了，没力气做饭了。')
      void handleEndDay()
      return
    }
    const result = cookingStore.cook(recipeId)
    sfxClick()
    addLog(result.message)
    const tr = gameStore.advanceTime(ACTION_TIME_COSTS.cook)
    if (tr.message) addLog(tr.message)
    if (tr.passedOut) void handleEndDay()
  }
</script>
