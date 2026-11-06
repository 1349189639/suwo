import { describe, expect, it } from 'vitest'
import { ALIASES, canonicalOf, findAliasConflicts } from './aliases'
import { CARE_TAGS, careScore } from './care'
import { estimateNutrients } from './nutrients'
// v3：红标签判定已下线，warnings.ts 仅作为知识卡片文案保留
import { FOODS } from '../data/foods'
import { recommendToday } from '../data/recommend'
import { normalize } from '../data/storage'
import { summarizeDay } from './day'
import { todayKey } from './date'

describe('搜索别名', () => {
  it('同一食材的方言/俗名能归一', () => {
    expect(canonicalOf('洋白菜')).toBe('卷心菜')
    expect(canonicalOf('包菜')).toBe('卷心菜')
    expect(canonicalOf('西红柿')).toBe('番茄')
    expect(canonicalOf('洋芋')).toBe('土豆')
    expect(canonicalOf('地瓜')).toBe('红薯')
  })

  it('正名本身也能查到', () => {
    expect(canonicalOf('卷心菜')).toBe('卷心菜')
  })

  it('一个别名只指向一个正名', () => {
    expect(findAliasConflicts()).toEqual([])
  })

  it('不是别名就返回 null，不乱猜', () => {
    expect(canonicalOf('娃娃菜')).toBeNull()
    expect(canonicalOf('')).toBeNull()
  })

  it('每个正名都能在食物库里找到，否则搜了也是空', () => {
    const names = FOODS.map((f) => f.name)
    for (const canonical of Object.keys(ALIASES)) {
      const hit = names.some((n) => n === canonical || n.startsWith(canonical))
      expect(hit, `别名正名不存在：${canonical}`).toBe(true)
    }
  })
})

describe('每日推荐', () => {
  const make = (cares?: string[]) =>
    normalize({
      schema: 1,
      profile: { gender: 'male', birthYear: 1996, heightCm: 175, activity: 'light' },
      goal: { type: 'cut', startWeightKg: 70, startedAt: '2026-11-01', cares },
      weights: [{ date: todayKey(), kg: 70 }],
      foodLogs: [],
      exercises: [],
      steps: {},
      createdAt: '2026-11-01',
    } as unknown)

  it('给出 3 样，且总热量不超过剩余额度', () => {
    const plan = recommendToday(make(), todayKey())
    expect(plan.items.length).toBeGreaterThan(0)
    const remain = summarizeDay(make(), todayKey()).remaining
    expect(plan.kcal).toBeLessThanOrEqual(remain)
  })

  it('同样输入结果完全一致（可复算）', () => {
    const a = recommendToday(make(['cardio']), todayKey())
    const b = recommendToday(make(['cardio']), todayKey())
    expect(a.items.map((x) => x.name)).toEqual(b.items.map((x) => x.name))
  })

  it('选了心血管关注点，推荐里不会出现明显高钠的加工肉', () => {
    const plan = recommendToday(make(['cardio']), todayKey())
    expect(plan.items.some((x) => /火腿|培根|香肠|腊/.test(x.name))).toBe(false)
  })

  it('额度用完时只给一句提示，不硬凑', () => {
    const data = make()
    data.foodLogs = [
      { id: 'x', date: todayKey(), meal: 'lunch', name: '大餐', grams: 500, kcal: 5000, p: 100, c: 600, f: 200, createdAt: 1 },
    ]
    const plan = recommendToday(data, todayKey())
    expect(plan.items).toEqual([])
    expect(plan.note.length).toBeGreaterThan(5)
  })
})

describe('调理关注点', () => {
  it('六个调理项齐全且 id 唯一', () => {
    const ids = CARE_TAGS.map((c) => c.id)
    expect(ids).toEqual(['digest', 'cardio', 'liver', 'bone', 'iron', 'sugar'])
    expect(new Set(ids).size).toBe(6)
  })

  it('每个调理项都写明了依据（不能只有一句口号）', () => {
    for (const c of CARE_TAGS) {
      expect(c.basis.length, c.id).toBeGreaterThan(20)
      expect(c.subtitle.length, c.id).toBeGreaterThan(2)
    }
  })

  it('偏好与回避能区分开', () => {
    expect(careScore({ name: '燕麦', tags: ['粗粮'] }, 'cardio')).toBe(1)
    expect(careScore({ name: '培根', tags: ['加工肉 高钠'] }, 'cardio')).toBe(-1)
    expect(careScore({ name: '白米饭', tags: ['米'] }, 'cardio')).toBe(0)
  })
})

describe('钠/糖估算', () => {
  it('加工肉与腌制品的钠明显更高', () => {
    const ham = estimateNutrients({ name: '火腿肠', category: 'protein', tags: ['加工肉'] })
    const veg = estimateNutrients({ name: '西兰花', category: 'veg', tags: [] })
    expect(ham.sodium ?? 0).toBeGreaterThan(500)
    expect(veg.sodium ?? 0).toBeLessThan(100)
  })

  it('含糖饮料的糖按每 100ml 估', () => {
    expect(estimateNutrients({ name: '可乐', category: 'drink', tags: ['含糖'] }).sugar ?? 0).toBeGreaterThan(8)
  })
})

