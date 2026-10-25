import { ageFromYear, dateKey, daysBetween, todayKey } from './date'
import type { ActivityLevel, Gender, Goal, GoalType, MacroSet, Profile } from './types'

export const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
}

export const ACTIVITY_LABEL: Record<ActivityLevel, string> = {
  sedentary: '久坐',
  light: '轻度活动',
  moderate: '中度活动',
  active: '高强度',
}

export const ACTIVITY_HINT: Record<ActivityLevel, string> = {
  sedentary: '办公室为主，几乎不运动',
  light: '每周运动 1–3 次',
  moderate: '每周运动 3–5 次',
  active: '每周运动 6–7 次或体力工作',
}

/** 1 千克脂肪约等于 7700 kcal */
export const KCAL_PER_KG = 7700

export const KCAL_FLOOR: Record<Gender, number> = { male: 1500, female: 1200 }

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

export function round1(v: number): number {
  return Math.round(v * 10) / 10
}

/** Mifflin-St Jeor 基础代谢 */
export function calcBmr(
  gender: Gender,
  weightKg: number,
  heightCm: number,
  birthYear: number,
  now = new Date(),
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageFromYear(birthYear, now)
  return base + (gender === 'male' ? 5 : -161)
}

/** 每日总消耗（含日常活动，不含额外训练） */
export function calcTdee(profile: Profile, weightKg: number, now = new Date()): number {
  const bmr = calcBmr(profile.gender, weightKg, profile.heightCm, profile.birthYear, now)
  return bmr * ACTIVITY_FACTOR[profile.activity]
}

export function calcBmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100
  if (m <= 0) return 0
  return weightKg / (m * m)
}

export type BmiKey = 'under' | 'normal' | 'over' | 'obese'

export interface BmiBand {
  key: BmiKey
  label: string
  color: string
}

/** 中国标准 WS/T 428-2013 */
export function bmiBand(value: number): BmiBand {
  if (value < 18.5) return { key: 'under', label: '偏瘦', color: '#63a4ff' }
  if (value < 24) return { key: 'normal', label: '正常', color: '#3ddc97' }
  if (value < 28) return { key: 'over', label: '超重', color: '#f5b942' }
  return { key: 'obese', label: '肥胖', color: '#ff6b81' }
}

/**
 * 按目标体重与期限反推每日热量差。
 * 返回正数表示缺口（少吃），负数表示盈余（多吃）。
 */
export function plannedDelta(
  weightKg: number,
  targetWeightKg: number | undefined,
  deadline: string | undefined,
  from = todayKey(),
): number | null {
  if (!targetWeightKg || !deadline) return null
  const days = daysBetween(from, deadline)
  if (days < 5) return null
  return ((weightKg - targetWeightKg) * KCAL_PER_KG) / days
}

export interface CalorieTarget {
  kcal: number
  base: number
  /** 正数 = 缺口，负数 = 盈余 */
  delta: number
  floored: boolean
  /** 按期限反推的每日差额，未设定期限时为 null */
  planned: number | null
  /** 缺口很小（<120 kcal），说明期限宽松 */
  gentle: boolean
}

export function dailyKcalTarget(
  profile: Profile,
  weightKg: number,
  goal: Goal,
  now = new Date(),
): CalorieTarget {
  const base = calcTdee(profile, weightKg, now)
  const planned = plannedDelta(weightKg, goal.targetWeightKg, goal.deadline, dateKey(now))

  let delta = 0
  if (goal.type === 'cut') {
    // 设了期限就按期限反推，只封顶不设下限——否则长期限会被强行拉到 250，
    // 导致「24 周」和「预计 1 个月达成」自相矛盾。
    delta = planned !== null && planned > 0 ? Math.round(Math.min(planned, 750)) : 400
  } else if (goal.type === 'bulk') {
    delta = planned !== null && planned < 0 ? -Math.round(Math.min(-planned, 500)) : -250
  }

  const rawKcal = base - delta
  const floor = KCAL_FLOOR[profile.gender]
  const floored = goal.type === 'cut' && rawKcal < floor
  const kcal = Math.round(floored ? floor : rawKcal)

  return {
    kcal,
    base: Math.round(base),
    delta,
    floored,
    planned: planned === null ? null : Math.round(planned),
    gentle: goal.type !== 'maintain' && Math.abs(delta) < 120,
  }
}

/** 三大宏量目标：蛋白按体重，脂肪按热量占比，碳水补齐 */
export function macroTarget(type: GoalType, weightKg: number, kcal: number): MacroSet {
  const perKg = type === 'cut' ? 1.8 : type === 'bulk' ? 2.0 : 1.4
  const protein = Math.round(perKg * weightKg)
  const fat = Math.round(Math.max(0.8 * weightKg, (kcal * 0.25) / 9))
  const carb = Math.round(Math.max(0, (kcal - protein * 4 - fat * 9) / 4))
  return { kcal, p: protein, c: carb, f: fat }
}

/** 按目标体重推算预计达成日期 */
export function estimateFinishDate(weightKg: number, target: number, delta: number, from = todayKey()): string | null {
  if (!delta) return null
  const diff = weightKg - target
  if (Math.sign(diff) !== Math.sign(delta)) return null
  const days = Math.round((Math.abs(diff) * KCAL_PER_KG) / Math.abs(delta))
  if (!Number.isFinite(days) || days <= 0 || days > 1500) return null
  const d = new Date(from)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
