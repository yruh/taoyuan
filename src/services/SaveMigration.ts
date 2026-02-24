export const CURRENT_SAVE_VERSION = 2

type MigrationFn = (data: Record<string, any>) => Record<string, any>

const cloneSaveData = <T extends Record<string, any>>(data: T): T => {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(data)
  }
  return JSON.parse(JSON.stringify(data)) as T
}

/** 迁移函数链：key = 源版本号 */
const MIGRATIONS: Record<number, MigrationFn> = {
  // v0 (无版本号的旧存档) → v1
  0: (data) => {
    data.version = 1
    data.warehouse ??= { unlocked: false, items: [], capacity: 30 }
    data.breeding ??= { breedingBox: [], stations: [], stationCount: 0, compendium: [], unlocked: false }
    data.museum ??= { donatedItems: [], claimedMilestones: [] }
    data.guild ??= { monsterKills: {}, claimedGoals: [], encounteredMonsters: [] }
    data.secretNote ??= { collectedNotes: [], usedNotes: [] }
    data.hanhai ??= { unlocked: false, casinoBetsToday: 0 }
    data.fishPond ??= {
      pond: { built: false, level: 1, fish: [], waterQuality: 100, fedToday: false, breeding: null, collectedToday: false },
      pendingProducts: [],
      discoveredBreeds: []
    }
    return data
  },
  // v1 → v2（当前版本）
  1: (data) => {
    data.version = 2
    // 确保 player 有 hp 字段
    if (data.player) {
      data.player.hp ??= 100
      data.player.baseMaxHp ??= 100
    }
    // 确保 skill 有 combat
    if (data.skill?.skills && !data.skill.skills.find((s: any) => s.type === 'combat')) {
      data.skill.skills.push({ type: 'combat', exp: 0, level: 0, perk5: null, perk10: null })
    }
    return data
  }
}

/** 执行迁移链 */
export const migrateSaveData = (data: Record<string, any>): { data: Record<string, any>; migrated: boolean; error?: string } => {
  const originalVersion = data.version ?? 0
  let current: Record<string, any>
  try {
    current = cloneSaveData(data)
  } catch (e) {
    return { data, migrated: false, error: `存档数据复制失败：${e}` }
  }
  let version = originalVersion

  while (version < CURRENT_SAVE_VERSION) {
    const fn = MIGRATIONS[version]
    if (!fn) {
      return { data, migrated: false, error: `未知的存档版本 ${version}，无法迁移` }
    }
    try {
      current = fn(current)
      version = current.version ?? version + 1
    } catch (e) {
      return { data, migrated: false, error: `存档从 v${version} 迁移失败：${e}` }
    }
  }

  return { data: current, migrated: version !== originalVersion }
}
