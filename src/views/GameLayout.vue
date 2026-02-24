<template>
  <div
    v-if="gameStore.isGameStarted"
    class="flex flex-col space-y-2 md:space-y-4 h-screen p-2 md:p-4"
    :class="{ 'py-10': Capacitor.isNativePlatform() }"
  >
    <!-- 状态栏 -->
    <StatusBar @request-sleep="showSleepConfirm = true" />

    <Button class="text-center justify-center !text-sm md:!hidden" :icon="Moon" :icon-size="12" @click.stop="showSleepConfirm = true">
      {{ sleepLabel }}
    </Button>

    <!-- 内容 -->
    <div class="game-panel flex-1 min-h-0 overflow-y-auto">
      <router-view v-slot="{ Component }">
        <Transition name="panel-fade" mode="out-in">
          <component :is="Component" :key="$route.path" />
        </Transition>
      </router-view>
    </div>

    <!-- 移动端地图按钮 -->
    <button class="mobile-map-btn md:!hidden" @click="showMobileMap = true">
      <Map :size="20" />
    </button>
    <button class="mobile-setting-btn md:!hidden" @click="showSettings = true">
      <SettingsIcon :size="20" />
    </button>
    <!-- 虚空箱远程访问按钮 -->
    <button v-if="warehouseStore.hasVoidChest" class="mobile-void-btn" @click="showVoidModal = true">
      <Archive :size="20" />
    </button>

    <SettingsDialog :open="showSettings" @close="showSettings = false" />

    <!-- 移动端地图菜单 -->
    <MobileMapMenu :open="showMobileMap" :current="currentPanel" @close="showMobileMap = false" />

    <!-- 季节事件弹窗 -->
    <Transition name="panel-fade">
      <EventDialog v-if="currentEvent" :event="currentEvent" @close="closeEvent" />
    </Transition>

    <!-- 心事件弹窗 -->
    <Transition name="panel-fade">
      <HeartEventDialog v-if="pendingHeartEvent" :event="pendingHeartEvent" @close="closeHeartEvent" />
    </Transition>

    <!-- 互动节日 -->
    <Transition name="panel-fade">
      <div v-if="currentFestival" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <FishingContestView v-if="currentFestival === 'fishing_contest'" @complete="closeFestival" />
        <HarvestFairView v-if="currentFestival === 'harvest_fair'" @complete="closeFestival" />
        <DragonBoatView v-if="currentFestival === 'dragon_boat'" @complete="closeFestival" />
        <LanternRiddleView v-if="currentFestival === 'lantern_riddle'" @complete="closeFestival" />
        <PotThrowingView v-if="currentFestival === 'pot_throwing'" @complete="closeFestival" />
        <DumplingMakingView v-if="currentFestival === 'dumpling_making'" @complete="closeFestival" />
        <FireworkShowView v-if="currentFestival === 'firework_show'" @complete="closeFestival" />
        <TeaContestView v-if="currentFestival === 'tea_contest'" @complete="closeFestival" />
        <KiteFlyingView v-if="currentFestival === 'kite_flying'" @complete="closeFestival" />
      </div>
    </Transition>

    <!-- 技能专精选择弹窗 -->
    <Transition name="panel-fade">
      <PerkSelectDialog v-if="pendingPerk" :skill-type="pendingPerk.skillType" :level="pendingPerk.level" @select="handlePerkSelect" />
    </Transition>

    <!-- 宠物领养弹窗 -->
    <Transition name="panel-fade">
      <div v-if="pendingPetAdoption" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div class="game-panel max-w-xs w-full text-center">
          <p class="text-accent text-sm mb-3">—— 小动物来访 ——</p>
          <p class="text-xs leading-relaxed mb-3">一只小动物在你家门口徘徊，看起来很想有个家。你要收养它吗？</p>
          <div class="flex space-x-3 justify-center mb-3">
            <Button :class="petChoice === 'cat' ? '!bg-accent !text-bg' : ''" @click="petChoice = 'cat'">猫</Button>
            <Button :class="petChoice === 'dog' ? '!bg-accent !text-bg' : ''" @click="petChoice = 'dog'">狗</Button>
          </div>
          <div v-if="petChoice" class="mb-3">
            <p class="text-xs text-muted mb-1">给它取个名字：</p>
            <input
              v-model="petNameInput"
              class="w-full bg-bg border border-accent/30 rounded-xs px-2 py-1 text-xs text-text"
              :placeholder="petChoice === 'cat' ? '小花' : '旺财'"
              maxlength="8"
            />
          </div>
          <Button :disabled="!petChoice" @click="confirmPetAdoption">领养</Button>
        </div>
      </div>
    </Transition>

    <!-- 子女提议弹窗 -->
    <Transition name="panel-fade">
      <div v-if="childProposalVisible" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div class="game-panel max-w-xs w-full text-center">
          <p class="text-accent text-sm mb-3">—— 家庭提议 ——</p>
          <p class="text-xs leading-relaxed mb-4">{{ proposalSpouseName }}轻声说道：「最近我在想，我们是不是该要个孩子了？」</p>
          <div class="flex flex-col space-y-1.5">
            <Button class="w-full justify-center" @click="handleChildProposalResponse('accept')">「我也这么想。」</Button>
            <Button class="w-full justify-center" @click="handleChildProposalResponse('wait')">「再等等吧。」</Button>
            <Button class="w-full justify-center text-muted" @click="handleChildProposalResponse('decline')">「现在还不是时候。」</Button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 日结算遮罩 -->
    <Transition name="panel-fade">
      <div v-if="settling" class="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]">
        <p class="text-accent text-lg animate-pulse">结算中...</p>
      </div>
    </Transition>

    <!-- 晨间选项事件弹窗 -->
    <Transition name="panel-fade">
      <div v-if="pendingFarmEvent" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div class="game-panel max-w-xs w-full text-center">
          <p class="text-xs leading-relaxed mb-4">{{ pendingFarmEvent.message }}</p>
          <div class="flex flex-col space-y-1.5">
            <Button v-for="(c, i) in pendingFarmEvent.choices" :key="i" class="w-full justify-center" @click="handleFarmEventChoice(c)">
              {{ c.label }}
            </Button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 虚空箱远程存取弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="showVoidModal"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="showVoidModal = false"
      >
        <div class="game-panel max-w-sm w-full">
          <div class="flex items-center justify-between mb-2">
            <p class="text-sm text-accent">
              <Archive :size="14" class="inline" />
              虚空箱
            </p>
            <Button class="py-0 px-1" :icon="X" :icon-size="12" @click="showVoidModal = false" />
          </div>

          <!-- 虚空箱列表 -->
          <div class="flex flex-col space-y-1.5">
            <div v-for="vc in voidChests" :key="vc.id" class="border border-accent/10 rounded-xs p-2">
              <div class="flex items-center justify-between mb-1 cursor-pointer" @click="toggleVoidChest(vc.id)">
                <div class="flex items-center space-x-1.5">
                  <span class="text-xs text-quality-supreme">{{ vc.label }}</span>
                  <span v-if="vc.voidRole === 'input'" class="text-[10px] px-1 border border-accent/30 rounded-xs text-accent">原料箱</span>
                  <span v-if="vc.voidRole === 'output'" class="text-[10px] px-1 border border-accent/30 rounded-xs text-accent">
                    成品箱
                  </span>
                </div>
                <span class="text-[10px] text-muted">{{ vc.items.length }}/{{ voidChestCapacity }}</span>
              </div>

              <!-- 展开的物品列表 -->
              <div v-if="expandedVoidChestId === vc.id">
                <div v-if="vc.items.length > 0" class="flex flex-col space-y-0.5 mb-1.5 max-h-36 overflow-y-auto">
                  <div
                    v-for="(item, idx) in vc.items"
                    :key="idx"
                    class="flex items-center justify-between px-2 py-0.5 border border-accent/5 rounded-xs"
                  >
                    <span class="text-[10px] truncate mr-2" :class="voidQualityClass(item.quality)">
                      {{ getItemName(item.itemId) }}
                      <span v-if="item.quality !== 'normal'" class="text-[10px]">({{ VOID_QUALITY_LABEL[item.quality] }})</span>
                    </span>
                    <div class="flex items-center space-x-1">
                      <span class="text-[10px] text-muted">&times;{{ item.quantity }}</span>
                      <Button class="py-0 px-1 text-[10px]" @click="handleVoidWithdraw(vc.id, item.itemId, item.quality)">取出</Button>
                    </div>
                  </div>
                </div>
                <p v-else class="text-[10px] text-muted text-center py-2">空箱子</p>
                <Button
                  v-if="voidDepositableItems.length > 0"
                  class="w-full text-[10px]"
                  :icon="ArrowDown"
                  :icon-size="10"
                  @click="openVoidDeposit(vc.id)"
                >
                  存入
                </Button>
              </div>
            </div>
          </div>
          <p v-if="voidChests.length === 0" class="text-xs text-muted text-center py-3">没有虚空箱子</p>
        </div>
      </div>
    </Transition>

    <!-- 虚空箱存入弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="showVoidDepositModal && voidDepositChestId"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="showVoidDepositModal = false"
      >
        <div class="game-panel max-w-sm w-full">
          <div class="flex items-center justify-between mb-2">
            <p class="text-sm text-accent">存入物品</p>
            <Button class="py-0 px-1" :icon="X" :icon-size="12" @click="showVoidDepositModal = false" />
          </div>
          <div class="flex flex-col space-y-1 max-h-60 overflow-y-auto">
            <div
              v-for="item in voidDepositableItems"
              :key="item.itemId + item.quality"
              class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-1.5 cursor-pointer hover:bg-accent/5"
              @click="handleVoidDeposit(voidDepositChestId!, item.itemId, item.quality)"
            >
              <span class="text-xs truncate mr-2" :class="voidQualityClass(item.quality)">
                {{ getItemName(item.itemId) }}
                <span v-if="item.quality !== 'normal'" class="text-[10px]">({{ VOID_QUALITY_LABEL[item.quality] }})</span>
              </span>
              <span class="text-xs text-muted">&times;{{ item.quantity }}</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 休息确认 -->
    <Transition name="panel-fade">
      <div v-if="showSleepConfirm" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div class="game-panel max-w-xs w-full text-center">
          <p class="text-accent text-sm mb-3">—— {{ sleepLabel }} ——</p>
          <p class="text-xs leading-relaxed mb-1">{{ sleepSummary }}</p>
          <p v-if="sleepWarning" class="text-danger text-xs mb-1">{{ sleepWarning }}</p>
          <div class="flex space-x-3 justify-center mt-4">
            <Button :icon="X" :icon-size="12" @click="showSleepConfirm = false">再等等</Button>
            <Button class="btn-danger" :icon="Moon" :icon-size="12" @click="confirmSleep">{{ sleepLabel }}</Button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useAnimalStore } from '@/stores/useAnimalStore'
  import { useGameStore } from '@/stores/useGameStore'
  import { useInventoryStore } from '@/stores/useInventoryStore'
  import { useNpcStore } from '@/stores/useNpcStore'
  import { usePlayerStore } from '@/stores/usePlayerStore'
  import { useSaveStore } from '@/stores/useSaveStore'
  import { useWarehouseStore } from '@/stores/useWarehouseStore'
  import { useDialogs } from '@/composables/useDialogs'
  import type { MorningChoiceEvent } from '@/data/farmEvents'
  import { handleEndDay, isSettling } from '@/composables/useEndDay'
  import { addLog } from '@/composables/useGameLog'
  import { getNpcById, getItemById } from '@/data'
  import { CHEST_DEFS } from '@/data/items'
  import { useGameClock } from '@/composables/useGameClock'
  import { useAudio } from '@/composables/useAudio'
  import type { Quality } from '@/types'
  import { Moon, X, Map, Settings as SettingsIcon, Archive, ArrowDown } from 'lucide-vue-next'
  import Button from '@/components/game/Button.vue'
  import MobileMapMenu from '@/components/game/MobileMapMenu.vue'
  import StatusBar from '@/components/game/StatusBar.vue'
  import EventDialog from '@/components/game/EventDialog.vue'
  import HeartEventDialog from '@/components/game/HeartEventDialog.vue'
  import PerkSelectDialog from '@/components/game/PerkSelectDialog.vue'
  import FishingContestView from '@/components/game/FishingContestView.vue'
  import HarvestFairView from '@/components/game/HarvestFairView.vue'
  import DragonBoatView from '@/components/game/DragonBoatView.vue'
  import LanternRiddleView from '@/components/game/LanternRiddleView.vue'
  import PotThrowingView from '@/components/game/PotThrowingView.vue'
  import DumplingMakingView from '@/components/game/DumplingMakingView.vue'
  import FireworkShowView from '@/components/game/FireworkShowView.vue'
  import TeaContestView from '@/components/game/TeaContestView.vue'
  import KiteFlyingView from '@/components/game/KiteFlyingView.vue'
  import SettingsDialog from '@/components/game/SettingsDialog.vue'
  import { Capacitor } from '@capacitor/core'

  const router = useRouter()
  const route = useRoute()
  const gameStore = useGameStore()
  const playerStore = usePlayerStore()
  const { switchToSeasonalBgm } = useAudio()
  const settling = computed(() => isSettling())

  // 游戏未开始时重定向到主菜单
  if (!gameStore.isGameStarted) {
    void router.replace('/')
  }

  const {
    currentEvent,
    pendingHeartEvent,
    currentFestival,
    pendingPerk,
    pendingPetAdoption,
    childProposalVisible,
    pendingFarmEvent,
    closeEvent,
    closeHeartEvent,
    closeFestival,
    handlePerkSelect,
    closePetAdoption,
    closeChildProposal,
    closeFarmEvent
  } = useDialogs()

  const npcStore = useNpcStore()

  const { startClock, stopClock, pauseClock, resumeClock } = useGameClock()

  /** 移动端地图菜单 */
  const showMobileMap = ref(false)

  /** 休息确认弹窗 */
  const showSleepConfirm = ref(false)

  /** 设置弹窗 */
  const showSettings = ref(false)

  // 实时时钟生命周期
  const saveStore = useSaveStore()
  const handlePageLeave = () => {
    saveStore.syncSave()
  }
  onMounted(() => {
    startClock()
    window.addEventListener('beforeunload', handlePageLeave)
    window.addEventListener('pagehide', handlePageLeave)
  })
  onUnmounted(() => {
    window.removeEventListener('beforeunload', handlePageLeave)
    window.removeEventListener('pagehide', handlePageLeave)
    stopClock()
  })

  // 弹窗打开时自动暂停时钟，全部关闭后恢复
  const isClockBlocked = computed(
    () =>
      !!(
        currentEvent.value ||
        pendingHeartEvent.value ||
        currentFestival.value ||
        pendingPerk.value ||
        pendingPetAdoption.value ||
        childProposalVisible.value ||
        pendingFarmEvent.value ||
        showSleepConfirm.value ||
        settling.value
      )
  )
  watch(isClockBlocked, hasModal => {
    if (hasModal) pauseClock()
    else resumeClock()
  })

  /** 从路由名称获取当前面板标识 */
  const currentPanel = computed(() => {
    return (route.name as string) ?? 'farm'
  })

  const sleepLabel = computed(() => {
    if (gameStore.hour >= 24) return '倒头就睡'
    if (gameStore.hour >= 20) return '回家休息'
    return '休息'
  })

  const sleepSummary = computed(() => {
    if (playerStore.stamina <= 0 || gameStore.hour >= 26) {
      return '你已经精疲力竭……将在原地昏倒。'
    }
    if (gameStore.hour >= 24) {
      return '已经过了午夜，拖着疲惫的身体回家……'
    }
    return '回到家中，安稳入睡。明日又是新的一天。'
  })

  const sleepWarning = computed(() => {
    if (playerStore.stamina <= 0 || gameStore.hour >= 26) {
      return '体力仅恢复50%，并损失10%金币（上限1000文）'
    }
    if (gameStore.hour >= 24) {
      return '体力仅恢复75%'
    }
    return ''
  })

  /** 宠物领养 */
  const petChoice = ref<'cat' | 'dog' | null>(null)
  const petNameInput = ref('')

  const confirmPetAdoption = () => {
    if (!petChoice.value) return
    const animalStore = useAnimalStore()
    const defaultName = petChoice.value === 'cat' ? '小花' : '旺财'
    const name = petNameInput.value.trim() || defaultName
    animalStore.adoptPet(petChoice.value, name)
    closePetAdoption()
    petChoice.value = null
    petNameInput.value = ''
  }

  /** 子女提议回应 */
  const proposalSpouseName = computed(() => {
    const spouse = npcStore.getSpouse()
    if (!spouse) return '配偶'
    return getNpcById(spouse.npcId)?.name ?? '配偶'
  })

  const handleChildProposalResponse = (response: 'accept' | 'decline' | 'wait') => {
    const result = npcStore.respondToChildProposal(response)
    addLog(result.message)
    if (result.friendshipChange !== 0) {
      addLog(`(好感${result.friendshipChange > 0 ? '+' : ''}${result.friendshipChange})`)
    }
    closeChildProposal()
  }

  const inventoryStore = useInventoryStore()
  const warehouseStore = useWarehouseStore()

  const handleFarmEventChoice = (choice: MorningChoiceEvent['choices'][number]) => {
    addLog(choice.result)
    if (choice.effect) {
      switch (choice.effect.type) {
        case 'gainItem':
          inventoryStore.addItem(choice.effect.itemId, choice.effect.qty)
          break
        case 'gainMoney':
          playerStore.earnMoney(choice.effect.amount)
          break
        case 'gainFriendship':
          for (const s of npcStore.npcStates) {
            s.friendship += choice.effect.amount
          }
          break
      }
    }
    closeFarmEvent()
  }

  // === 虚空箱远程访问 ===
  const showVoidModal = ref(false)
  const showVoidDepositModal = ref(false)
  const expandedVoidChestId = ref<string | null>(null)
  const voidDepositChestId = ref<string | null>(null)

  const voidChests = computed(() => warehouseStore.getVoidChests())
  const voidChestCapacity = CHEST_DEFS.void.capacity

  const getItemName = (itemId: string): string => getItemById(itemId)?.name ?? itemId

  const VOID_QUALITY_LABEL: Record<Quality, string> = {
    normal: '普通',
    fine: '优良',
    excellent: '精品',
    supreme: '极品'
  }

  const voidQualityClass = (q: Quality): string => {
    if (q === 'fine') return 'text-quality-fine'
    if (q === 'excellent') return 'text-quality-excellent'
    if (q === 'supreme') return 'text-quality-supreme'
    return ''
  }

  const toggleVoidChest = (chestId: string) => {
    expandedVoidChestId.value = expandedVoidChestId.value === chestId ? null : chestId
  }

  const openVoidDeposit = (chestId: string) => {
    voidDepositChestId.value = chestId
    showVoidDepositModal.value = true
  }

  const voidDepositableItems = computed(() =>
    inventoryStore.items.filter(i => {
      const def = getItemById(i.itemId)
      return def && def.category !== 'seed'
    })
  )

  const handleVoidWithdraw = (chestId: string, itemId: string, quality: Quality) => {
    const chest = warehouseStore.getChest(chestId)
    if (!chest) return
    const slot = chest.items.find(i => i.itemId === itemId && i.quality === quality)
    if (!slot) return
    if (!warehouseStore.withdrawFromChest(chestId, itemId, slot.quantity, quality)) {
      addLog('背包已满，无法取出。')
      return
    }
    addLog(`从虚空箱取出了${getItemName(itemId)}×${slot.quantity}。`)
  }

  const handleVoidDeposit = (chestId: string, itemId: string, quality: Quality) => {
    const slot = inventoryStore.items.find(i => i.itemId === itemId && i.quality === quality)
    if (!slot) return
    const actualQty = warehouseStore.depositToChest(chestId, itemId, slot.quantity, quality)
    if (actualQty <= 0) {
      addLog('虚空箱已满，无法存入。')
      return
    }
    addLog(`存入了${getItemName(itemId)}×${actualQty}到虚空箱。`)
    if (voidDepositableItems.value.length === 0 || warehouseStore.isChestFull(chestId)) {
      showVoidDepositModal.value = false
    }
  }

  const confirmSleep = async () => {
    showSleepConfirm.value = false
    pauseClock()
    await handleEndDay()
    switchToSeasonalBgm()
    if (!isClockBlocked.value) resumeClock()
  }
</script>

<style scoped>
  /* 移动端地图按钮 */
  .mobile-map-btn,
  .mobile-setting-btn {
    position: fixed;
    bottom: calc(calc(0.35rem * 10) + constant(safe-area-inset-bottom, 0px));
    bottom: calc(calc(0.35rem * 10) + env(safe-area-inset-bottom, 0px));
    right: 12px;
    z-index: 40;
    width: 40px;
    height: 40px;
    border-radius: 2px;
    background: rgb(var(--color-panel));
    border: 2px solid var(--color-accent);
    color: var(--color-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    transition:
      background-color 0.15s,
      color 0.15s;
  }

  .mobile-setting-btn {
    bottom: calc(calc(0.35rem * 10) + 48px + constant(safe-area-inset-bottom, 0px));
    bottom: calc(calc(0.35rem * 10) + 48px + env(safe-area-inset-bottom, 0px));
  }

  .mobile-void-btn {
    position: fixed;
    bottom: calc(calc(0.35rem * 10) + 96px + constant(safe-area-inset-bottom, 0px));
    bottom: calc(calc(0.35rem * 10) + 96px + env(safe-area-inset-bottom, 0px));
    right: 12px;
    z-index: 40;
    width: 40px;
    height: 40px;
    border-radius: 2px;
    background: rgb(var(--color-panel));
    border: 2px solid var(--color-accent);
    color: var(--color-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    transition:
      background-color 0.15s,
      color 0.15s;
  }

  .mobile-map-btn:hover,
  .mobile-map-btn:active,
  .mobile-void-btn:hover,
  .mobile-void-btn:active {
    background: var(--color-accent);
    color: rgb(var(--color-bg));
  }
</style>
