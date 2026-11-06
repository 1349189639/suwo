import { FOODS } from './foods'
import { careScore } from '../domain/care'
import { summarizeDay } from '../domain/day'
import type { AppData, CareTag, FoodItem } from '../domain/types'

export interface Suggestion {
  name: string
  grams: number
  kcal: number
  reason: string
}

export interface RecommendResult {
  items: Suggestion[]
  kcal: number
  note: string
}

const SLOTS: { key: string; label: string; cats: FoodItem['category'][]; share: number }[] = [
  { key: 'protein', label: '蛋白', cats: ['protein', 'seafood', 'soy'], share: 0.38 },
  { key: 'veg', label: '蔬菜', cats: ['veg'], share: 0.12 },
  { key: 'staple', label: '主食', cats: ['staple'], share: 0.34 },
]

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/**
 * 「今天可以这样吃」：确定性配餐，同一份数据永远给同一结果。
 *
 * 只用三件事：① 今天还剩多少额度；② 你的减脂/减肥目标；③ 你选的调理关注点。
 * 不调用任何模型，所以每一种推荐都能解释、能复算。
 */
export function recommendToday(data: AppData, date: string): RecommendResult {
  const day = summarizeDay(data, date)
  const cares: CareTag[] = data.goal?.cares ?? []
  const remaining = Math.max(0, day.remaining)

  if (remaining < 180) {
    return {
      items: [],
      kcal: 0,
      note: '今天额度基本用完了。真饿的话优先黄瓜、番茄这类低能量蔬菜，别再补主食。',
    }
  }

  const items: Suggestion[] = []

  for (const slot of SLOTS) {
    const pool = FOODS.filter((f) => slot.cats.includes(f.category))
    if (pool.length === 0) continue

    const scored = pool
      .map((f) => {
        const kcal100 = Math.max(1, f.per100.kcal)
        const proteinShare = (f.per100.p * 4) / kcal100
        const fatShare = (f.per100.f * 9) / kcal100
        let score = 0
        if (slot.key === 'protein') score += proteinShare * 40
        if (slot.key === 'veg') score += (f.per100.fiber ?? 0) * 8
        if (slot.key === 'staple') score += (f.per100.fiber ?? 0) * 12 - fatShare * 10
        score += (f.per100.fiber ?? 0) * 2
        if (fatShare > 0.45) score -= 18
        for (const c of cares) score += careScore(f, c) * 12
        return { f, score }
      })
      .sort((a, b) => b.score - a.score || a.f.name.localeCompare(b.f.name))

    const best = scored[0]?.f
    if (!best) continue

    const budget = remaining * slot.share
    const gramsRaw = (budget / Math.max(1, best.per100.kcal)) * 100
    const grams = clamp(Math.round(gramsRaw / 10) * 10, 50, 300)
    const kcal = Math.round((best.per100.kcal * grams) / 100)

    items.push({ name: best.name, grams, kcal, reason: reasonFor(best, cares, slot.key) })
  }

  const kcal = items.reduce((a, b) => a + b.kcal, 0)
  const careText = cares.length > 0 ? '，并避开了你关注项里要少吃的' : ''
  return {
    items,
    kcal,
    note: `按今天还剩 ${Math.round(remaining)} kcal 配的${careText}；可以整份记进某一餐，也可以只挑一两样。`,
  }
}

/** 一句话说明为什么推它——必须能对应到具体指标，不说「养生」这种空话 */
function reasonFor(food: FoodItem, cares: CareTag[], slot: string): string {
  const bits: string[] = []
  const proteinShare = (food.per100.p * 4) / Math.max(1, food.per100.kcal)
  const fatShare = (food.per100.f * 9) / Math.max(1, food.per100.kcal)
  if (proteinShare > 0.3) bits.push(`蛋白密度高（${food.per100.p}g/100g）`)
  if ((food.per100.fiber ?? 0) >= 2) bits.push('纤维不错')
  if (fatShare < 0.2) bits.push('低脂')
  if (slot === 'staples') bits.push('主食')
  for (const c of cares) {
    const s = careScore(food, c)
    if (s > 0) bits.push(`符合${careLabel(c)}关注点`)
  }
  if (bits.length === 0) bits.push('常见做法、好搭配')
  return bits.slice(0, 2).join('、')
}

function careLabel(c: CareTag): string {
  return { digest: '脾胃', cardio: '心肺', liver: '肝', bone: '骨骼', iron: '气血', sugar: '血糖' }[c]
}
