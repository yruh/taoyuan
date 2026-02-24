<template>
  <div>
    <h3 class="text-accent text-sm mb-3">
      <TreePine :size="14" class="inline" />
      竹林采集
    </h3>

    <!-- 采集操作 -->
    <div class="border border-accent/20 rounded-xs p-3 mb-4">
      <div class="flex items-center justify-between mb-2">
        <p class="text-sm text-accent">采集</p>
        <span class="text-xs text-muted">消耗 {{ forageCost }} 体力</span>
      </div>
      <p class="text-xs text-muted mb-2">使用斧头在竹林中搜寻各类物资。</p>
      <div
        class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-1.5 cursor-pointer hover:bg-accent/5"
        @click="handleForage"
      >
        <span class="text-xs">采集一次</span>
        <span class="text-xs text-muted">{{ playerStore.stamina }}/{{ playerStore.maxStamina }} 体力</span>
      </div>
      <!-- 天气/加成提示 -->
      <div class="flex flex-wrap space-x-3 mt-2">
        <span v-if="weatherMod !== 1" class="text-[10px]" :class="weatherMod > 1 ? 'text-success' : 'text-danger'">
          {{ weatherModLabel }}
        </span>
        <span v-if="hasHerbalistPerk" class="text-[10px] text-success">药师：概率+20%</span>
        <span v-if="hasLumberjackPerk" class="text-[10px] text-success">
          {{ foragingSkill.perk10 === 'forester' ? '伐木工：必得木材' : '樵夫：25%额外木材' }}
        </span>
        <span v-if="foragingSkill.perk10 === 'tracker'" class="text-[10px] text-success">追踪者：额外+1物品</span>
        <span v-if="cookingLuckBuff > 0" class="text-[10px] text-success">料理运气+{{ cookingLuckBuff }}%</span>
        <span v-if="isForestFarm" class="text-[10px] text-success">森林农场：经验×1.25</span>
      </div>
    </div>

    <!-- 采集结果 -->
    <div class="border border-accent/20 rounded-xs p-3 mb-4">
      <p class="text-sm text-accent mb-2">
        <Search :size="14" class="inline" />
        采集结果
      </p>
      <div v-if="lastResults.length > 0" class="flex flex-col space-y-1">
        <div v-for="(r, i) in lastResults" :key="i" class="flex items-center border border-accent/10 rounded-xs px-3 py-1.5">
          <span class="text-xs">{{ r }}</span>
        </div>
      </div>
      <div v-else class="flex flex-col items-center justify-center py-6 text-muted">
        <Search :size="32" class="mb-2" />
        <p class="text-xs">还没有采集过，去试试吧。</p>
      </div>
    </div>

    <!-- 当季采集物 -->
    <div class="border border-accent/20 rounded-xs p-3">
      <div class="flex items-center justify-between mb-2">
        <p class="text-sm text-accent">当季采集物</p>
        <span class="text-xs text-muted">{{ SEASON_NAMES[gameStore.season] }}季</span>
      </div>
      <div class="flex flex-col space-y-1">
        <div
          v-for="item in currentForage"
          :key="item.itemId"
          class="flex items-center justify-between border border-accent/10 rounded-xs px-3 py-1.5"
        >
          <div>
            <span class="text-xs">{{ item.name }}</span>
            <span class="text-[10px] text-muted ml-2">+{{ item.expReward }}经验</span>
          </div>
          <span class="text-xs text-muted">{{ Math.round(item.chance * 100) }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { TreePine, Search } from 'lucide-vue-next'
  import { useAchievementStore } from '@/stores/useAchievementStore'
  import { useCookingStore } from '@/stores/useCookingStore'
  import { useGameStore, SEASON_NAMES } from '@/stores/useGameStore'
  import { useInventoryStore } from '@/stores/useInventoryStore'
  import { usePlayerStore } from '@/stores/usePlayerStore'
  import { useQuestStore } from '@/stores/useQuestStore'
  import { useSkillStore } from '@/stores/useSkillStore'
  import { useWalletStore } from '@/stores/useWalletStore'
  import type { Quality } from '@/types'
  import { getForageItems, getItemById } from '@/data'
  import { WEATHER_FORAGE_MODIFIER } from '@/data/forage'
  import { ACTION_TIME_COSTS } from '@/data/timeConstants'
  import { sfxForage } from '@/composables/useAudio'
  import { addLog } from '@/composables/useGameLog'
  import { handleEndDay } from '@/composables/useEndDay'

  const playerStore = usePlayerStore()
  const inventoryStore = useInventoryStore()
  const skillStore = useSkillStore()
  const gameStore = useGameStore()
  const achievementStore = useAchievementStore()
  const cookingStore = useCookingStore()
  const walletStore = useWalletStore()

  const lastResults = ref<string[]>([])

  const currentForage = computed(() => getForageItems(gameStore.season))
  const foragingSkill = computed(() => skillStore.getSkill('foraging'))

  const forageCost = computed(() =>
    Math.max(1, Math.floor(5 * inventoryStore.getToolStaminaMultiplier('axe') * (1 - skillStore.getStaminaReduction('foraging'))))
  )

  const weatherMod = computed(() => WEATHER_FORAGE_MODIFIER[gameStore.weather] ?? 1)

  const WEATHER_MOD_LABELS: Record<string, string> = {
    rainy: '雨天：概率+15%',
    stormy: '雷雨：概率-20%',
    snowy: '雪天：概率-10%',
    windy: '大风：概率+10%',
    green_rain: '绿雨：概率+50%'
  }

  const weatherModLabel = computed(() => WEATHER_MOD_LABELS[gameStore.weather] ?? '')

  const hasHerbalistPerk = computed(() => foragingSkill.value.perk5 === 'herbalist')
  const hasLumberjackPerk = computed(() => foragingSkill.value.perk5 === 'lumberjack' || foragingSkill.value.perk10 === 'forester')
  const isForestFarm = computed(() => gameStore.farmMapType === 'forest')
  const cookingLuckBuff = computed(() => (cookingStore.activeBuff?.type === 'luck' ? cookingStore.activeBuff.value : 0))

  const handleForage = () => {
    if (gameStore.isPastBedtime) {
      addLog('太晚了，没法采集了。')
      void handleEndDay()
      return
    }

    if (!inventoryStore.isToolAvailable('axe')) {
      addLog('斧头正在升级中，无法采集。')
      return
    }

    const cost = forageCost.value
    if (!playerStore.consumeStamina(cost)) {
      addLog('体力不足，无法采集。')
      return
    }

    sfxForage()

    const items = currentForage.value
    const gathered: string[] = []
    const skill = foragingSkill.value
    const forestFarm = isForestFarm.value
    const forestXpBonus = forestFarm ? 1.25 : 1.0

    for (const item of items) {
      const herbalistBonus = skill.perk5 === 'herbalist' ? 1.2 : 1.0
      const cookingBuff = cookingStore.activeBuff?.type === 'luck' ? cookingStore.activeBuff.value / 100 : 0
      const adjustedChance = Math.min(
        1,
        item.chance * (WEATHER_FORAGE_MODIFIER[gameStore.weather] ?? 1) * herbalistBonus * (1 + cookingBuff)
      )
      if (Math.random() < adjustedChance) {
        const forageAllSkillsBuff = cookingStore.activeBuff?.type === 'all_skills' ? cookingStore.activeBuff.value : 0
        let quality = skillStore.rollForageQuality(forageAllSkillsBuff)
        const walletBoost = walletStore.getForageQualityBoost()
        if (walletBoost > 0) {
          const qualityOrder: Quality[] = ['normal', 'fine', 'excellent', 'supreme']
          const idx = qualityOrder.indexOf(quality)
          const newIdx = Math.min(idx + walletBoost, qualityOrder.length - 1)
          quality = qualityOrder[newIdx]!
        }
        const qty = forestFarm && Math.random() < 0.2 ? 2 : 1
        inventoryStore.addItem(item.itemId, qty, quality)
        achievementStore.discoverItem(item.itemId)
        useQuestStore().onItemObtained(item.itemId, qty)
        const itemDef = getItemById(item.itemId)
        const name = itemDef?.name ?? item.itemId
        gathered.push(qty > 1 ? `${name}×${qty}` : name)
        skillStore.addExp('foraging', Math.floor(item.expReward * forestXpBonus))
      }
    }

    if (skill.perk10 === 'forester') {
      inventoryStore.addItem('wood')
      gathered.push('木材')
    } else if (skill.perk5 === 'lumberjack' && Math.random() < 0.25) {
      inventoryStore.addItem('wood')
      gathered.push('木材')
    }

    if (skill.perk10 === 'tracker' && items.length > 0) {
      const randomItem = items[Math.floor(Math.random() * items.length)]!
      const trackerAllSkillsBuff = cookingStore.activeBuff?.type === 'all_skills' ? cookingStore.activeBuff.value : 0
      const quality = skillStore.rollForageQuality(trackerAllSkillsBuff)
      inventoryStore.addItem(randomItem.itemId, 1, quality)
      achievementStore.discoverItem(randomItem.itemId)
      const itemDef = getItemById(randomItem.itemId)
      const name = itemDef?.name ?? randomItem.itemId
      gathered.push(name)
    }

    if (gathered.length === 0) {
      gathered.push('什么也没找到……')
    }

    lastResults.value = gathered.map(g => (g === '什么也没找到……' ? g : `获得了${g}`))
    const { leveledUp, newLevel } = skillStore.addExp('foraging', 0)
    let msg = `在竹林中采集，获得了${gathered.filter(g => g !== '什么也没找到……').join('、') || '空气'}。(-${cost}体力)`
    if (leveledUp) msg += ` 采集提升到${newLevel}级！`
    addLog(msg)

    const tr = gameStore.advanceTime(ACTION_TIME_COSTS.forage)
    if (tr.message) addLog(tr.message)
    if (tr.passedOut) void handleEndDay()
  }
</script>
