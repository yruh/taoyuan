import { ref, computed } from 'vue'
import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { parseSaveData } from '@/stores/useSaveStore'

const STORAGE_KEY = 'taoyuanxiang_webdav'
const SAVE_KEY_PREFIX = 'taoyuanxiang_save_'
const MAX_SLOTS = 3

export interface WebdavConfig {
  enabled: boolean
  serverUrl: string
  path: string
  username: string
  password: string
}

const defaultConfig = (): WebdavConfig => ({
  enabled: false,
  serverUrl: '',
  path: '',
  username: '',
  password: ''
})

const loadConfig = (): WebdavConfig => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...defaultConfig(), ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return defaultConfig()
}

/** 持久化配置 */
const config = ref<WebdavConfig>(loadConfig())
const testStatus = ref<'idle' | 'testing' | 'success' | 'failed'>('idle')
const testError = ref('')

/** 检测是否在 Electron 环境中 */
const isElectron = typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron')

/** 平台自适应 HTTP 请求：原生平台走 CapacitorHttp，dev 走 Vite 代理，Electron/生产 web 直连 */
const webdavFetch = async (
  url: string,
  method: string,
  headers: Record<string, string>,
  body?: string
): Promise<{ status: number; data: string }> => {
  // 原生平台（Capacitor Android/iOS）：CapacitorHttp 绕过 CORS
  if (Capacitor.isNativePlatform()) {
    const res = await CapacitorHttp.request({ url, method, headers, data: body })
    return { status: res.status, data: typeof res.data === 'string' ? res.data : JSON.stringify(res.data) }
  }
  // Dev 环境（非 Electron）：走 Vite 代理中间件绕过 CORS
  if (import.meta.env.DEV && !isElectron) {
    const res = await fetch('/__webdav', {
      method,
      headers: { ...headers, 'x-webdav-url': url },
      body
    })
    return { status: res.status, data: await res.text() }
  }
  // Electron（主进程已注入 CORS 头）/ 生产 web（同源部署）：直连
  // credentials: 'omit' 防止浏览器弹出原生认证对话框（认证由 Authorization 头自行处理）
  const res = await fetch(url, { method, headers, body, credentials: 'omit' })
  return { status: res.status, data: await res.text() }
}

/** 根据 serverUrl 域名返回针对性的路径提示 */
const getPathHint = (serverUrl: string): string => {
  try {
    const host = new URL(serverUrl).hostname.toLowerCase()
    if (host.includes('jianguoyun')) return '坚果云请在「存储路径」中填写已有的文件夹名，如"我的坚果云"。'
    if (host.includes('nextcloud') || serverUrl.includes('/remote.php/dav')) return 'Nextcloud 请在「存储路径」中填写目标文件夹名。'
    if (host.includes('owncloud') || serverUrl.includes('/remote.php/webdav')) return 'ownCloud 请在「存储路径」中填写目标文件夹名。'
  } catch {
    /* ignore */
  }
  return '请在「存储路径」中填写一个已存在的文件夹名。'
}

export const useWebdav = () => {
  const webdavConfig = config
  const webdavTestStatus = testStatus
  const webdavTestError = testError

  const webdavReady = computed(() => config.value.enabled && testStatus.value === 'success')

  const saveConfig = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config.value))
  }

  /** 确保 URL 末尾带 / */
  const normalizeUrl = (url: string): string => {
    const trimmed = url.trim().replace(/\/+$/, '')
    return trimmed ? trimmed + '/' : ''
  }

  /** 拼接 serverUrl + path 得到完整目录 URL（对路径段做 percent-encode 以支持中文） */
  const fullDirUrl = (): string => {
    const base = normalizeUrl(config.value.serverUrl)
    const sub = config.value.path.trim().replace(/^\/+|\/+$/g, '')
    if (!sub) return base
    const encoded = sub
      .split('/')
      .map(s => encodeURIComponent(s))
      .join('/')
    return base + encoded + '/'
  }

  /** 生成 Basic Auth header */
  const authHeaders = (): Record<string, string> => ({
    Authorization: 'Basic ' + btoa(config.value.username + ':' + config.value.password)
  })

  /** 远程文件路径 */
  const remoteFilePath = (slot: number): string => fullDirUrl() + `taoyuan_save_${slot}.tyx`

  /** 测试连接：Web/Electron 用 PROPFIND，原生平台（Android/iOS）用 HEAD（CapacitorHttp 不支持 PROPFIND） */
  const testConnection = async (): Promise<boolean> => {
    testStatus.value = 'testing'
    testError.value = ''
    try {
      const base = normalizeUrl(config.value.serverUrl)
      if (!base) {
        testStatus.value = 'failed'
        testError.value = '服务器地址为空'
        return false
      }
      const url = fullDirUrl()
      const isNative = Capacitor.isNativePlatform()
      // 原生平台 CapacitorHttp 不支持 PROPFIND 方法，改用 HEAD 验证连接和认证
      const method = isNative ? 'HEAD' : 'PROPFIND'
      const headers = isNative ? authHeaders() : { ...authHeaders(), Depth: '0' }
      const res = await webdavFetch(url, method, headers)
      // PROPFIND 成功返回 207；HEAD 成功返回 200/207
      if (res.status === 207 || (isNative && res.status >= 200 && res.status < 300)) {
        testStatus.value = 'success'
        return true
      }
      testStatus.value = 'failed'
      if (res.status === 401 || res.status === 403) {
        testError.value = '认证失败，请检查用户名和密码'
      } else if (res.status === 404) {
        testError.value = '路径不存在。' + getPathHint(config.value.serverUrl)
      } else if (res.status === 405) {
        testError.value = '服务器不支持 WebDAV'
      } else {
        testError.value = `服务器返回 ${res.status}`
      }
      return false
    } catch (e: unknown) {
      testStatus.value = 'failed'
      const msg = e instanceof Error ? e.message : ''
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('fetch')) {
        testError.value = '网络错误，请检查地址是否正确'
      } else {
        testError.value = msg || '连接失败'
      }
      return false
    }
  }

  /** 确保远程目录存在（MKCOL），已存在时 405/409 属正常情况 */
  const ensureDirectory = async (): Promise<void> => {
    const url = fullDirUrl()
    if (!url) return
    try {
      await webdavFetch(url, 'MKCOL', authHeaders())
    } catch {
      /* 忽略：目录创建失败不阻塞上传流程 */
    }
  }

  /** 上传存档到 WebDAV */
  const uploadSave = async (slot: number): Promise<{ success: boolean; message: string }> => {
    const raw = localStorage.getItem(`${SAVE_KEY_PREFIX}${slot}`)
    if (!raw) return { success: false, message: '本地存档不存在。' }
    try {
      let res = await webdavFetch(
        remoteFilePath(slot),
        'PUT',
        {
          ...authHeaders(),
          'Content-Type': 'application/octet-stream'
        },
        raw
      )
      // 404 通常是远程目录不存在，尝试 MKCOL 创建后重试
      if (res.status === 404) {
        await ensureDirectory()
        res = await webdavFetch(
          remoteFilePath(slot),
          'PUT',
          {
            ...authHeaders(),
            'Content-Type': 'application/octet-stream'
          },
          raw
        )
      }
      if (res.status >= 200 && res.status < 300) {
        return { success: true, message: `存档 ${slot + 1} 已上传到云端。` }
      }
      if (res.status === 404) {
        return { success: false, message: '上传路径无效。' + getPathHint(config.value.serverUrl) }
      }
      return { success: false, message: `上传失败（${res.status}）。` }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '未知错误'
      return { success: false, message: `上传失败：${msg}` }
    }
  }

  /** 从 WebDAV 下载存档 */
  const downloadSave = async (slot: number): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await webdavFetch(remoteFilePath(slot), 'GET', authHeaders())
      if (res.status === 404) {
        return { success: false, message: `云端不存在存档 ${slot + 1}。` }
      }
      if (res.status < 200 || res.status >= 300) {
        return { success: false, message: `下载失败（${res.status}）。` }
      }
      if (!parseSaveData(res.data)) {
        return { success: false, message: '云端存档数据无效或已损坏。' }
      }
      localStorage.setItem(`${SAVE_KEY_PREFIX}${slot}`, res.data)
      return { success: true, message: `存档 ${slot + 1} 已从云端下载。` }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '未知错误'
      return { success: false, message: `下载失败：${msg}` }
    }
  }

  /** 列出远程存档是否存在 */
  const listRemoteSaves = async (): Promise<{ slot: number; exists: boolean }[]> => {
    const results: { slot: number; exists: boolean }[] = []
    for (let i = 0; i < MAX_SLOTS; i++) {
      try {
        const res = await webdavFetch(remoteFilePath(i), 'HEAD', authHeaders())
        results.push({ slot: i, exists: res.status >= 200 && res.status < 300 })
      } catch {
        results.push({ slot: i, exists: false })
      }
    }
    return results
  }

  return {
    webdavConfig,
    webdavTestStatus,
    webdavTestError,
    webdavReady,
    saveConfig,
    testConnection,
    uploadSave,
    downloadSave,
    listRemoteSaves
  }
}
