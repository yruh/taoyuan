<template>
  <div>
    <div class="flex items-center justify-between mb-1">
      <div class="flex items-center space-x-1.5 text-sm text-accent">
        <Swords :size="14" />
        <span>冒险家公会</span>
      </div>
      <span class="text-xs text-muted">NPC: 云飞</span>
    </div>

    <!-- 标签页 -->
    <div class="flex space-x-1 mb-3">
      <Button class="flex-1 justify-center" :class="{ '!bg-accent !text-bg': tab === 'goals' }" @click="tab = 'goals'">讨伐任务</Button>
      <Button class="flex-1 justify-center" :class="{ '!bg-accent !text-bg': tab === 'shop' }" @click="tab = 'shop'">公会商店</Button>
      <Button class="flex-1 justify-center" :class="{ '!bg-accent !text-bg': tab === 'bestiary' }" @click="tab = 'bestiary'">
        怪物图鉴
      </Button>
    </div>

    <!-- 讨伐任务 -->
    <div v-if="tab === 'goals'">
      <!-- 空状态 -->
      <div v-if="!hasAnyKills" class="flex flex-col items-center justify-center py-8 space-y-3 mb-3">
        <Swords :size="48" class="text-accent/30" />
        <p class="text-sm text-muted">尚未讨伐任何怪物</p>
        <p class="text-xs text-muted/60 text-center max-w-60">前往矿洞击败怪物，完成讨伐目标可领取奖励</p>
      </div>

      <!-- 区域筛选 -->
      <div class="grid grid-cols-4 md:grid-cols-none md:flex gap-1 md:space-x-1 mb-2 flex-wrap">
        <button
          v-for="z in ZONE_FILTERS"
          :key="z.key"
          class="btn text-xs"
          :class="{ '!bg-accent !text-bg': goalZone === z.key }"
          @click="goalZone = z.key"
        >
          {{ z.label }}
        </button>
      </div>

      <div class="flex flex-col space-y-2 max-h-72 overflow-y-auto">
        <div
          v-for="goal in filteredGoals"
          :key="goal.monsterId"
          class="border rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5"
          :class="isGoalClaimed(goal.monsterId) ? 'border-success/30' : 'border-accent/20'"
          @click="selectedGoal = goal"
        >
          <div class="flex items-center justify-between mb-1">
            <div class="flex items-center space-x-1.5">
              <CircleCheck v-if="isGoalClaimed(goal.monsterId)" :size="12" class="text-success shrink-0" />
              <Circle
                v-else
                :size="12"
                class="shrink-0"
                :class="getKillCount(goal.monsterId) >= goal.killTarget ? 'text-accent' : 'text-muted'"
              />
              <span class="text-xs" :class="isGoalClaimed(goal.monsterId) ? 'text-success' : 'text-text'">{{ goal.monsterName }}</span>
            </div>
            <span class="text-xs text-muted">{{ getKillCount(goal.monsterId) }}/{{ goal.killTarget }}</span>
          </div>
          <!-- 进度条 -->
          <div class="h-1 bg-bg rounded-xs overflow-hidden">
            <div
              class="h-full transition-all"
              :class="getKillCount(goal.monsterId) >= goal.killTarget ? 'bg-success' : 'bg-accent/60'"
              :style="{ width: Math.min(100, (getKillCount(goal.monsterId) / goal.killTarget) * 100) + '%' }"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 讨伐目标详情弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="selectedGoal"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="selectedGoal = null"
      >
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="selectedGoal = null">
            <X :size="14" />
          </button>

          <p class="text-sm mb-2" :class="isGoalClaimed(selectedGoal.monsterId) ? 'text-success' : 'text-accent'">
            {{ selectedGoal.monsterName }}
          </p>

          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted">{{ selectedGoal.description }}</p>
          </div>

          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted">进度</span>
              <span class="text-xs">{{ getKillCount(selectedGoal.monsterId) }}/{{ selectedGoal.killTarget }}</span>
            </div>
            <div class="h-1.5 bg-bg rounded-xs overflow-hidden mt-1.5">
              <div
                class="h-full transition-all"
                :class="getKillCount(selectedGoal.monsterId) >= selectedGoal.killTarget ? 'bg-success' : 'bg-accent/60'"
                :style="{ width: Math.min(100, (getKillCount(selectedGoal.monsterId) / selectedGoal.killTarget) * 100) + '%' }"
              />
            </div>
          </div>

          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted mb-1">奖励</p>
            <p class="text-xs text-accent">
              {{ selectedGoal.reward.money }}文{{
                selectedGoal.reward.items
                  ? ' + ' + selectedGoal.reward.items.map(i => `${getDropName(i.itemId)}×${i.quantity}`).join('、')
                  : ''
              }}
            </p>
          </div>

          <div v-if="isGoalClaimed(selectedGoal.monsterId)" class="border border-success/30 rounded-xs p-2">
            <div class="flex items-center space-x-1">
              <CircleCheck :size="12" class="text-success" />
              <span class="text-xs text-success">已完成</span>
            </div>
          </div>
          <button
            v-else-if="getKillCount(selectedGoal.monsterId) >= selectedGoal.killTarget"
            class="btn text-xs w-full justify-center !bg-accent !text-bg"
            @click="handleClaimGoal(selectedGoal.monsterId)"
          >
            <Gift :size="12" />
            领取奖励
          </button>
        </div>
      </div>
    </Transition>

    <!-- 公会商店 -->
    <div v-if="tab === 'shop'" class="flex flex-col space-y-2">
      <div
        v-for="item in GUILD_SHOP_ITEMS"
        :key="item.itemId"
        class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5"
        @click="shopModalItem = item"
      >
        <div>
          <p class="text-sm" :class="guildStore.isShopItemUnlocked(item.itemId) ? '' : 'text-muted'">{{ item.name }}</p>
          <p class="text-xs text-muted">{{ item.description }}</p>
          <p v-if="item.unlockGoalCount && !guildStore.isShopItemUnlocked(item.itemId)" class="text-xs text-danger mt-0.5">
            <Lock :size="10" class="inline" />
            完成{{ item.unlockGoalCount }}个讨伐目标解锁
          </p>
        </div>
        <span class="text-xs text-accent whitespace-nowrap ml-2">{{ item.price }}文</span>
      </div>
    </div>

    <!-- 商店购买弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="shopModalItem"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-40 p-4"
        @click.self="shopModalItem = null"
      >
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="shopModalItem = null">
            <X :size="14" />
          </button>
          <p class="text-sm text-accent mb-2">{{ shopModalItem.name }}</p>

          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted">{{ shopModalItem.description }}</p>
          </div>

          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted">价格</span>
              <span class="text-xs text-accent">{{ shopModalItem.price }}文</span>
            </div>
            <div class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">持有金币</span>
              <span class="text-xs" :class="playerStore.money >= shopModalItem.price ? 'text-text' : 'text-danger'">
                {{ playerStore.money }}文
              </span>
            </div>
          </div>

          <p v-if="shopModalItem.unlockGoalCount && !guildStore.isShopItemUnlocked(shopModalItem.itemId)" class="text-xs text-danger mb-2">
            <Lock :size="10" class="inline" />
            完成{{ shopModalItem.unlockGoalCount }}个讨伐目标解锁
          </p>
          <button
            v-else
            class="btn text-xs w-full justify-center"
            :class="playerStore.money >= shopModalItem.price ? '!bg-accent !text-bg' : 'opacity-50 cursor-not-allowed'"
            :disabled="playerStore.money < shopModalItem.price"
            @click="handleBuyShopItem(shopModalItem.itemId)"
          >
            <ShoppingCart :size="12" />
            购买 {{ shopModalItem.price }}文
          </button>
        </div>
      </div>
    </Transition>

    <!-- 怪物图鉴 -->
    <div v-if="tab === 'bestiary'">
      <div v-if="guildStore.encounteredMonsters.length === 0" class="flex flex-col items-center justify-center py-8 space-y-3">
        <BookOpen :size="48" class="text-accent/30" />
        <p class="text-sm text-muted">图鉴尚无记录</p>
        <p class="text-xs text-muted/60 text-center max-w-60">在矿洞中遭遇怪物后，它们的信息将记录在此</p>
      </div>
      <template v-else>
        <p class="text-xs text-muted mb-2">已发现 {{ guildStore.encounteredMonsters.length }}/{{ allMonsters.length }}</p>
        <div class="grid grid-cols-3 md:grid-cols-5 gap-1 max-h-72 overflow-y-auto">
          <div
            v-for="monster in allMonsters"
            :key="monster.id"
            class="border rounded-xs p-1.5 text-xs text-center transition-colors truncate"
            :class="
              guildStore.isEncountered(monster.id)
                ? 'border-accent/20 cursor-pointer hover:bg-accent/5 text-text'
                : 'border-accent/10 text-muted/30'
            "
            @click="guildStore.isEncountered(monster.id) && (selectedMonster = monster)"
          >
            <template v-if="guildStore.isEncountered(monster.id)">{{ monster.name }}</template>
            <Lock v-else :size="12" class="mx-auto text-muted/30" />
          </div>
        </div>
      </template>
    </div>

    <!-- 怪物详情弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="selectedMonster"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="selectedMonster = null"
      >
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="selectedMonster = null">
            <X :size="14" />
          </button>

          <p class="text-sm text-accent mb-2">{{ selectedMonster.name }}</p>

          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted">HP</span>
              <span class="text-xs text-danger">{{ selectedMonster.hp }}</span>
            </div>
            <div class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">ATK</span>
              <span class="text-xs text-accent">{{ selectedMonster.attack }}</span>
            </div>
            <div class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">DEF</span>
              <span class="text-xs">{{ selectedMonster.defense }}</span>
            </div>
            <div class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">击杀数</span>
              <span class="text-xs">{{ guildStore.getKillCount(selectedMonster.id) }}</span>
            </div>
          </div>

          <div v-if="selectedMonster.drops.length > 0" class="border border-accent/10 rounded-xs p-2">
            <p class="text-xs text-muted mb-1">掉落物</p>
            <div v-for="drop in selectedMonster.drops" :key="drop.itemId" class="flex items-center justify-between mt-0.5">
              <span class="text-xs">{{ getDropName(drop.itemId) }}</span>
              <span class="text-xs text-muted">{{ Math.round(drop.chance * 100) }}%</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 底部统计 -->
    <div class="mt-3 border border-accent/20 rounded-xs p-2">
      <div class="flex items-center space-x-2 text-xs mb-1.5">
        <span class="text-muted shrink-0">讨伐进度</span>
        <div class="flex-1 h-1 bg-bg rounded-xs border border-accent/10">
          <div
            class="h-full bg-accent rounded-xs transition-all"
            :style="{ width: Math.round((guildStore.completedGoalCount / MONSTER_GOALS.length) * 100) + '%' }"
          />
        </div>
        <span class="text-accent whitespace-nowrap">{{ Math.round((guildStore.completedGoalCount / MONSTER_GOALS.length) * 100) }}%</span>
      </div>
      <div class="grid grid-cols-2 gap-x-3 gap-y-0.5">
        <div class="flex items-center justify-between">
          <span class="text-xs text-muted">已完成讨伐</span>
          <span class="text-xs">{{ guildStore.completedGoalCount }}/{{ MONSTER_GOALS.length }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-xs text-muted">已领取奖励</span>
          <span class="text-xs">{{ guildStore.claimedGoals.length }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-xs text-muted">遭遇怪物</span>
          <span class="text-xs">{{ guildStore.encounteredMonsters.length }}/{{ allMonsters.length }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { Swords, Gift, CircleCheck, Circle, Lock, ShoppingCart, BookOpen, X } from 'lucide-vue-next'
  import Button from '@/components/game/Button.vue'
  import { useGuildStore } from '@/stores/useGuildStore'
  import { usePlayerStore } from '@/stores/usePlayerStore'
  import { MONSTER_GOALS, GUILD_SHOP_ITEMS } from '@/data/guild'
  import { MONSTERS, BOSS_MONSTERS } from '@/data/mine'
  import type { MonsterDef, GuildShopItemDef, MonsterGoalDef } from '@/types'
  import { getItemById } from '@/data/items'

  type Tab = 'goals' | 'shop' | 'bestiary'

  const guildStore = useGuildStore()
  const playerStore = usePlayerStore()

  const tab = ref<Tab>('goals')
  const goalZone = ref('all')
  const shopModalItem = ref<GuildShopItemDef | null>(null)
  const selectedGoal = ref<MonsterGoalDef | null>(null)
  const selectedMonster = ref<MonsterDef | null>(null)

  const handleBuyShopItem = (itemId: string) => {
    guildStore.buyShopItem(itemId)
    shopModalItem.value = null
  }

  const handleClaimGoal = (monsterId: string) => {
    guildStore.claimGoal(monsterId)
    selectedGoal.value = null
  }

  const hasAnyKills = computed(() => Object.values(guildStore.monsterKills).some(v => v > 0))

  const ZONE_FILTERS = [
    { key: 'all', label: '全部' },
    { key: 'shallow', label: '浅层' },
    { key: 'frost', label: '冰霜' },
    { key: 'lava', label: '熔岩' },
    { key: 'crystal', label: '水晶' },
    { key: 'shadow', label: '暗影' },
    { key: 'abyss', label: '深渊' },
    { key: 'boss', label: 'BOSS' },
    { key: 'skull', label: '骷髅矿穴' }
  ]

  const filteredGoals = computed(() => {
    if (goalZone.value === 'all') return MONSTER_GOALS
    return MONSTER_GOALS.filter(g => g.zone === goalZone.value)
  })

  const getKillCount = (monsterId: string): number => {
    return guildStore.getKillCount(monsterId)
  }

  const isGoalClaimed = (monsterId: string): boolean => {
    return guildStore.claimedGoals.includes(monsterId)
  }

  /** 怪物图鉴：合并普通怪+BOSS */
  const allMonsters = computed<MonsterDef[]>(() => {
    const list: MonsterDef[] = []
    for (const m of Object.values(MONSTERS)) {
      list.push(m)
    }
    for (const m of Object.values(BOSS_MONSTERS)) {
      list.push(m)
    }
    return list
  })

  const getDropName = (itemId: string): string => {
    return getItemById(itemId)?.name ?? itemId
  }
</script>
