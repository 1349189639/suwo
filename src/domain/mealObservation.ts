import { pickOption, type ActionOption } from './adviceOptions'
import { resolveGroups } from './dietGroups'
import type { DietGroup, EatingProfile, FoodLog, FoodItem, Meal } from './types'

export interface MealObservation {
  meal: Meal
  present: DietGroup[]
  /** 中性观察，最多 2 条；用用户自己记下的食物名说话 */
  noted: string[]
  /** 至多 1 个可选动作 */
  option?: ActionOption
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
  const base: MealObservation = { meal, present: [], noted: [], skipped: true }

  if (!profile.reviewEnabled) return base
  if (mine.length === 0) return base

  const present = [...new Set(mine.flatMap((l) => resolveGroups(l, lookup)))]
  const names = mine.slice(0, 3).map((l) => l.name)
  const more = mine.length > 3 ? ` 等 ${mine.length} 样` : ''
  const opening = `这顿记了${names.join('、')}${more}`

  if (present.length === 0) {
    return { ...base, noted: [opening] }
  }

  const has = (g: DietGroup) => present.includes(g)
  const noted: string[] = [opening]

  if (meal !== 'snack') {
    if (!has('vegetable')) noted.push('这顿没记到蔬菜')
    else if (has('darkVegetable')) noted.push('里面有深色菜')
    else if (!has('grain')) noted.push('这顿没记到主食')
    else if (!has('animalProtein') && !has('soyNut')) noted.push('这顿没记到肉蛋豆')
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

  return { meal, present, noted: noted.slice(0, 2), option, skipped: false }
}
