import { describe, expect, it } from 'vitest'
import { computeStreak, dayScore, kcalScore, proteinScore, spiritFrom, weekScore } from './adherence'
import { cardioKcal, stepsDistanceKm, stepsKcal, strengthKcal, strengthMinutes, trainingVolume } from './activity'
import { buildFromBmi, muscleFromBuild, smoothWeight, stageFromBmi } from './avatar'
import { addDays, dateKey, daysBetween, lastNDates } from './date'
import {
  bmiBand,
  calcBmi,
  calcBmr,
  calcTdee,
  clamp,
  dailyKcalTarget,
  estimateFinishDate,
  macroTarget,
  plannedDelta,
} from './nutrition'
import type { AppData, Goal, Profile } from './types'
import { monthCost, summarizeDay, summarizeWeek } from './day'
import { normalize } from '../data/storage'
import { mergeAppData } from '../data/sync'

const NOW = new Date(2026, 9, 24)

const male: Profile = { gender: 'male', birthYear: 1996, heightCm: 175, activity: 'sedentary' }
const female: Profile = { gender: 'female', birthYear: 1996, heightCm: 160, activity: 'light' }

const cutGoal: Goal = { type: 'cut', startWeightKg: 70, startedAt: NOW.toISOString() }

describe('BMR / TDEE', () => {
  it('男：Mifflin-St Jeor', () => {
    expect(calcBmr('male', 70, 175, 1996, NOW)).toBeCloseTo(1648.75, 2)
  })

  it('女：同一组数据低于男性 166', () => {
    expect(calcBmr('female', 70, 175, 1996, NOW)).toBeCloseTo(1482.75, 2)
  })

  it('TDEE = BMR × 活动系数', () => {
    expect(calcTdee(male, 70, NOW)).toBeCloseTo(1648.75 * 1.2, 2)
    expect(calcTdee(female, 70, NOW)).toBeCloseTo(1909.875, 2)
  })
})

describe('BMI', () => {
  it('按中国标准分档', () => {
    expect(calcBmi(70, 175)).toBeCloseTo(22.86, 2)
    expect(bmiBand(17.5).key).toBe('under')
    expect(bmiBand(18.5).key).toBe('normal')
    expect(bmiBand(23.9).key).toBe('normal')
    expect(bmiBand(24).key).toBe('over')
    expect(bmiBand(28).key).toBe('obese')
  })
})

describe('热量目标', () => {
  it('默认减脂缺口 350（口径温和，保肌肉）', () => {
    const r = dailyKcalTarget(male, 70, cutGoal, NOW)
    expect(r.base).toBe(1979)
    expect(r.delta).toBe(350)
    expect(r.kcal).toBe(1629)
  })

  it('默认减肥缺口 450（盯体重，比减脂更直接）', () => {
    const active: Profile = { gender: 'male', birthYear: 1996, heightCm: 175, activity: 'moderate' }
    const goal: Goal = { type: 'lose', startWeightKg: 70, startedAt: NOW.toISOString() }
    const r = dailyKcalTarget(active, 70, goal, NOW)
    expect(r.delta).toBe(450)
    expect(r.kcal).toBe(Math.round(calcTdee(active, 70, NOW)) - 450)
    expect(r.floored).toBe(false)
    expect(r.cap).toBe(800)
  })

  it('体重过轻时触发安全下限', () => {
    const small: Profile = { gender: 'female', birthYear: 2000, heightCm: 150, activity: 'sedentary' }
    const r = dailyKcalTarget(small, 42, { ...cutGoal, startWeightKg: 42 }, NOW)
    expect(r.floored).toBe(true)
    expect(r.kcal).toBe(1200)
  })

  it('减肥同样受安全下限保护', () => {
    const small: Profile = { gender: 'female', birthYear: 2000, heightCm: 150, activity: 'sedentary' }
    const goal: Goal = { type: 'lose', startWeightKg: 42, startedAt: NOW.toISOString() }
    const r = dailyKcalTarget(small, 42, goal, NOW)
    expect(r.floored).toBe(true)
    expect(r.kcal).toBe(1200)
  })

  it('有期限时按缺口反推', () => {
    const goal: Goal = { ...cutGoal, targetWeightKg: 65, deadline: '2027-01-02' }
    const planned = plannedDelta(70, 65, '2027-01-02', dateKey(NOW))
    expect(planned).toBeCloseTo(550, 0)
    const r = dailyKcalTarget(male, 70, goal, NOW)
    expect(r.delta).toBe(550)
  })

  it('期限太短时按各自上限封顶：减脂 600、减肥 800', () => {
    const cut: Goal = { ...cutGoal, targetWeightKg: 55, deadline: '2026-11-14' }
    expect(dailyKcalTarget(male, 70, cut, NOW).delta).toBe(600)
    const lose: Goal = {
      type: 'lose',
      targetWeightKg: 55,
      startWeightKg: 70,
      deadline: '2026-11-14',
      startedAt: NOW.toISOString(),
    }
    expect(dailyKcalTarget(male, 70, lose, NOW).delta).toBe(800)
  })

  it('增重为盈余（负数 delta）', () => {
    const goal: Goal = { type: 'bulk', startWeightKg: 60, startedAt: NOW.toISOString() }
    const r = dailyKcalTarget(male, 60, goal, NOW)
    expect(r.delta).toBe(-250)
    expect(r.kcal).toBe(Math.round(calcTdee(male, 60, NOW)) + 250)
  })

  it('保持型不设缺口', () => {
    const goal: Goal = { type: 'maintain', startWeightKg: 70, startedAt: NOW.toISOString() }
    expect(dailyKcalTarget(male, 70, goal, NOW).delta).toBe(0)
  })
})

describe('宏量分配', () => {
  it('蛋白按体重 g/kg', () => {
    expect(macroTarget('cut', 70, 1600).p).toBe(126)
    expect(macroTarget('bulk', 70, 2600).p).toBe(140)
    expect(macroTarget('lose', 70, 1600).p).toBe(105)
  })

  it('减重类按目标体重算蛋白，超重的人不会被排出离谱的蛋白量', () => {
    expect(macroTarget('cut', 100, 1800, 70).p).toBe(126)
    expect(macroTarget('lose', 100, 1800, 70).p).toBe(105)
  })

  it('三大宏量热量之和接近总热量', () => {
    const m = macroTarget('cut', 70, 1600)
    const sum = m.p * 4 + m.c * 4 + m.f * 9
    expect(Math.abs(sum - 1600)).toBeLessThan(40)
  })
})

describe('消耗估算', () => {
  it('10000 步 × 70kg ≈ 350 kcal', () => {
    expect(stepsKcal(70, 10000)).toBe(350)
  })

  it('步数折算距离：170cm 走 10000 步 ≈ 7.06 km', () => {
    expect(stepsDistanceKm(10000, 170)).toBeCloseTo(7.06, 2)
    expect(stepsDistanceKm(0, 170)).toBe(0)
  })

  it('有氧：MET × 体重 × 时长', () => {
    expect(cardioKcal(9.8, 70, 30)).toBe(343)
  })

  it('力量：每组约 3 分钟', () => {
    expect(strengthMinutes(4)).toBe(12)
    expect(strengthKcal(70, 12)).toBe(70)
    expect(trainingVolume(4, 10, 40)).toBe(1600)
  })
})

describe('自律指数', () => {
  it('落在目标 ±10% 得满分', () => {
    expect(kcalScore(1800, 1800)).toBe(1)
    expect(kcalScore(1980, 1800)).toBe(1)
  })

  it('偏离 40% 归零', () => {
    expect(kcalScore(2520, 1800)).toBe(0)
    expect(kcalScore(1080, 1800)).toBe(0)
  })

  it('偏离 25% 得 0.5', () => {
    expect(kcalScore(2250, 1800)).toBeCloseTo(0.5, 2)
  })

  it('蛋白得分封顶 1', () => {
    expect(proteinScore(150, 120)).toBe(1)
    expect(proteinScore(60, 120)).toBe(0.5)
  })

  it('没有记录的日子返回 null，不计入周均值', () => {
    const s = dayScore({
      hasLog: false,
      intakeKcal: 0,
      targetKcal: 1800,
      protein: 0,
      proteinTarget: 120,
      steps: 0,
      exerciseMinutes: 0,
    })
    expect(s).toBeNull()
    expect(weekScore([1, null, null])).toBe(1)
    expect(weekScore([null, null])).toBeNull()
  })
})

describe('连续打卡', () => {
  it('今天没记时从昨天开始算，不显示断签', () => {
    const today = '2026-10-24'
    const set = new Set(['2026-10-23', '2026-10-22'])
    expect(computeStreak(set, today)).toBe(2)
  })

  it('今天记了则累计到今天', () => {
    const set = new Set(['2026-10-24', '2026-10-23'])
    expect(computeStreak(set, '2026-10-24')).toBe(2)
  })

  it('中间断一天就中断', () => {
    const set = new Set(['2026-10-24', '2026-10-22'])
    expect(computeStreak(set, '2026-10-24')).toBe(1)
  })
})

describe('精神状态', () => {
  it('无数据时中性 50', () => {
    expect(spiritFrom(null, 0)).toBe(50)
  })

  it('高分且连续打卡会更高', () => {
    expect(spiritFrom(0.9, 7)).toBeGreaterThan(spiritFrom(0.9, 0))
  })

  it('结果落在 0–100', () => {
    expect(spiritFrom(1, 365)).toBeLessThanOrEqual(100)
    expect(spiritFrom(0, 0)).toBeGreaterThanOrEqual(0)
  })
})

describe('体型档位', () => {
  it('BMI 映射 5 档', () => {
    expect(stageFromBmi(18)).toBe(1)
    expect(stageFromBmi(19.5)).toBe(2)
    expect(stageFromBmi(22)).toBe(3)
    expect(stageFromBmi(25)).toBe(4)
    expect(stageFromBmi(31)).toBe(5)
  })

  it('build 参数被限制在 0–1', () => {
    expect(buildFromBmi(10)).toBe(0)
    expect(buildFromBmi(40)).toBe(1)
    expect(buildFromBmi(24.7)).toBeGreaterThan(0.4)
  })

  it('越瘦肌肉线条越明显', () => {
    expect(muscleFromBuild(0)).toBe(1)
    expect(muscleFromBuild(0.8)).toBeLessThan(0.2)
  })

  it('平滑体重削弱单次波动', () => {
    const w = [
      { date: '2026-10-01', kg: 70 },
      { date: '2026-10-02', kg: 74 },
    ]
    expect(smoothWeight(w)).toBeCloseTo(71.2, 1)
    expect(smoothWeight([])).toBeNull()
  })
})

describe('日期工具', () => {
  it('跨月加减', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('区间长度与差值', () => {
    expect(lastNDates('2026-10-24', 7)).toHaveLength(7)
    expect(lastNDates('2026-10-24', 7)[0]).toBe('2026-10-18')
    expect(daysBetween('2026-10-24', '2026-11-23')).toBe(30)
  })

  it('预计达成日期', () => {
    expect(estimateFinishDate(70, 65, 400, '2026-10-24')).toBe('2027-01-28')
    expect(estimateFinishDate(70, 65, 0, '2026-10-24')).toBeNull()
    expect(estimateFinishDate(70, 75, 400, '2026-10-24')).toBeNull()
  })

  it('clamp 与安全下限常量', () => {
    expect(clamp(5, 1, 3)).toBe(3)
  })
})

describe('数据容错', () => {
  it('空对象不崩溃，返回默认结构', () => {
    const d = normalize({})
    expect(d.profile).toBeNull()
    expect(d.foodLogs).toEqual([])
    expect(d.schema).toBe(1)
  })

  it('脏数据被丢弃而不是让整份挂掉', () => {
    const d = normalize({
      weights: [{ date: '2026-10-01', kg: 70 }, { bad: true }],
      foodLogs: [{ date: '2026-10-01', name: '米饭', kcal: 'x' }],
      steps: { '2026-10-01': 8000, '2026-10-02': 'many' },
    } as unknown)
    expect(d.weights).toHaveLength(1)
    expect(d.foodLogs[0].kcal).toBe(0)
    expect(d.steps).toEqual({ '2026-10-01': 8000 })
  })
})

function sampleData(): AppData {
  return {
    schema: 1,
    profile: male,
    goal: cutGoal,
    weights: [
      { date: '2026-10-17', kg: 73.0 },
      { date: '2026-10-24', kg: 72.4 },
    ],
    customFoods: [],
    foodLogs: [
      {
        id: 'l1',
        date: '2026-10-24',
        meal: 'lunch',
        name: '米饭',
        grams: 200,
        kcal: 500,
        p: 40,
        c: 50,
        f: 10,
        createdAt: 1,
      },
      {
        id: 'l2',
        date: '2026-10-24',
        meal: 'dinner',
        name: '鸡胸',
        grams: 150,
        kcal: 300,
        p: 45,
        c: 0,
        f: 5,
        createdAt: 2,
      },
    ],
    exercises: [
      { id: 'e1', date: '2026-10-24', kind: 'strength', name: '卧推', minutes: 12, kcal: 70, sets: 4, reps: 8, weightKg: 60, createdAt: 3 },
    ],
    steps: { '2026-10-24': 6000 },
    createdAt: '2026-10-24T00:00:00.000Z',
  }
}

describe('每日汇总', () => {
  it('摄入累加、运动计入额度、剩余 = 额度 - 摄入', () => {
    const data = sampleData()
    const day = summarizeDay(data, '2026-10-24')
    expect(day.intake.kcal).toBe(800)
    expect(day.intake.p).toBe(85)
    expect(day.exerciseKcal).toBe(70)
    expect(day.budget).toBe(day.baseTarget + 70)
    expect(day.remaining).toBe(day.budget - 800)
    expect(day.volume).toBe(4 * 8 * 60)
  })

  it('步数不计入可吃额度（避免与活动系数重复计算）', () => {
    const withSteps = sampleData()
    const without = sampleData()
    without.steps = {}
    expect(summarizeDay(withSteps, '2026-10-24').budget).toBe(
      summarizeDay(without, '2026-10-24').budget,
    )
    expect(summarizeDay(withSteps, '2026-10-24').steps).toBe(6000)
  })

  it('没有饮食记录的日子 score 为 null', () => {
    const day = summarizeDay(sampleData(), '2026-10-20')
    expect(day.score).toBeNull()
  })
})

describe('周汇总', () => {
  it('体重变化跨窗口取最近一次记录', () => {
    const week = summarizeWeek(sampleData(), '2026-10-24')
    expect(week.loggedDays).toBe(1)
    expect(week.weightChange).toBe(-0.6)
  })

  it('只有一次称重时不给变化值', () => {
    const data = sampleData()
    data.weights = [{ date: '2026-10-24', kg: 72.4 }]
    expect(summarizeWeek(data, '2026-10-24').weightChange).toBeNull()
  })
})

describe('报表花销', () => {
  it('整餐记账（mealCosts）要算进当日花费', () => {
    const data = sampleData()
    data.mealCosts = { '2026-10-24:lunch': 30 }
    expect(summarizeDay(data, '2026-10-24').cost).toBe(30)
    expect(monthCost(data, '2026-10')).toBe(30)
  })

  it('单项价与整餐价取较大者，不重复相加', () => {
    const data = sampleData()
    data.foodLogs[0].cost = 12
    data.mealCosts = { '2026-10-24:lunch': 30 }
    expect(summarizeDay(data, '2026-10-24').cost).toBe(30)
  })

  it('整月合计包含没有食物记录、只记了整餐花费的日子', () => {
    const data = sampleData()
    data.mealCosts = {
      '2026-10-24:lunch': 30,
      '2026-10-03:dinner': 45.5,
      '2026-09-30:lunch': 99,
    }
    expect(monthCost(data, '2026-10')).toBeCloseTo(75.5, 2)
  })
})

describe('存储归一化', () => {
  it('扫码重复入库的商品在加载时只留一份', () => {
    const food = (id: string, barcode?: string) => ({
      id,
      name: '金典牛奶',
      category: 'drink',
      tags: ['扫码'],
      per100: { kcal: 65, p: 3.3, c: 4.9, f: 3.6 },
      defaultGrams: 250,
      barcode,
    })
    const data = normalize({
      schema: 1,
      profile: null,
      goal: null,
      weights: [],
      customFoods: [food('c1', '6907992100019'), food('c2', '6907992100019'), food('c3')],
      foodLogs: [],
      exercises: [],
      steps: {},
    })
    expect(data.customFoods).toHaveLength(2)
    expect(data.customFoods[0].id).toBe('c1')
  })

  it('重启后保留纤维、含水量、花费、饮水和整餐花费', () => {
    const raw = {
      schema: 1,
      profile: { name: 'a', gender: 'male', heightCm: 175, weightKg: 70, age: 25 },
      goal: null,
      weights: [],
      customFoods: [
        { id: 'c1', name: '测试', category: 'dish', tags: [], per100: { kcal: 100, p: 1, c: 2, f: 3, fiber: 4, water: 90 }, defaultGrams: 100 },
      ],
      foodLogs: [
        {
          id: 'l1',
          date: '2026-01-01',
          meal: 'breakfast',
          name: '苹果',
          grams: 200,
          kcal: 104,
          p: 0.5,
          c: 28,
          f: 0.4,
          fiber: 4.8,
          water: 85,
          cost: 12.5,
          createdAt: 1,
        },
      ],
      exercises: [],
      steps: {},
      water: { '2026-01-01': 500 },
      mealCosts: { '2026-01-01:breakfast': 40 },
      createdAt: '2026-01-01',
    }
    const n = normalize(raw as unknown)
    expect(n.foodLogs[0].fiber).toBe(4.8)
    expect(n.foodLogs[0].water).toBe(85)
    expect(n.foodLogs[0].cost).toBe(12.5)
    expect(n.customFoods[0].per100.fiber).toBe(4)
    expect(n.customFoods[0].per100.water).toBe(90)
    expect(n.water?.['2026-01-01']).toBe(500)
    expect(n.mealCosts?.['2026-01-01:breakfast']).toBe(40)
  })
})

describe('存储归一化 · 计件单位', () => {
  it('自定义食物的 unit / unitGrams 重启后仍保留', () => {
    const raw = {
      schema: 1,
      profile: null,
      goal: null,
      weights: [],
      foodLogs: [],
      exercises: [],
      customFoods: [
        {
          id: 'c1',
          name: '自制饭团',
          category: 'staple',
          tags: [],
          per100: { kcal: 180, p: 5, c: 30, f: 4 },
          defaultGrams: 150,
          unit: '个',
          unitGrams: 150,
        },
      ],
      steps: {},
      createdAt: '2026-01-01',
    }
    const n = normalize(raw as unknown)
    expect(n.customFoods[0].unit).toBe('个')
    expect(n.customFoods[0].unitGrams).toBe(150)
  })
})
describe('云端合并 mergeAppData', () => {
  const base = () => normalize({ schema: 1, createdAt: '2026-01-01' } as unknown) as AppData

  const log = (id: string, createdAt: number, name = '食物') =>
    ({
      id,
      date: '2026-10-01',
      meal: 'breakfast',
      name,
      grams: 100,
      kcal: 100,
      p: 1,
      c: 1,
      f: 1,
      createdAt,
    }) as unknown as AppData['foodLogs'][number]

  it('本地为空时取云端', () => {
    const remote = { ...base(), foodLogs: [log('a', 1)] }
    expect(mergeAppData(null, remote).foodLogs).toHaveLength(1)
  })

  it('云端为空时保留本地', () => {
    const local = { ...base(), foodLogs: [log('a', 1)] }
    expect(mergeAppData(local, null).foodLogs).toHaveLength(1)
  })

  it('按 id 取并集，两边都不删', () => {
    const local = { ...base(), foodLogs: [log('a', 1)] }
    const remote = { ...base(), foodLogs: [log('b', 2)] }
    const ids = mergeAppData(local, remote)
      .foodLogs.map((x) => x.id)
      .sort()
    expect(ids).toEqual(['a', 'b'])
  })

  it('同 id 取 createdAt 较新的那条', () => {
    const local = { ...base(), foodLogs: [log('a', 1, '旧的')] }
    const remote = { ...base(), foodLogs: [log('a', 9, '新的')] }
    expect(mergeAppData(local, remote).foodLogs[0].name).toBe('新的')
  })

  it('同一天体重以本地为准', () => {
    const local = { ...base(), weights: [{ date: '2026-10-01', kg: 70 }] as unknown as AppData['weights'] }
    const remote = { ...base(), weights: [{ date: '2026-10-01', kg: 75 }] as unknown as AppData['weights'] }
    expect(mergeAppData(local, remote).weights[0].kg).toBe(70)
  })

  it('步数按日期取并集', () => {
    const local = { ...base(), steps: { '2026-10-01': 100 } }
    const remote = { ...base(), steps: { '2026-10-02': 200 } }
    expect(Object.keys(mergeAppData(local, remote).steps).sort()).toEqual(['2026-10-01', '2026-10-02'])
  })
})