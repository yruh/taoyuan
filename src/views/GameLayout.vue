<template>
  <div v-if="gameStore.isGameStarted" class="flex flex-col space-y-2 md:space-y-4 h-screen p-2 md:p-4" :class="{ 'py-10': isWebView }">
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
  import { ref, computed, watch, onMounted, onUnmounted, defineAsyncComponent, defineComponent, h } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useGameStore, usePlayerStore, useAnimalStore, useNpcStore } from '@/stores'
  import { useSaveStore } from '@/stores/useSaveStore'
  import { useDialogs } from '@/composables/useDialogs'
  import { handleEndDay, isSettling } from '@/composables/useEndDay'
  import { addLog } from '@/composables/useGameLog'
  import { getNpcById } from '@/data'
  import { useGameClock } from '@/composables/useGameClock'
  import { useAudio } from '@/composables/useAudio'
  import { Moon, X, Map, Settings as SettingsIcon } from 'lucide-vue-next'
  import Button from '@/components/game/Button.vue'
  import MobileMapMenu from '@/components/game/MobileMapMenu.vue'
  import StatusBar from '@/components/game/StatusBar.vue'
  import EventDialog from '@/components/game/EventDialog.vue'
  import HeartEventDialog from '@/components/game/HeartEventDialog.vue'
  import PerkSelectDialog from '@/components/game/PerkSelectDialog.vue'
  const FestivalLoadingFallback = defineComponent({
    name: 'FestivalLoadingFallback',
    setup() {
      return () =>
        h('div', { class: 'game-panel max-w-xs w-full text-center' }, [
          h('p', { class: 'text-accent text-sm mb-2 animate-pulse' }, '活动加载中...'),
          h('p', { class: 'text-xs text-muted' }, '请稍候')
        ])
    }
  })

  const FestivalErrorFallback = defineComponent({
    name: 'FestivalErrorFallback',
    emits: ['complete'],
    setup(_, { emit }) {
      return () =>
        h('div', { class: 'game-panel max-w-xs w-full text-center' }, [
          h('p', { class: 'text-danger text-sm mb-2' }, '活动加载失败'),
          h('p', { class: 'text-xs text-muted mb-3' }, '请检查网络后重试。'),
          h(
            'button',
            {
              class: 'px-3 py-1 border border-danger/40 text-danger text-xs rounded-xs hover:bg-danger/10',
              onClick: () => emit('complete')
            },
            '关闭'
          )
        ])
    }
  })

  const createFestivalAsyncComponent = (loader: () => Promise<any>) =>
    defineAsyncComponent({
      loader,
      delay: 120,
      timeout: 10000,
      loadingComponent: FestivalLoadingFallback,
      errorComponent: FestivalErrorFallback
    })

  const FishingContestView = createFestivalAsyncComponent(() => import('@/components/game/FishingContestView.vue'))
  const HarvestFairView = createFestivalAsyncComponent(() => import('@/components/game/HarvestFairView.vue'))
  const DragonBoatView = createFestivalAsyncComponent(() => import('@/components/game/DragonBoatView.vue'))
  const LanternRiddleView = createFestivalAsyncComponent(() => import('@/components/game/LanternRiddleView.vue'))
  const PotThrowingView = createFestivalAsyncComponent(() => import('@/components/game/PotThrowingView.vue'))
  const DumplingMakingView = createFestivalAsyncComponent(() => import('@/components/game/DumplingMakingView.vue'))
  const FireworkShowView = createFestivalAsyncComponent(() => import('@/components/game/FireworkShowView.vue'))
  const TeaContestView = createFestivalAsyncComponent(() => import('@/components/game/TeaContestView.vue'))
  const KiteFlyingView = createFestivalAsyncComponent(() => import('@/components/game/KiteFlyingView.vue'))
  import SettingsDialog from '@/components/game/SettingsDialog.vue'

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
    closeEvent,
    closeHeartEvent,
    closeFestival,
    handlePerkSelect,
    closePetAdoption,
    closeChildProposal
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

  const isClockBlocked = computed(
    () =>
      !!(
        currentEvent.value ||
        pendingHeartEvent.value ||
        currentFestival.value ||
        pendingPerk.value ||
        pendingPetAdoption.value ||
        childProposalVisible.value ||
        showSleepConfirm.value ||
        settling.value
      )
  )

  // 弹窗或结算进行时暂停时钟，全部结束后恢复
  watch(isClockBlocked, blocked => {
    if (blocked) pauseClock()
    else resumeClock()
  })

  // 判断是否webview环境
  const isWebView = window.__WEBVIEW__

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
    background: var(--color-panel);
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

  .mobile-map-btn:hover,
  .mobile-map-btn:active {
    background: var(--color-accent);
    color: var(--color-bg);
  }
</style>
