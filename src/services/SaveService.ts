export interface StorageAdapter {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}

/** localStorage 适配器（当前行为） */
export class LocalStorageAdapter implements StorageAdapter {
  async getItem(key: string) { return localStorage.getItem(key) }
  async setItem(key: string, value: string) { localStorage.setItem(key, value) }
  async removeItem(key: string) { localStorage.removeItem(key) }
}

/** 创建适配器：当前使用 localStorage */
export const createAdapter = (): StorageAdapter => {
  return new LocalStorageAdapter()
}
