/** 瀚海商店物品定义 */
export interface HanhaiShopItemDef {
  itemId: string
  name: string
  price: number
  description: string
  /** 每周限购数量（0或不填=不限购） */
  weeklyLimit?: number
}

/** 赌坊游戏类型 */
export type CasinoGameType = 'roulette' | 'dice' | 'cup' | 'cricket' | 'cardflip' | 'texas' | 'buckshot'

/** 蛐蛐定义 */
export interface CricketDef {
  id: string
  name: string
  description: string
}

/** 轮盘赔率档位 */
export interface RouletteOutcome {
  label: string
  multiplier: number
  /** 概率百分比（所有项之和应为100） */
  chance: number
}

// === 瀚海扑克 ===

export type PokerSuit = 'spade' | 'heart' | 'diamond' | 'club'
export type PokerRank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14

export interface PokerCard {
  suit: PokerSuit
  rank: PokerRank
}

export type PokerHandType =
  | 'royal_flush'
  | 'straight_flush'
  | 'four_kind'
  | 'full_house'
  | 'flush'
  | 'straight'
  | 'three_kind'
  | 'two_pair'
  | 'one_pair'
  | 'high_card'

export interface PokerHandResult {
  type: PokerHandType
  /** 牌型优先级（越大越强） */
  typeRank: number
  /** 用于同类型比较的排序值数组（降序） */
  ranks: number[]
  label: string
}

export type TexasStreet = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'
export type PokerActionType = 'check' | 'raise' | 'call' | 'fold' | 'allin'
export type TexasTierId = 'beginner' | 'normal' | 'expert'

export interface TexasTierDef {
  id: TexasTierId
  name: string
  /** 入场费（= 双方初始筹码） */
  entryFee: number
  /** 大盲注 */
  blind: number
  /** 每局抽水（荷官小费） */
  rake: number
  /** 入场最低持有金钱 */
  minMoney: number
  /** 每次入场可对局手数 */
  rounds: number
}

export interface TexasSetup {
  playerHole: PokerCard[]
  dealerHole: PokerCard[]
  /** 预发5张，组件按街逐步展示 */
  community: PokerCard[]
  /** 场次配置 */
  tier: TexasTierDef
}

// === 恶魔轮盘 ===

export type ShellType = 'live' | 'blank'

export interface BuckshotSetup {
  shells: ShellType[]
  playerHP: number
  dealerHP: number
}
