<template>
  <div>
    <h3 class="text-accent text-sm mb-3">
      <Building :size="14" class="inline" />
      设施
    </h3>

    <!-- 山洞 -->
    <div class="border border-accent/20 rounded-xs p-3 mb-4">
      <p class="text-sm text-accent mb-2">
        <Mountain :size="14" class="inline" />
        山洞
      </p>
      <div v-if="!homeStore.caveUnlocked">
        <p class="text-xs text-muted">山洞尚未开放。（累计收入达到一定额度后自动开放）</p>
      </div>
      <div v-else-if="homeStore.caveChoice === 'none'">
        <p class="text-xs text-muted mb-2">选择山洞用途（选定后不可更改）：</p>
        <div class="flex flex-col space-y-1">
          <div
            class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-1.5 cursor-pointer hover:bg-accent/5"
            @click="handleChooseCave('mushroom')"
          >
            <span class="text-xs">蘑菇洞</span>
            <span class="text-xs text-muted">每天60%概率产蘑菇</span>
          </div>
          <div
            class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-1.5 cursor-pointer hover:bg-accent/5"
            @click="handleChooseCave('fruit_bat')"
          >
            <span class="text-xs">蝙蝠洞</span>
            <span class="text-xs text-muted">每天50%概率产水果</span>
          </div>
        </div>
      </div>
      <div v-else>
        <p class="text-xs">
          {{ homeStore.caveChoice === 'mushroom' ? '蘑菇洞 — 每天有概率产出野蘑菇。' : '蝙蝠洞 — 每天有概率产出各季水果。' }}
        </p>
      </div>
    </div>

    <!-- 温室 -->
    <div class="border border-accent/20 rounded-xs p-3 mb-4">
      <p class="text-sm text-accent mb-2">
        <Leaf :size="14" class="inline" />
        温室
      </p>
      <div v-if="!homeStore.greenhouseUnlocked">
        <p class="text-xs text-muted mb-2">解锁温室后可在任何季节种植作物，作物自动浇水。</p>
        <div
          class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-1.5 cursor-pointer hover:bg-accent/5"
          @click="showGreenhouseModal = true"
        >
          <span class="text-xs">解锁温室</span>
          <span class="text-xs text-accent whitespace-nowrap">{{ GREENHOUSE_UNLOCK_COST }}文</span>
        </div>
      </div>
      <div v-else>
        <p class="text-xs text-success">温室已开放。可在农场面板中切换至温室进行种植。</p>
      </div>
    </div>

    <!-- 仓库 -->
    <div class="border border-accent/20 rounded-xs p-3">
      <div class="flex items-center justify-between mb-2">
        <p class="text-sm text-accent">
          <Warehouse :size="14" class="inline" />
          仓库
        </p>
        <span v-if="warehouseStore.unlocked" class="text-xs text-muted">
          箱子 {{ warehouseStore.chests.length }}/{{ warehouseStore.maxChests }}
        </span>
      </div>

      <!-- 未解锁 -->
      <div v-if="!warehouseStore.unlocked">
        <p class="text-xs text-muted mb-2">解锁仓库后可放置箱子分类存放物品。</p>
        <div
          class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-1.5 cursor-pointer hover:bg-accent/5"
          @click="showWarehouseUnlockModal = true"
        >
          <span class="text-xs">解锁仓库</span>
          <span class="text-xs text-accent whitespace-nowrap">{{ warehouseStore.UNLOCK_COST }}文</span>
        </div>
      </div>

      <!-- 已解锁 -->
      <template v-else>
        <!-- 箱子列表 -->
        <div v-if="warehouseStore.chests.length > 0" class="flex flex-col space-y-1.5 mb-2">
          <div
            v-for="chest in warehouseStore.chests"
            :key="chest.id"
            class="border border-accent/10 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5"
            @click="openChestId = chest.id"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-1.5">
                <span
                  class="text-[10px] px-1 rounded-xs border border-accent/30"
                  :class="chest.tier === 'void' ? 'text-quality-supreme' : 'text-accent'"
                >
                  {{ CHEST_DEFS[chest.tier].name }}
                </span>
                <span v-if="renamingChestId !== chest.id" class="text-xs">{{ chest.label }}</span>
                <input
                  v-else
                  v-model="renameInput"
                  class="text-xs bg-transparent border-b border-accent/40 outline-none w-20"
                  maxlength="8"
                  @keyup.enter="confirmRenameChest"
                  @keyup.escape="renamingChestId = null"
                  @click.stop
                />
                <button
                  v-if="renamingChestId !== chest.id"
                  class="text-muted hover:text-accent"
                  @click.stop="startRenameChest(chest.id, chest.label)"
                >
                  <Pencil :size="10" />
                </button>
              </div>
              <div class="flex items-center space-x-1.5">
                <span class="text-[10px] text-muted">{{ chest.items.length }}/{{ CHEST_DEFS[chest.tier].capacity }}</span>
                <button v-if="chest.items.length === 0" class="text-muted hover:text-danger" @click.stop="handleRemoveChest(chest.id)">
                  <Trash2 :size="10" />
                </button>
              </div>
            </div>
            <!-- 虚空箱角色 -->
            <div v-if="chest.tier === 'void'" class="flex items-center space-x-1 mt-1" @click.stop>
              <button
                v-for="role in VOID_ROLES"
                :key="role.value"
                class="text-[10px] px-1 rounded-xs border"
                :class="chest.voidRole === role.value ? 'border-accent text-accent' : 'border-accent/20 text-muted'"
                @click="handleSetVoidRole(chest.id, role.value)"
              >
                {{ role.label }}
              </button>
            </div>
          </div>
        </div>
        <div v-else class="flex flex-col items-center justify-center py-4 text-muted mb-2">
          <Warehouse :size="24" />
          <p class="text-xs mt-1">仓库空空如也</p>
        </div>

        <!-- 添加箱子 -->
        <Button
          v-if="warehouseStore.chests.length < warehouseStore.maxChests"
          class="w-full"
          :icon="Plus"
          :icon-size="12"
          @click="showAddChestModal = true"
        >
          添加箱子
        </Button>
      </template>
    </div>

    <!-- 解锁温室弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="showGreenhouseModal"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="showGreenhouseModal = false"
      >
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="showGreenhouseModal = false">
            <X :size="14" />
          </button>

          <p class="text-sm text-accent mb-2">解锁温室</p>

          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted">解锁后可在任何季节种植作物，作物自动浇水。</p>
          </div>

          <div class="border border-accent/10 rounded-xs p-2 mb-2 space-y-1">
            <p class="text-xs text-muted mb-1">所需材料</p>
            <div v-for="mat in GREENHOUSE_MATERIAL_COST" :key="mat.itemId" class="flex items-center justify-between">
              <span class="text-xs text-muted">{{ getItemName(mat.itemId) }}</span>
              <span class="text-xs" :class="getCombinedItemCount(mat.itemId) >= mat.quantity ? '' : 'text-danger'">
                {{ getCombinedItemCount(mat.itemId) }}/{{ mat.quantity }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted">金币</span>
              <span class="text-xs" :class="playerStore.money >= GREENHOUSE_UNLOCK_COST ? '' : 'text-danger'">
                {{ GREENHOUSE_UNLOCK_COST }}文
              </span>
            </div>
          </div>

          <Button
            class="w-full justify-center"
            :class="{ '!bg-accent !text-bg': canUnlockGreenhouse }"
            :disabled="!canUnlockGreenhouse"
            :icon="Unlock"
            :icon-size="12"
            @click="handleUnlockFromModal"
          >
            解锁
          </Button>
        </div>
      </div>
    </Transition>

    <!-- 仓库解锁弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="showWarehouseUnlockModal"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="showWarehouseUnlockModal = false"
      >
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="showWarehouseUnlockModal = false">
            <X :size="14" />
          </button>

          <p class="text-sm text-accent mb-2">解锁仓库</p>

          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted">解锁后可放置箱子分类存放物品，初始可放3个箱子，可在商店升级。</p>
          </div>

          <div class="border border-accent/10 rounded-xs p-2 mb-2 space-y-1">
            <div v-for="mat in WAREHOUSE_UNLOCK_MATERIALS" :key="mat.itemId" class="flex items-center justify-between">
              <span class="text-xs text-muted">{{ getItemName(mat.itemId) }}</span>
              <span class="text-xs" :class="getCombinedItemCount(mat.itemId) >= mat.quantity ? '' : 'text-danger'">
                {{ getCombinedItemCount(mat.itemId) }}/{{ mat.quantity }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted">金币</span>
              <span class="text-xs" :class="playerStore.money >= warehouseStore.UNLOCK_COST ? '' : 'text-danger'">
                {{ warehouseStore.UNLOCK_COST }}文
              </span>
            </div>
          </div>

          <Button
            class="w-full justify-center"
            :class="{ '!bg-accent !text-bg': canUnlockWarehouse }"
            :disabled="!canUnlockWarehouse"
            :icon="Unlock"
            :icon-size="12"
            @click="handleUnlockWarehouse"
          >
            解锁
          </Button>
        </div>
      </div>
    </Transition>

    <!-- 箱子详情弹窗 -->
    <Transition name="panel-fade">
      <div v-if="openChestId" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" @click.self="openChestId = null">
        <div v-if="currentOpenChest" class="game-panel max-w-sm w-full">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center space-x-1.5">
              <span
                class="text-[10px] px-1 rounded-xs border border-accent/30"
                :class="currentOpenChest.tier === 'void' ? 'text-quality-supreme' : 'text-accent'"
              >
                {{ CHEST_DEFS[currentOpenChest.tier].name }}
              </span>
              <p class="text-sm text-accent">{{ currentOpenChest.label }}</p>
              <span class="text-[10px] text-muted">
                {{ currentOpenChest.items.length }}/{{ CHEST_DEFS[currentOpenChest.tier].capacity }}
              </span>
            </div>
            <Button class="py-0 px-1" :icon="X" :icon-size="12" @click="openChestId = null" />
          </div>

          <!-- 箱子物品列表 -->
          <div v-if="currentOpenChest.items.length > 0" class="flex flex-col space-y-1 mb-2 max-h-48 overflow-y-auto">
            <div
              v-for="(item, idx) in currentOpenChest.items"
              :key="idx"
              class="flex items-center justify-between border border-accent/10 rounded-xs px-2 py-1"
            >
              <span class="text-xs truncate mr-2" :class="qualityTextClass(item.quality)">
                {{ getItemName(item.itemId) }}
                <span v-if="item.quality !== 'normal'" class="text-[10px]">({{ QUALITY_LABEL[item.quality] }})</span>
              </span>
              <div class="flex items-center space-x-1.5">
                <span class="text-xs text-muted">&times;{{ item.quantity }}</span>
                <Button class="py-0 px-1" @click="handleWithdrawFromChest(openChestId!, item.itemId, item.quality)">取出</Button>
              </div>
            </div>
          </div>
          <div v-else class="text-xs text-muted text-center py-4 mb-2">空箱子</div>

          <!-- 存入按钮 -->
          <Button v-if="depositableItems.length > 0" class="w-full" :icon="ArrowDown" :icon-size="12" @click="showChestDepositModal = true">
            存入物品
          </Button>
        </div>
      </div>
    </Transition>

    <!-- 箱子存入弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="showChestDepositModal && openChestId"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="showChestDepositModal = false"
      >
        <div class="game-panel max-w-sm w-full">
          <div class="flex items-center justify-between mb-2">
            <p class="text-sm text-accent">存入物品</p>
            <Button class="py-0 px-1" :icon="X" :icon-size="12" @click="showChestDepositModal = false" />
          </div>
          <div class="flex flex-col space-y-1 max-h-60 overflow-y-auto">
            <div
              v-for="item in depositableItems"
              :key="item.itemId + item.quality"
              class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-1.5 cursor-pointer hover:bg-accent/5"
              @click="handleDepositToChest(openChestId!, item.itemId, item.quality)"
            >
              <span class="text-xs truncate mr-2" :class="qualityTextClass(item.quality)">
                {{ getItemName(item.itemId) }}
                <span v-if="item.quality !== 'normal'" class="text-[10px]">({{ QUALITY_LABEL[item.quality] }})</span>
              </span>
              <span class="text-xs text-muted">&times;{{ item.quantity }}</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 添加箱子弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="showAddChestModal"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="showAddChestModal = false"
      >
        <div class="game-panel max-w-sm w-full">
          <div class="flex items-center justify-between mb-2">
            <p class="text-sm text-accent">制作箱子</p>
            <Button class="py-0 px-1" :icon="X" :icon-size="12" @click="showAddChestModal = false" />
          </div>
          <div class="flex flex-col space-y-1.5">
            <div v-for="tier in CHEST_TIER_ORDER" :key="tier" class="border border-accent/20 rounded-xs p-2">
              <div class="flex items-center justify-between mb-1">
                <div class="flex items-center space-x-1.5">
                  <span class="text-xs font-bold" :class="tier === 'void' ? 'text-quality-supreme' : 'text-accent'">
                    {{ CHEST_DEFS[tier].name }}
                  </span>
                  <span class="text-[10px] text-muted">{{ CHEST_DEFS[tier].capacity }}格</span>
                </div>
                <Button
                  class="py-0 px-1.5"
                  :class="{ '!bg-accent !text-bg': canCraftChest(tier) }"
                  :disabled="!canCraftChest(tier)"
                  @click="handleCraftChest(tier)"
                >
                  制作
                </Button>
              </div>
              <p class="text-[10px] text-muted mb-1">{{ CHEST_DEFS[tier].description }}</p>
              <div class="flex flex-wrap gap-x-3 gap-y-0.5">
                <span
                  v-for="mat in CHEST_DEFS[tier].craftCost"
                  :key="mat.itemId"
                  class="text-[10px]"
                  :class="getCombinedItemCount(mat.itemId) >= mat.quantity ? 'text-muted' : 'text-danger'"
                >
                  {{ getItemName(mat.itemId) }} {{ getCombinedItemCount(mat.itemId) }}/{{ mat.quantity }}
                </span>
                <span class="text-[10px]" :class="playerStore.money >= CHEST_DEFS[tier].craftMoney ? 'text-muted' : 'text-danger'">
                  {{ CHEST_DEFS[tier].craftMoney }}文
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { ArrowDown, Building, Mountain, Leaf, Pencil, Plus, Trash2, Unlock, Warehouse, X } from 'lucide-vue-next'
  import { useHomeStore } from '@/stores/useHomeStore'
  import { useInventoryStore } from '@/stores/useInventoryStore'
  import { usePlayerStore } from '@/stores/usePlayerStore'
  import { useProcessingStore } from '@/stores/useProcessingStore'
  import { useWarehouseStore } from '@/stores/useWarehouseStore'
  import { getCombinedItemCount, removeCombinedItem } from '@/composables/useCombinedInventory'
  import { getItemById } from '@/data'
  import { GREENHOUSE_UNLOCK_COST, GREENHOUSE_MATERIAL_COST, WAREHOUSE_UNLOCK_MATERIALS } from '@/data/buildings'
  import { CHEST_DEFS, CHEST_TIER_ORDER } from '@/data/items'
  import type { Quality, ChestTier, VoidChestRole } from '@/types'
  import { addLog } from '@/composables/useGameLog'
  import Button from '@/components/game/Button.vue'

  const homeStore = useHomeStore()
  const inventoryStore = useInventoryStore()
  const playerStore = usePlayerStore()
  const warehouseStore = useWarehouseStore()
  const processingStore = useProcessingStore()

  const showGreenhouseModal = ref(false)
  const showWarehouseUnlockModal = ref(false)
  const showAddChestModal = ref(false)
  const showChestDepositModal = ref(false)
  const openChestId = ref<string | null>(null)
  const renamingChestId = ref<string | null>(null)
  const renameInput = ref('')

  const getItemName = (itemId: string): string => {
    return getItemById(itemId)?.name ?? itemId
  }

  // === 山洞 ===

  const handleChooseCave = (choice: 'mushroom' | 'fruit_bat') => {
    if (homeStore.chooseCave(choice)) {
      const name = choice === 'mushroom' ? '蘑菇洞' : '蝙蝠洞'
      addLog(`选择了${name}，每天会有被动产出。`)
    }
  }

  // === 温室 ===

  const canUnlockGreenhouse = computed(() => {
    if (playerStore.money < GREENHOUSE_UNLOCK_COST) return false
    return GREENHOUSE_MATERIAL_COST.every(mat => getCombinedItemCount(mat.itemId) >= mat.quantity)
  })

  const handleUnlockFromModal = () => {
    if (homeStore.unlockGreenhouse()) {
      addLog('温室已解锁！可在农场面板中切换至温室进行种植。')
      showGreenhouseModal.value = false
    } else {
      addLog('金币或材料不足，无法解锁温室。')
    }
  }

  // === 仓库 ===

  const canUnlockWarehouse = computed(() => {
    if (playerStore.money < warehouseStore.UNLOCK_COST) return false
    return WAREHOUSE_UNLOCK_MATERIALS.every(mat => getCombinedItemCount(mat.itemId) >= mat.quantity)
  })

  const handleUnlockWarehouse = () => {
    if (warehouseStore.unlocked) return
    if (!canUnlockWarehouse.value) {
      addLog('金币或材料不足，无法解锁仓库。')
      return
    }
    for (const mat of WAREHOUSE_UNLOCK_MATERIALS) {
      removeCombinedItem(mat.itemId, mat.quantity)
    }
    playerStore.spendMoney(warehouseStore.UNLOCK_COST)
    warehouseStore.unlocked = true
    showWarehouseUnlockModal.value = false
    addLog(`仓库已解锁！（-${warehouseStore.UNLOCK_COST}文）`)
  }

  // === 箱子管理 ===

  const QUALITY_LABEL: Record<Quality, string> = {
    normal: '普通',
    fine: '优良',
    excellent: '精品',
    supreme: '极品'
  }

  const qualityTextClass = (q: Quality, fallback = ''): string => {
    if (q === 'fine') return 'text-quality-fine'
    if (q === 'excellent') return 'text-quality-excellent'
    if (q === 'supreme') return 'text-quality-supreme'
    return fallback
  }

  const VOID_ROLES: { value: VoidChestRole; label: string }[] = [
    { value: 'none', label: '无' },
    { value: 'input', label: '原料箱' },
    { value: 'output', label: '成品箱' }
  ]

  const currentOpenChest = computed(() => {
    if (!openChestId.value) return null
    return warehouseStore.getChest(openChestId.value) ?? null
  })

  /** 背包中可存入箱子的物品（排除种子） */
  const depositableItems = computed(() =>
    inventoryStore.items.filter(i => {
      const def = getItemById(i.itemId)
      return def && def.category !== 'seed'
    })
  )

  /** 制作箱子 */
  const canCraftChest = (tier: ChestTier): boolean => {
    if (warehouseStore.chests.length >= warehouseStore.maxChests) return false
    return processingStore.canCraft(CHEST_DEFS[tier].craftCost, CHEST_DEFS[tier].craftMoney)
  }

  const handleCraftChest = (tier: ChestTier) => {
    if (!canCraftChest(tier)) {
      addLog('材料或金币不足。')
      return
    }
    if (!processingStore.consumeCraftMaterials(CHEST_DEFS[tier].craftCost, CHEST_DEFS[tier].craftMoney)) return
    warehouseStore.addChest(tier)
    addLog(`制作了${CHEST_DEFS[tier].name}！（-${CHEST_DEFS[tier].craftMoney}文）`)
    if (warehouseStore.chests.length >= warehouseStore.maxChests) {
      showAddChestModal.value = false
    }
  }

  /** 删除箱子 */
  const handleRemoveChest = (chestId: string) => {
    const chest = warehouseStore.getChest(chestId)
    if (!chest) return
    if (chest.items.length > 0) {
      addLog('箱子不为空，无法删除。')
      return
    }
    const name = chest.label
    warehouseStore.removeChest(chestId)
    addLog(`拆除了${name}。`)
  }

  /** 重命名箱子 */
  const startRenameChest = (chestId: string, currentLabel: string) => {
    renamingChestId.value = chestId
    renameInput.value = currentLabel
  }

  const confirmRenameChest = () => {
    if (renamingChestId.value) {
      warehouseStore.renameChest(renamingChestId.value, renameInput.value)
    }
    renamingChestId.value = null
  }

  /** 虚空箱角色 */
  const handleSetVoidRole = (chestId: string, role: VoidChestRole) => {
    warehouseStore.setVoidRole(chestId, role)
    const chest = warehouseStore.getChest(chestId)
    if (!chest) return
    if (role === 'none') addLog(`${chest.label}已取消角色设置。`)
    else if (role === 'input') addLog(`${chest.label}已设为原料箱，作坊加工将自动从此箱取材料。`)
    else addLog(`${chest.label}已设为成品箱，作坊产品将自动放入此箱。`)
  }

  /** 存入箱子 */
  const handleDepositToChest = (chestId: string, itemId: string, quality: Quality) => {
    const slot = inventoryStore.items.find(i => i.itemId === itemId && i.quality === quality)
    if (!slot) return
    const actualQty = warehouseStore.depositToChest(chestId, itemId, slot.quantity, quality)
    if (actualQty <= 0) {
      addLog('箱子已满，无法存入。')
      return
    }
    addLog(`存入了${getItemName(itemId)}×${actualQty}。`)
    if (depositableItems.value.length === 0 || warehouseStore.isChestFull(chestId)) {
      showChestDepositModal.value = false
    }
  }

  /** 从箱子取出 */
  const handleWithdrawFromChest = (chestId: string, itemId: string, quality: Quality) => {
    const chest = warehouseStore.getChest(chestId)
    if (!chest) return
    const slot = chest.items.find(i => i.itemId === itemId && i.quality === quality)
    if (!slot) return
    const qty = slot.quantity
    if (!warehouseStore.withdrawFromChest(chestId, itemId, qty, quality)) {
      addLog('背包已满，无法取出。')
      return
    }
    addLog(`取出了${getItemName(itemId)}×${qty}。`)
  }
</script>
