import { ref } from 'vue'
import Qmsg from 'qmsg'
import { useMessageStore, type MessageLevel } from '@/stores/useMessageStore'

export type FloatColor = 'danger' | 'success' | 'accent' | 'water'
export type QmsgPosition = 'topleft' | 'top' | 'topright' | 'left' | 'center' | 'right' | 'bottomleft' | 'bottom' | 'bottomright'

export interface QmsgConfigOptions {
  position: QmsgPosition
  timeout: number
  maxNums: number
  isLimitWidth: boolean
  limitWidthNum: number
  limitWidthWrap: 'no-wrap' | 'wrap' | 'ellipsis'
  animation: boolean
  autoClose: boolean
  showClose: boolean
  showIcon: boolean
  showReverse: boolean
}

const DEFAULT_QMSG_CONFIG: QmsgConfigOptions = {
  position: 'top',
  timeout: 2500,
  maxNums: 5,
  isLimitWidth: true,
  limitWidthNum: 200,
  limitWidthWrap: 'wrap',
  animation: true,
  autoClose: true,
  showClose: false,
  showIcon: false,
  showReverse: false
}

let currentQmsgConfig: QmsgConfigOptions = { ...DEFAULT_QMSG_CONFIG }

const LOG_MIN_TIMEOUT = 3600
const IMPORTANT_LOG_TIMEOUT = 7000
const FLOAT_TIMEOUT = 2200
const DANGER_FLOAT_TIMEOUT = 3200
const FORCE_CLOSE_BTN_MIN_LENGTH = 28

const stripHtml = (text: string) => text.replace(/<[^>]*>/g, '')

const IMPORTANT_LOG_PATTERNS: RegExp[] = [/^⚠/, /失败/, /异常/, /错误/, /成就达成/, /解锁/, /升级/, /死亡/, /过期/]

const isImportantLog = (msg: string) => {
  const plain = stripHtml(msg).trim()
  return IMPORTANT_LOG_PATTERNS.some(pattern => pattern.test(plain))
}

const getLogTimeout = (important: boolean) => {
  if (!currentQmsgConfig.autoClose) {
    return currentQmsgConfig.timeout
  }
  const base = Math.max(currentQmsgConfig.timeout, LOG_MIN_TIMEOUT)
  return important ? Math.max(base, IMPORTANT_LOG_TIMEOUT) : base
}

const shouldShowClose = (msg: string, important = false) => {
  if (currentQmsgConfig.showClose) return true
  if (important) return true
  return stripHtml(msg).trim().length >= FORCE_CLOSE_BTN_MIN_LENGTH
}

const recordMessage = (msg: string, level: MessageLevel, source: 'log' | 'float', important: boolean) => {
  useMessageStore().addMessage(msg, { level, source, important })
}

const getFloatLevel = (color: FloatColor): MessageLevel => {
  switch (color) {
    case 'danger':
      return 'error'
    case 'success':
      return 'success'
    case 'accent':
      return 'warning'
    case 'water':
      return 'info'
  }
}

const getFloatTimeout = (color: FloatColor) => {
  return color === 'danger' ? DANGER_FLOAT_TIMEOUT : FLOAT_TIMEOUT
}

// 配置 Qmsg 全局样式
Qmsg.config({
  ...DEFAULT_QMSG_CONFIG,
  isHTML: true,
  useShadowRoot: false,
  listenEventToPauseAutoClose: true,
  listenEventToCloseInstance: false
})

/** 动态更新 Qmsg 全部通知配置 */
export const applyQmsgConfig = (opts: QmsgConfigOptions) => {
  currentQmsgConfig = { ...opts }

  Qmsg.config({
    isHTML: true,
    position: opts.position,
    timeout: opts.timeout,
    maxNums: opts.maxNums,
    isLimitWidth: opts.isLimitWidth,
    limitWidthNum: opts.limitWidthNum,
    limitWidthWrap: opts.limitWidthWrap,
    animation: opts.animation,
    autoClose: opts.autoClose,
    showClose: opts.showClose,
    showIcon: opts.showIcon,
    showReverse: opts.showReverse,
    useShadowRoot: false,
    listenEventToPauseAutoClose: true,
    listenEventToCloseInstance: false
  })
}

// 天赋检查回调 — 由 useDialogs 注册以避免循环导入
let _perkChecker: (() => void) | null = null

/** 注册天赋检查回调（useDialogs 初始化时调用） */
export const _registerPerkChecker = (fn: () => void) => {
  _perkChecker = fn
}

// === 日志历史记录（内存中，不存档，刷新页面清空） ===

export interface LogEntry {
  msg: string
  dayLabel: string
}

/** 全部日志历史 */
export const logHistory = ref<LogEntry[]>([])

/** 天数标签获取器 — 由 GameLayout 注册以避免循环导入 */
let _dayLabelGetter: (() => string) | null = null

/** 注册天数标签获取器（GameLayout 初始化时调用） */
export const _registerDayLabelGetter = (fn: () => string) => {
  _dayLabelGetter = fn
}

/** 添加日志消息（显示为 toast 通知，同时记录到历史） */
export const addLog = (msg: string) => {
  const important = isImportantLog(msg)
  recordMessage(msg, 'info', 'log', important)
  Qmsg.info(msg, {
    timeout: getLogTimeout(important),
    showClose: shouldShowClose(msg, important)
  })
  const dayLabel = _dayLabelGetter?.() ?? ''
  logHistory.value.push({ msg, dayLabel })
  _perkChecker?.()
}

/** 显示浮动文本反馈（显示为 toast 通知） */
export const showFloat = (text: string, color: FloatColor = 'accent') => {
  const level = getFloatLevel(color)
  const important = color === 'danger'
  recordMessage(text, level, 'float', important)

  switch (color) {
    case 'danger':
      Qmsg.error(text, { timeout: getFloatTimeout(color), showClose: true })
      break
    case 'success':
      Qmsg.success(text, { timeout: getFloatTimeout(color), showClose: shouldShowClose(text) })
      break
    case 'accent':
      Qmsg.warning(text, { timeout: getFloatTimeout(color), showClose: shouldShowClose(text) })
      break
    case 'water':
      Qmsg.info(text, { timeout: getFloatTimeout(color), showClose: shouldShowClose(text) })
      break
  }
}

/** 重置日志（新游戏） */
export const resetLogs = () => {
  Qmsg.closeAll()
}

/** 清空全部日志历史 */
export const clearAllLogs = () => {
  logHistory.value = []
  useMessageStore().clearHistory()
}

/** 清空指定天的日志 */
export const clearDayLogs = (dayLabel: string) => {
  logHistory.value = logHistory.value.filter(e => e.dayLabel !== dayLabel)
}

export const useGameLog = () => {
  return {
    addLog,
    showFloat,
    resetLogs,
    clearAllLogs,
    clearDayLogs,
    logHistory
  }
}
