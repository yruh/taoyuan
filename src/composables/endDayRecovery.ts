import { MIDNIGHT_HOUR, PASSOUT_HOUR } from '@/data/timeConstants'

export type EndDayRecoveryMode = 'normal' | 'late' | 'passout'

export const getEndDayRecoveryMode = (hour: number, forcedPassout = false): EndDayRecoveryMode => {
  if (forcedPassout || hour >= PASSOUT_HOUR) return 'passout'
  if (hour >= MIDNIGHT_HOUR) return 'late'
  return 'normal'
}
