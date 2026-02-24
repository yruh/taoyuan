<template>
  <Transition name="panel-fade">
    <div v-if="open" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" @click.self="$emit('close')">
      <div class="game-panel w-full max-w-md max-h-[80vh] flex flex-col">
        <div class="flex items-center justify-between mb-2">
          <p class="text-accent text-sm">—— 消息记录 ——</p>
          <button class="text-muted hover:text-text" @click="$emit('close')">
            <X :size="14" />
          </button>
        </div>

        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center space-x-1">
            <Button class="py-0 px-2" :class="!onlyImportant ? '!bg-accent/20 !text-accent !border-accent' : ''" @click="onlyImportant = false">
              全部
            </Button>
            <Button class="py-0 px-2" :class="onlyImportant ? '!bg-accent/20 !text-accent !border-accent' : ''" @click="onlyImportant = true">
              重要({{ messageStore.importantCount }})
            </Button>
          </div>
          <Button class="py-0 px-2" @click="messageStore.clearHistory()">清空</Button>
        </div>

        <div class="border border-accent/20 rounded-xs p-2 flex-1 min-h-0 overflow-y-auto">
          <div v-if="displayRecords.length === 0" class="text-xs text-muted text-center py-6">暂无记录</div>
          <div v-for="item in displayRecords" :key="item.id" class="border border-accent/10 rounded-xs px-2 py-1.5 mb-1">
            <div class="flex items-center justify-between text-[10px] mb-1">
              <span class="text-muted">{{ formatRecordTime(item.day, item.hour) }}</span>
              <span :class="badgeClass(item.level, item.important)">
                {{ item.important ? '重要' : levelLabel(item.level) }}
              </span>
            </div>
            <p class="text-xs leading-relaxed break-words">{{ item.text }}</p>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { X } from 'lucide-vue-next'
  import Button from '@/components/game/Button.vue'
  import { useMessageStore } from '@/stores/useMessageStore'
  import { formatTime } from '@/data/timeConstants'

  defineProps<{ open: boolean }>()
  defineEmits<{ close: [] }>()

  const messageStore = useMessageStore()
  const onlyImportant = ref(false)

  const displayRecords = computed(() => {
    const source = onlyImportant.value ? messageStore.history.filter(item => item.important) : messageStore.history
    return [...source].reverse()
  })

  const formatRecordTime = (day: number | null, hour: number | null) => {
    if (day == null || hour == null) return '系统消息'
    return `第${day}天 ${formatTime(hour)}`
  }

  const levelLabel = (level: 'info' | 'success' | 'warning' | 'error') => {
    if (level === 'success') return '成功'
    if (level === 'warning') return '提示'
    if (level === 'error') return '警告'
    return '消息'
  }

  const badgeClass = (level: 'info' | 'success' | 'warning' | 'error', important: boolean) => {
    if (important || level === 'error') return 'text-danger'
    if (level === 'success') return 'text-success'
    if (level === 'warning') return 'text-accent'
    return 'text-muted'
  }
</script>
