import { NORMALIZING_LINES, WEEK_DISCLAIMER } from '../data/adviceCopy'
import { pickOptions, type ActionOption } from './adviceOptions'
import { GROUP_LABEL, resolveGroups } from './dietGroups'
import { lastNDates, todayKey } from './date'
import type { DietGroup, EatingProfile, FoodItem, FoodLog } from './types'

export interface WeekDietReview {
  window: { from: string; to: string; loggedDays: number; totalDays: number }
  sufficient: boolean
  coverage: Record<DietGroup, { days: number; times: number }>
  diversity: { distinctFoods: number; distinctGroups: number }
  regularity: { breakfastLoggedDays: number; lateNightLoggedDays: number }
  /** 最多 3 条，全部「记录到 X」句式 */
  observations: string[]
  /** 最多 2 条，优先零成本 */
  options: ActionOption[]
  compareToLastWeek?: { group: DietGroup; thisWeek: number; lastWeek: number }
  normalizing?: string
  disclaimer: string
}

const EMPTY_COVERAGE = (): Record<DietGroup, { days: number; times: number }> => ({
  grain: { days: 0, times: 0 },
  wholeGrain: { days: 0, times: 0 },
  vegetable: { days: 0, times: 0 },
  darkVegetable: { days: 0, times: 0 },
  fruit: { days: 0, times: 0 },
  animalProtein: { days: 0, times: 0 },
  aquatic: { days: 0, times: 0 },
  dairy: { days: 0, times: 0 },
  soyNut: { days: 0, times: 0 },
  sugaryDrink: { days: 0, times: 0 },
  ultraProcessed: { days: 0, times: 0 },
})

/** 周日 = Saturday(6) / Sunday(0) */
function isWeekend(date: string): boolean {
  const w = new Date(`${date}T00:00:00`).getDay()
  return w === 0 || w === 6
}

/**
 * 周层评价：只报「食物组覆盖与频次」，不评分、不排名、不与别人比。
 * 充分性闸门：至少记录 3 天，且其中至少 1 天是周末/休息日——不足就只说明"还看不出一周的样子"。
 */
export function buildWeekReview(
  allLogs: FoodLog[],
  profile: EatingProfile,
  end = todayKey(),
  previousLogs?: FoodLog[],
  lookup?: (name: string) => FoodItem | undefined,
): WeekDietReview {
  const dates = lastNDates(end, 7)
  const from = dates[0]
  const to = dates[dates.length - 1]
  const logs = allLogs.filter((l) => dates.includes(l.date))
  const loggedDates = [...new Set(logs.map((l) => l.date))]
  const loggedDays = loggedDates.length
  const weekendLogged = loggedDates.some(isWeekend)
  const sufficient = profile.reviewEnabled && loggedDays >= 3 && weekendLogged

  const coverage = EMPTY_COVERAGE()
  const perGroupDays = new Map<DietGroup, Set<string>>()
  for (const log of logs) {
    for (const g of resolveGroups(log, lookup)) {
      coverage[g].times += 1
      if (!perGroupDays.has(g)) perGroupDays.set(g, new Set())
      perGroupDays.get(g)!.add(log.date)
    }
  }
  for (const [g, set] of perGroupDays) coverage[g].days = set.size

  const distinctFoods = new Set(logs.map((l) => l.name)).size
  const distinctGroups = new Set(logs.flatMap((l) => resolveGroups(l, lookup))).size
  const breakfastLoggedDays = new Set(logs.filter((l) => l.meal === 'breakfast').map((l) => l.date)).size
  const lateNightLoggedDays = new Set(
    logs
      .filter((l) => {
        const h = new Date(l.createdAt).getHours()
        return h >= 22 || h <= 3
      })
      .map((l) => l.date),
  ).size

  const base: WeekDietReview = {
    window: { from, to, loggedDays, totalDays: 7 },
    sufficient,
    coverage,
    diversity: { distinctFoods, distinctGroups },
    regularity: { breakfastLoggedDays, lateNightLoggedDays },
    observations: [],
    options: [],
    disclaimer: WEEK_DISCLAIMER,
  }

  if (!sufficient) {
    return {
      ...base,
      observations: [
        loggedDays === 0
          ? '这周还没有记录到餐次。'
          : `这周记录到 ${loggedDays} 天，还看不出一周的样子。想看趋势的话，随手记几天就行。`,
      ],
      options: [],
    }
  }

  const observations: string[] = [
    `这周有 ${coverage.vegetable.days} 天记到了蔬菜，其中 ${coverage.darkVegetable.times} 次是深色菜`,
    `这周有 ${coverage.fruit.days} 天记到了水果；记到奶或豆制品 ${coverage.dairy.days + coverage.soyNut.days > 7 ? 7 : coverage.dairy.days + coverage.soyNut.days} 天`,
    `这周记到鱼虾 ${coverage.aquatic.times} 次、粗粮或薯类 ${coverage.wholeGrain.days} 天`,
    `这周记到 ${distinctFoods} 种食物（按记录计，不是全部饮食）`,
  ]

  const gaps: DietGroup[] = []
  if (coverage.vegetable.days < Math.ceil(loggedDays / 2)) gaps.push('vegetable')
  if (coverage.fruit.days < 2) gaps.push('fruit')
  if (coverage.dairy.days + coverage.soyNut.days < 2) gaps.push('dairy')
  if (coverage.aquatic.times === 0) gaps.push('aquatic')

  return {
    ...base,
    observations: observations.slice(0, 3),
    options: pickOptions(gaps, profile, 2),
    normalizing: NORMALIZING_LINES[0],
    compareToLastWeek: compare(previousLogs, logs, dates, lookup),
  }
}

/** 只和自己上周比，且两周都必须充分 */
function compare(
  previousLogs: FoodLog[] | undefined,
  thisWeekLogs: FoodLog[],
  dates: string[],
  lookup?: (name: string) => FoodItem | undefined,
): WeekDietReview['compareToLastWeek'] {
  if (!previousLogs) return undefined
  const prevDates = lastNDates(dates[0], 8).slice(0, 7)
  const prev = previousLogs.filter((l) => prevDates.includes(l.date))
  const prevDays = new Set(prev.map((l) => l.date)).size
  if (prevDays < 3) return undefined
  const count = (list: FoodLog[], g: DietGroup) =>
    list.filter((l) => resolveGroups(l, lookup).includes(g)).length
  const group: DietGroup = 'aquatic'
  return { group, thisWeek: count(thisWeekLogs, group), lastWeek: count(prev, group) }
}

export { GROUP_LABEL }
