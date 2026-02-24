import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useGameStore } from './useGameStore'

export type MessageLevel = 'info' | 'success' | 'warning' | 'error'
export type MessageSource = 'log' | 'float'

export interface MessageEntry {
  id: number
  text: string
  level: MessageLevel
  source: MessageSource
  important: boolean
  day: number | null
  hour: number | null
  createdAt: string
}

const MAX_HISTORY = 400

const sanitizeText = (text: string) =>
  text
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const normalizeLevel = (level: unknown): MessageLevel => {
  if (level === 'success' || level === 'warning' || level === 'error') return level
  return 'info'
}

const normalizeSource = (source: unknown): MessageSource => {
  if (source === 'float') return 'float'
  return 'log'
}

export const useMessageStore = defineStore('message', () => {
  const nextId = ref(1)
  const history = ref<MessageEntry[]>([])

  const addMessage = (text: string, options?: { level?: MessageLevel; source?: MessageSource; important?: boolean }) => {
    const clean = sanitizeText(text)
    if (!clean) return

    const gameStore = useGameStore()
    history.value.push({
      id: nextId.value++,
      text: clean,
      level: options?.level ?? 'info',
      source: options?.source ?? 'log',
      important: options?.important ?? false,
      day: gameStore.isGameStarted ? gameStore.day : null,
      hour: gameStore.isGameStarted ? gameStore.hour : null,
      createdAt: new Date().toISOString()
    })

    if (history.value.length > MAX_HISTORY) {
      history.value.splice(0, history.value.length - MAX_HISTORY)
    }
  }

  const clearHistory = () => {
    history.value = []
  }

  const importantCount = computed(() => history.value.filter(item => item.important).length)

  const serialize = () => {
    return {
      nextId: nextId.value,
      history: history.value
    }
  }

  const deserialize = (data: any) => {
    const rawHistory: any[] = Array.isArray(data?.history) ? data.history : []
    const normalized: MessageEntry[] = rawHistory
      .map((raw: any, idx: number): MessageEntry => {
        const clean = sanitizeText(String(raw?.text ?? ''))
        return {
          id: Number.isFinite(raw?.id) ? Number(raw.id) : idx + 1,
          text: clean,
          level: normalizeLevel(raw?.level),
          source: normalizeSource(raw?.source),
          important: !!raw?.important,
          day: Number.isFinite(raw?.day) ? Number(raw.day) : null,
          hour: Number.isFinite(raw?.hour) ? Number(raw.hour) : null,
          createdAt: typeof raw?.createdAt === 'string' ? raw.createdAt : new Date().toISOString()
        }
      })
      .filter((item: MessageEntry) => item.text.length > 0)
      .slice(-MAX_HISTORY)

    history.value = normalized
    const maxId = normalized.reduce((acc: number, item: MessageEntry) => Math.max(acc, item.id), 0)
    nextId.value = Number.isFinite(data?.nextId) ? Math.max(Number(data.nextId), maxId + 1) : maxId + 1
  }

  return {
    history,
    importantCount,
    addMessage,
    clearHistory,
    serialize,
    deserialize
  }
})
