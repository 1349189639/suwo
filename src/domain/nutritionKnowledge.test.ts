import { describe, expect, it } from 'vitest'
import { GROUP_INFO, GROUP_NUTRIENTS } from './dietGroups'
import { CARE_GROUP_HINT, CARE_TAGS } from './care'
import { HIGHLIGHT_INFO, nutrientKnowledge } from './highlights'
import { buildMealObservation } from './mealObservation'
import { buildWeekReview } from './weekDiet'
import { DEFAULT_EATING_PROFILE, type DietGroup, type FoodLog } from './types'

const GROUPS: DietGroup[] = [
  'grain',
  'wholeGrain',
  'vegetable',
  'darkVegetable',
  'fruit',
  'animalProtein',
  'aquatic',
  'dairy',
  'soyNut',
  'sugaryDrink',
  'ultraProcessed',
]

describe('食物组知识卡片', () => {
  it('11 个组都有 tip', () => {
    expect(Object.keys(GROUP_INFO)).toHaveLength(11)
    for (const g of GROUPS) expect(GROUP_INFO[g].tip.length).toBeGreaterThan(6)
  })

  it('含糖饮料 / 深加工 不出现「加一份」「多拿」「换一次」', () => {
    for (const g of ['sugaryDrink', 'ultraProcessed'] as DietGroup[]) {
      for (const w of ['加一份', '多拿', '换一次']) {
        expect(GROUP_INFO[g].tip.includes(w), `${g} ← ${w}`).toBe(false)
      }
    }
  })

  it('11 个组都挂上了营养素，且每个 key 都能查到知识', () => {
    expect(Object.keys(GROUP_NUTRIENTS)).toHaveLength(11)
    for (const g of GROUPS) {
      expect(GROUP_NUTRIENTS[g].length).toBeGreaterThan(0)
      for (const key of GROUP_NUTRIENTS[g]) {
        expect(HIGHLIGHT_INFO[key], `${g} 的 ${key}`).toBeTruthy()
      }
    }
  })
})

describe('营养知识点：只讲知识，不讲功效', () => {
  it('返回对象只有 what / amount', () => {
    const k = nutrientKnowledge('维生素C')
    expect(k).toBeTruthy()
    expect(Object.keys(k!).sort()).toEqual(['amount', 'what'])
  })

  it('不含目标绑定或功效承诺', () => {
    const banned = ['减重', '减脂', '增肌', '掉头发', '保肌', '更干净']
    for (const g of GROUPS) {
      for (const key of GROUP_NUTRIENTS[g]) {
        const k = nutrientKnowledge(key)!
        const text = `${k.what} ${k.amount}`
        for (const w of banned) expect(text.includes(w), `${key}: ${w}`).toBe(false)
      }
    }
  })

  it('未知 key 返回 null，不臆造', () => {
    expect(nutrientKnowledge('不存在的营养素')).toBeNull()
  })
})

describe('调理关注点 → 食物组', () => {
  it('6 个关注点全覆盖', () => {
    expect(CARE_TAGS.map((c) => c.id).sort()).toEqual(Object.keys(CARE_GROUP_HINT).sort())
  })

  it('hint 不含命令式或达标判断', () => {
    for (const c of CARE_TAGS) {
      const hint = CARE_GROUP_HINT[c.id].hint
      for (const w of ['应该', '必须', '建议补充', '达标', '不够']) {
        expect(hint.includes(w), `${c.id}: ${w}`).toBe(false)
      }
      expect(CARE_GROUP_HINT[c.id].groups.length).toBeGreaterThan(0)
    }
  })
})

const END = '2026-11-08'
function log(date: string, name: string, groups: DietGroup[]): FoodLog {
  return {
    id: `${date}-${name}`,
    date,
    meal: 'lunch',
    name,
    grams: 150,
    kcal: 300,
    p: 10,
    c: 40,
    f: 8,
    groups,
    createdAt: new Date(`${date}T12:00:00`).getTime(),
  }
}
const PROFILE = { ...DEFAULT_EATING_PROFILE }

describe('周报调理覆盖行', () => {
  const logs = [
    log('2026-11-06', '米饭', ['grain']),
    log('2026-11-07', '牛奶', ['dairy']),
    log('2026-11-08', '酸奶', ['dairy']),
  ]

  it('选了骨骼 → 只说记到几天', () => {
    const r = buildWeekReview(logs, PROFILE, END, undefined, undefined, ['bone'])
    expect(r.careCoverageLine).toBeTruthy()
    expect(r.careCoverageLine!).toContain('2 天')
    for (const w of ['达标', '不足', '差 ']) expect(r.careCoverageLine!.includes(w)).toBe(false)
  })

  it('没选关注点 → undefined', () => {
    const r = buildWeekReview(logs, PROFILE, END)
    expect(r.careCoverageLine).toBeUndefined()
  })
})

describe('观察句说人话', () => {
  it('包含真实食物名，不用「主食和蛋白」这类抽象词', () => {
    const logs = [
      { ...log('2026-11-08', '米饭', ['grain']), meal: 'dinner' as const },
      { ...log('2026-11-08', '鸡蛋', ['animalProtein']), meal: 'dinner' as const },
    ]
    const o = buildMealObservation(logs, 'dinner', PROFILE)
    expect(o.noted[0]).toContain('米饭')
    expect(o.noted[0]).toContain('鸡蛋')
    const text = o.noted.join(' ')
    for (const w of ['主食和蛋白', '记录到', '没看到']) expect(text.includes(w)).toBe(false)
  })
})
