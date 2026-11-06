import { ESTIMATE_NOTE } from '../data/adviceCopy'
import { pickOption, type ActionOption } from './adviceOptions'
import { GROUP_LABEL, resolveGroups } from './dietGroups'
import type { DietGroup, EatingProfile, FoodLog, FoodItem, Meal } from './types'

export interface MealObservation {
  meal: Meal
  present: DietGroup[]
  /** 中性观察，最多 2 条 */
  noted: string[]
  /** 至多 1 个可选动作 */
  option?: ActionOption
  estimateNote: string
  /** 用户关闭评价 / 数据不足 → 只显示记录 */
  skipped: boolean
}

/**
 * 每餐只做「中性观察 + 至多一个可选动作」，不评分、不定性好坏。
 * 依据：单日/单餐数据不足以计算膳食质量指数（HEI/CHEI 需多日 habitual intake），
 * 单餐供能比也不适合用 AMDR（那是整日口径）。
 */
export function buildMealObservation(
  logs: FoodLog[],
  meal: Meal,
  profile: EatingProfile,
  lookup?: (name: string) => FoodItem | undefined,
): MealObservation {
  const mine = logs.filter((l) => l.meal === meal)
  const base: MealObservation = {
    meal,
    present: [],
    noted: [],
    estimateNote: ESTIMATE_NOTE,
    skipped: true,
  }

  if (!profile.reviewEnabled) return base
  if (mine.length === 0) return base

  const present = [...new Set(mine.flatMap((l) => resolveGroups(l, lookup)))]
  if (present.length === 0) {
    return { ...base, noted: [`这一餐记了 ${mine.length} 条，暂时看不出搭配`] }
  }

  const has = (g: DietGroup) => present.includes(g)
  const noted: string[] = []

  if (meal !== 'snack') {
    if (has('grain') && has('animalProtein') && !has('vegetable')) {
      noted.push('这一餐记录到主食和蛋白，没看到蔬菜')
    } else if (has('vegetable') && has('darkVegetable')) {
      noted.push('这一餐有蔬菜，其中记到了深色菜')
    } else if (has('vegetable')) {
      noted.push('这一餐有蔬菜')
    } else if (!has('grain')) {
      noted.push('这一餐没记录到主食')
    }
    if (!has('animalProtein') && !has('soyNut') && noted.length < 2) {
      noted.push('这一餐没记录到肉蛋豆')
    }
    if (!has('vegetable') && noted.length < 2) noted.push('这一餐没记录到蔬菜')
  } else {
    noted.push(`这一餐记了 ${mine.length} 条`)
  }

  // 只有结构上明显缺一块才给一个可选动作；早/加餐不给
  let option: ActionOption | undefined
  if (meal === 'lunch' || meal === 'dinner') {
    const ctx = mine.find((l) => l.context)?.context
    if (!has('vegetable')) option = pickOption('vegetable', profile, ctx) ?? undefined
    else if (!has('grain')) option = pickOption('wholeGrain', profile, ctx) ?? undefined
    else if (!has('animalProtein') && !has('soyNut')) {
      option = pickOption('animalProtein', profile, ctx) ?? undefined
    }
  }

  return {
    meal,
    present,
    noted: noted.slice(0, 2),
    option,
    estimateNote: ESTIMATE_NOTE,
    skipped: false,
  }
}

export function presentLabels(present: DietGroup[]): string[] {
  return present.map((g) => GROUP_LABEL[g])
}
