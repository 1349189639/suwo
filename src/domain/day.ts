import { computeStreak, dayScore, spiritFrom, spiritLabel, weekScore } from './adherence'
import { stepsKcal } from './activity'
import { buildFromBmi, muscleFromBuild, smoothWeight, stageFromBmi, type BodyStage } from './avatar'
import { lastNDates, todayKey } from './date'
import { calcBmi, calcTdee, dailyKcalTarget, macroTarget } from './nutrition'
import { MEAL_ORDER, type AppData, type ExerciseLog, type FoodLog, type MacroSet, type Meal } from './types'

export interface Targets {
  kcal: number
  p: number
  c: number
  f: number
}

export interface DaySummary {
  date: string
  intake: MacroSet
  meals: FoodLog[]
  exercises: ExerciseLog[]
  exerciseKcal: number
  exerciseMinutes: number
  steps: number
  /** 膳食纤维合计（克） */
  fiber: number
  /** 今日饮水（毫升） */
  water: number
  /** 从食物里摄入的水分（毫升） */
  foodWater: number
  /** 今日餐饮花费（元） */
  cost: number
  /** 每餐花费（单项 + 整餐） */
  mealCosts: Record<Meal, number>
  /** 今日可摄入额度 = 基础目标 + 运动额外消耗 */
  budget: number
  baseTarget: number
  remaining: number
  score: number | null
  volume: number
}

export function latestWeight(data: AppData): number | null {
  const smooth = smoothWeight(data.weights)
  if (smooth !== null) return smooth
  return data.goal?.startWeightKg ?? null
}

export function targetsFor(data: AppData): Targets {
  const weight = latestWeight(data) ?? 70
  const profile = data.profile
  if (!profile) return macroTarget('maintain', weight, 2000)
  const goal = data.goal
  const kcal = goal
    ? dailyKcalTarget(profile, weight, goal).kcal
    : Math.round(calcTdee(profile, weight))
  return macroTarget(goal?.type ?? 'maintain', weight, kcal)
}

export function summarizeDay(data: AppData, date: string): DaySummary {
  const targets = targetsFor(data)
  const meals = data.foodLogs.filter((l) => l.date === date)
  const exercises = data.exercises.filter((e) => e.date === date)

  const intake = meals.reduce<MacroSet>(
    (acc, l) => ({
      kcal: acc.kcal + l.kcal,
      p: acc.p + l.p,
      c: acc.c + l.c,
      f: acc.f + l.f,
    }),
    { kcal: 0, p: 0, c: 0, f: 0 },
  )

  const exerciseKcal = exercises.reduce((a, e) => a + e.kcal, 0)
  const exerciseMinutes = exercises.reduce((a, e) => a + e.minutes, 0)
  const steps = data.steps[date] ?? 0
  const fiber = Math.round(meals.reduce((a, l) => a + (l.fiber ?? 0), 0) * 10) / 10
  const mealCosts = {} as Record<Meal, number>
  for (const m of MEAL_ORDER) {
    const itemCost = meals.filter((l) => l.meal === m).reduce((a, l) => a + (l.cost ?? 0), 0)
    const extra = data.mealCosts?.[`${date}:${m}`] ?? 0
    // 用户声明了整餐总额就尊重它；只有单项之和超过总额时才以单项为准
    mealCosts[m] = Math.round((extra > 0 ? Math.max(extra, itemCost) : itemCost) * 100) / 100
  }
  const cost = Math.round(MEAL_ORDER.reduce((a, m) => a + mealCosts[m], 0) * 100) / 100
  const water = data.water?.[date] ?? 0
  const foodWater = Math.round(meals.reduce((a, l) => a + (l.water ? (l.grams * l.water) / 100 : 0), 0))
  const budget = targets.kcal + exerciseKcal
  const remaining = budget - Math.round(intake.kcal)
  const volume = exercises.reduce((a, e) => a + (e.sets ?? 0) * (e.reps ?? 0) * (e.weightKg ?? 0), 0)

  const score = dayScore({
    hasLog: meals.length > 0,
    intakeKcal: intake.kcal,
    targetKcal: targets.kcal,
    protein: intake.p,
    proteinTarget: targets.p,
    steps,
    exerciseMinutes,
  })

  return {
    date,
    intake,
    fiber,
    water,
    foodWater,
    cost,
    mealCosts,
    meals,
    exercises,
    exerciseKcal,
    exerciseMinutes,
    steps,
    budget,
    baseTarget: targets.kcal,
    remaining,
    score,
    volume,
  }
}

export interface WeekSummary {
  dates: string[]
  days: DaySummary[]
  avgIntake: number
  avgBurn: number
  avgProtein: number
  loggedDays: number
  score: number | null
  weightChange: number | null
  totalVolume: number
  totalMinutes: number
}

export function summarizeWeek(data: AppData, end = todayKey(), n = 7): WeekSummary {
  const dates = lastNDates(end, n)
  const days = dates.map((d) => summarizeDay(data, d))
  const logged = days.filter((d) => d.meals.length > 0)
  const avg = (fn: (d: DaySummary) => number) =>
    logged.length === 0 ? 0 : Math.round(logged.reduce((a, d) => a + fn(d), 0) / logged.length)

  const sortedWeights = [...data.weights].sort((a, b) => a.date.localeCompare(b.date))
  const atOrBefore = (d: string) => {
    let hit: (typeof sortedWeights)[number] | null = null
    for (const w of sortedWeights) {
      if (w.date <= d) hit = w
      else break
    }
    return hit
  }
  const firstW = atOrBefore(dates[0])
  const lastW = atOrBefore(end)
  const weightChange =
    firstW && lastW && firstW.date !== lastW.date
      ? Math.round((lastW.kg - firstW.kg) * 10) / 10
      : null

  return {
    dates,
    days,
    avgIntake: avg((d) => d.intake.kcal),
    avgBurn: avg((d) => d.exerciseKcal + stepsKcal(latestWeight(data) ?? 70, d.steps)),
    avgProtein: avg((d) => d.intake.p),
    loggedDays: logged.length,
    score: weekScore(days.map((d) => d.score)),
    weightChange,
    totalVolume: days.reduce((a, d) => a + d.volume, 0),
    totalMinutes: days.reduce((a, d) => a + d.exerciseMinutes, 0),
  }
}

export function currentStreak(data: AppData): number {
  return computeStreak(new Set(data.foodLogs.map((l) => l.date)), todayKey())
}

export interface SpiritInfo {
  /** 0–100 的分值（无记录时按 50 计，仅用于表情） */
  score: number
  /** 人话标签：状态极佳 / 状态不错 / 有点懈怠 … */
  label: string
  /** 最近 7 天有没有任何饮食记录 */
  hasData: boolean
}

export function currentSpiritInfo(data: AppData): SpiritInfo {
  const week = summarizeWeek(data)
  const score = spiritFrom(week.score, currentStreak(data))
  const hasData = week.days.some((d) => d.meals.length > 0)
  return { score, label: hasData ? spiritLabel(score) : '还没有记录', hasData }
}

export function currentSpirit(data: AppData): number {
  const week = summarizeWeek(data)
  return spiritFrom(week.score, currentStreak(data))
}

export interface BodyState {
  weight: number
  bmi: number
  build: number
  muscle: number
  stage: BodyStage
}

export function bodyState(data: AppData): BodyState | null {
  const weight = latestWeight(data)
  const profile = data.profile
  if (weight === null || !profile) return null
  const bmi = calcBmi(weight, profile.heightCm)
  const build = buildFromBmi(bmi)
  return { weight, bmi, build, muscle: muscleFromBuild(build), stage: stageFromBmi(bmi) }
}
