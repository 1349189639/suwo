import { describe, expect, it } from 'vitest'
import { buildWeekReview } from './weekDiet'
import { buildMealObservation } from './mealObservation'
import { DEFAULT_EATING_PROFILE, type DietGroup, type FoodLog } from './types'

const END = '2026-11-08' // 周日，窗口 11-02 ~ 11-08，含周末
const profile = { ...DEFAULT_EATING_PROFILE }

function log(date: string, name: string, groups: DietGroup[], meal: FoodLog['meal'] = 'lunch'): FoodLog {
  return {
    id: `${date}-${name}`,
    date,
    meal,
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

describe('周层：充分性闸门', () => {
  it('0/1/2 天记录都判为不足，且不给建议', () => {
    for (const days of [[], ['2026-11-03'], ['2026-11-03', '2026-11-04']]) {
      const logs = days.map((d) => log(d, '米饭', ['grain']))
      const r = buildWeekReview(logs, profile, END)
      expect(r.sufficient).toBe(false)
      expect(r.options).toEqual([])
      expect(r.observations.length).toBeLessThanOrEqual(1)
    }
  })

  it('够 3 天但全在工作日 → 仍不足（需含周末/休息日）', () => {
    const logs = ['2026-11-02', '2026-11-03', '2026-11-04'].map((d) => log(d, '米饭', ['grain']))
    const r = buildWeekReview(logs, profile, END)
    expect(r.window.loggedDays).toBe(3)
    expect(r.sufficient).toBe(false)
  })

  it('3 天且含周末 → 充分，输出观察', () => {
    const logs = [
      log('2026-11-06', '米饭', ['grain']),
      log('2026-11-07', '西兰花', ['vegetable', 'darkVegetable']),
      log('2026-11-08', '鲈鱼', ['animalProtein', 'aquatic']),
    ]
    const r = buildWeekReview(logs, profile, END)
    expect(r.sufficient).toBe(true)
    expect(r.observations.length).toBeGreaterThan(0)
    expect(r.disclaimer.length).toBeGreaterThan(10)
  })

  it('缺记录的日子不补 0，分母只用有记录的天', () => {
    const logs = [log('2026-11-07', '米饭', ['grain'])]
    const r = buildWeekReview(logs, profile, END)
    expect(r.window.loggedDays).toBe(1)
    expect(r.coverage.grain.days).toBe(1)
    expect(r.coverage.vegetable.days).toBe(0)
  })
})

describe('周层：不评价人', () => {
  it('关闭评价开关后，观察与建议都为空', () => {
    const logs = [
      log('2026-11-06', '米饭', ['grain']),
      log('2026-11-07', '西兰花', ['vegetable']),
      log('2026-11-08', '鲈鱼', ['aquatic']),
    ]
    const r = buildWeekReview(logs, { ...profile, reviewEnabled: false }, END)
    expect(r.sufficient).toBe(false)
    expect(r.options).toEqual([])
  })

  it('没有食物组的记录（unknown）不产生覆盖', () => {
    const logs = ['2026-11-06', '2026-11-07', '2026-11-08'].map((d) => log(d, '神秘料理', []))
    const r = buildWeekReview(logs, profile, END)
    expect(r.coverage.vegetable.days).toBe(0)
    expect(r.diversity.distinctGroups).toBe(0)
  })

  it('预算紧时只给零成本建议', () => {
    const logs = ['2026-11-06', '2026-11-07', '2026-11-08'].map((d) => log(d, '白米饭', ['grain']))
    const r = buildWeekReview(logs, { ...profile, budgetLevel: 'tight' }, END)
    for (const o of r.options) expect(o.extraCost).toBe('none')
  })

  it('上周不足 3 天时不做上周对比', () => {
    const logs = [
      log('2026-11-06', '米饭', ['grain']),
      log('2026-11-07', '西兰花', ['vegetable']),
      log('2026-11-08', '鲈鱼', ['aquatic']),
    ]
    const prev = [log('2026-10-28', '米饭', ['grain'])]
    const r = buildWeekReview(logs, profile, END, prev)
    expect(r.compareToLastWeek).toBeUndefined()
  })
})

describe('每餐：只做中性观察', () => {
  it('午晚餐缺蔬菜时最多给一个可选动作', () => {
    const logs = [log('2026-11-08', '米饭', ['grain']), log('2026-11-08', '鸡胸', ['animalProtein'])]
    const o = buildMealObservation(logs, 'lunch', profile)
    expect(o.skipped).toBe(false)
    expect(o.noted.length).toBeLessThanOrEqual(2)
    expect(o.option?.extraCost).not.toBe('normal')
  })

  it('早餐不给动作', () => {
    const logs = [log('2026-11-08', '包子', ['grain'], 'breakfast')]
    const o = buildMealObservation(logs, 'breakfast', profile)
    expect(o.option).toBeUndefined()
  })

  it('空记录 → skipped，不产生任何建议', () => {
    const o = buildMealObservation([], 'dinner', profile)
    expect(o.skipped).toBe(true)
    expect(o.noted).toEqual([])
    expect(o.option).toBeUndefined()
  })

  it('关闭开关后所有餐次都跳过', () => {
    const logs = [log('2026-11-08', '米饭', ['grain'])]
    const o = buildMealObservation(logs, 'lunch', { ...profile, reviewEnabled: false })
    expect(o.skipped).toBe(true)
  })
})
