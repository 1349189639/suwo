import { describe, expect, it } from 'vitest'
import { computeStreak, dayScore, kcalScore, proteinScore, spiritFrom, weekScore } from './adherence'
import { cardioKcal, stepsKcal, strengthKcal, strengthMinutes, trainingVolume } from './activity'
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
import { summarizeDay, summarizeWeek } from './day'
import { normalize } from '../data/storage'

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
  it('默认减脂缺口 400', () => {
    const r = dailyKcalTarget(male, 70, cutGoal, NOW)
    expect(r.base).toBe(1979)
    expect(r.delta).toBe(400)
    expect(r.kcal).toBe(1579)
  })

  it('体重过轻时触发安全下限', () => {
    const small: Profile = { gender: 'female', birthYear: 2000, heightCm: 150, activity: 'sedentary' }
    const r = dailyKcalTarget(small, 42, { ...cutGoal, startWeightKg: 42 }, NOW)
    expect(r.floored).toBe(true)
    expect(r.kcal).toBe(1200)
  })

  it('有期限时按缺口反推，并限制在 250–750', () => {
    const goal: Goal = { ...cutGoal, targetWeightKg: 65, deadline: '2027-01-02' }
    const planned = plannedDelta(70, 65, '2027-01-02', dateKey(NOW))
    expect(planned).toBeCloseTo(550, 0)
    const r = dailyKcalTarget(male, 70, goal, NOW)
    expect(r.delta).toBe(550)
  })

  it('期限太短时缺口封顶 750', () => {
    const goal: Goal = { ...cutGoal, targetWeightKg: 55, deadline: '2026-11-14' }
    const r = dailyKcalTarget(male, 70, goal, NOW)
    expect(r.delta).toBe(750)
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
