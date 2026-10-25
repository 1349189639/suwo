import { addDays } from './date'
import { clamp } from './nutrition'

export interface DayInput {
  /** 当天是否有任何饮食记录；没有则返回 null，不参与评分 */
  hasLog: boolean
  intakeKcal: number
  targetKcal: number
  protein: number
  proteinTarget: number
  steps: number
  exerciseMinutes: number
}

/**
 * 热量得分：目标 ±10% 满分，偏离 40% 归零，中间线性。
 * 吃太少同样扣分——极低摄入不是"自律"。
 */
export function kcalScore(intakeKcal: number, targetKcal: number): number {
  if (targetKcal <= 0) return 0
  const dev = Math.abs(intakeKcal - targetKcal) / targetKcal
  if (dev <= 0.1) return 1
  if (dev >= 0.4) return 0
  return 1 - (dev - 0.1) / 0.3
}

export function proteinScore(protein: number, target: number): number {
  if (target <= 0) return 0
  return clamp(protein / target, 0, 1)
}

export function activityScore(steps: number, exerciseMinutes: number): number {
  const stepPart = clamp(steps / 8000, 0, 1)
  const movePart = clamp(exerciseMinutes / 30, 0, 1)
  return 0.5 * stepPart + 0.5 * movePart
}

/** 单日自律指数 0–1；未记录返回 null */
export function dayScore(input: DayInput): number | null {
  if (!input.hasLog) return null
  const score =
    0.5 * kcalScore(input.intakeKcal, input.targetKcal) +
    0.3 * proteinScore(input.protein, input.proteinTarget) +
    0.2 * activityScore(input.steps, input.exerciseMinutes)
  return clamp(score, 0, 1)
}

/** 周指数 = 有记录日子的均值；全周空白返回 null */
export function weekScore(dayScores: (number | null)[]): number | null {
  const valid = dayScores.filter((s): s is number => s !== null)
  if (valid.length === 0) return null
  return valid.reduce((a, b) => a + b, 0) / valid.length
}

/**
 * 连续打卡天数。今天还没记录时从昨天开始算，
 * 避免每天早上一打开就看到断签。
 */
export function computeStreak(datesWithLogs: Set<string>, today: string): number {
  let cursor = datesWithLogs.has(today) ? today : addDays(today, -1)
  let n = 0
  while (datesWithLogs.has(cursor) && n < 3650) {
    n += 1
    cursor = addDays(cursor, -1)
  }
  return n
}

/** 精神状态 0–100：周指数为主，连续打卡给小加成 */
export function spiritFrom(score: number | null, streak: number): number {
  if (score === null) return 50
  const base = score * 100 * 0.88
  const bonus = Math.min(14, streak * 1.2)
  return Math.round(clamp(base + bonus, 0, 100))
}

export function spiritLabel(spirit: number): string {
  if (spirit >= 80) return '状态极佳'
  if (spirit >= 60) return '状态不错'
  if (spirit >= 40) return '有点懈怠'
  if (spirit >= 20) return '需要动起来'
  return '快醒醒'
}
