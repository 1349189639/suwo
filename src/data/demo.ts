import { addDays, fromKey, todayKey } from '../domain/date'
import type { AppData, ExerciseLog, FoodLog, Meal, WeightEntry } from '../domain/types'
import { FOODS } from './foods'
import { loadData, saveData } from './storage'

function byName(name: string): (typeof FOODS)[number] {
  const hit = FOODS.find((f) => f.name === name)
  if (!hit) throw new Error(`食物库里没有：${name}`)
  return hit
}

function makeLog(date: string, meal: Meal, name: string, grams: number, hour: number): FoodLog {
  const f = byName(name)
  const k = grams / 100
  return {
    id: `${date}-${meal}-${f.id}`,
    date,
    meal,
    name,
    grams,
    kcal: Math.round(f.per100.kcal * k),
    p: Math.round(f.per100.p * k * 10) / 10,
    c: Math.round(f.per100.c * k * 10) / 10,
    f: Math.round(f.per100.f * k * 10) / 10,
    foodId: f.id,
    createdAt: fromKey(date).getTime() + hour * 3_600_000,
  }
}

function makeExercise(
  date: string,
  name: string,
  minutes: number,
  kcal: number,
  sets?: number,
  reps?: number,
  weightKg?: number,
): ExerciseLog {
  return {
    id: `${date}-ex-${name}`,
    date,
    kind: sets ? 'strength' : 'cardio',
    name,
    minutes,
    kcal,
    sets,
    reps,
    weightKg,
    createdAt: fromKey(date).getTime() + 18 * 3_600_000,
  }
}

export function buildDemoData(heavy = false): AppData {
  const today = todayKey()
  const year = new Date().getFullYear()

  const weights: WeightEntry[] = heavy
    ? [
        { date: addDays(today, -28), kg: 97.2 },
        { date: addDays(today, -21), kg: 96.6 },
        { date: addDays(today, -14), kg: 95.9 },
        { date: addDays(today, -7), kg: 95.4 },
        { date: today, kg: 94.8 },
      ]
    : [
        { date: addDays(today, -28), kg: 74.6 },
        { date: addDays(today, -21), kg: 74.0 },
        { date: addDays(today, -14), kg: 73.4 },
        { date: addDays(today, -7), kg: 72.9 },
        { date: today, kg: 72.3 },
      ]

  const foodLogs: FoodLog[] = []
  const plan: { meal: Meal; name: string; grams: number; hour: number }[] = [
    { meal: 'breakfast', name: '燕麦片（干）', grams: 60, hour: 7 },
    { meal: 'breakfast', name: '鸡蛋', grams: 100, hour: 7 },
    { meal: 'breakfast', name: '全脂牛奶', grams: 250, hour: 7 },
    { meal: 'breakfast', name: '全麦面包', grams: 70, hour: 7 },
    { meal: 'lunch', name: '米饭', grams: 200, hour: 12 },
    { meal: 'lunch', name: '鸡胸肉（熟）', grams: 150, hour: 12 },
    { meal: 'lunch', name: '西兰花', grams: 200, hour: 12 },
    { meal: 'dinner', name: '米饭', grams: 150, hour: 18 },
    { meal: 'dinner', name: '牛肉（瘦）', grams: 120, hour: 18 },
    { meal: 'dinner', name: '清炒时蔬', grams: 250, hour: 18 },
    { meal: 'snack', name: '苹果', grams: 200, hour: 16 },
  ]

  for (let i = 6; i >= 0; i -= 1) {
    const date = addDays(today, -i)
    // 今天只记到午餐，留出「今天还能吃」的空间
    const items = i === 0 ? plan.filter((p) => p.meal !== 'dinner' && p.meal !== 'snack') : plan
    for (const item of items) {
      const jitter = i % 2 === 0 ? 1 : 0.9
      foodLogs.push(makeLog(date, item.meal, item.name, Math.round(item.grams * jitter), item.hour))
    }
  }

  const exercises: ExerciseLog[] = [
    { ...makeExercise(addDays(today, -1), '卧推', 12, 70, 4, 8, 60), loadMode: 'barbell' },
    { ...makeExercise(addDays(today, -2), '跑步', 32, 344), distanceKm: 5.2, intensity: 'mid', met: 9.8 },
    { ...makeExercise(addDays(today, -4), '深蹲', 15, 88, 5, 8, 80), loadMode: 'barbell' },
    { ...makeExercise(addDays(today, -5), '羽毛球单打', 120, 646), intensity: 'high', met: 7.0 },
    { ...makeExercise(addDays(today, -6), '引体向上', 12, 70, 4, 6, -15), loadMode: 'bodyweight' },
  ]

  const stepPlan = [8200, 6400, 10500, 5200, 9100, 7300, 4800]
  const steps: Record<string, number> = {}
  stepPlan.forEach((v, idx) => {
    steps[addDays(today, -(6 - idx))] = v
  })

  return {
    schema: 1,
    profile: { gender: 'male', birthYear: year - 28, heightCm: 178, activity: 'light' },
    goal: heavy
      ? {
          type: 'cut',
          startWeightKg: 97.2,
          targetWeightKg: 82,
          deadline: addDays(today, 180),
          startedAt: new Date().toISOString(),
        }
      : {
          type: 'cut',
          startWeightKg: 74.6,
          targetWeightKg: 68,
          deadline: addDays(today, 84),
          startedAt: new Date().toISOString(),
        },
    weights,
    customFoods: [],
    foodLogs,
    exercises,
    steps,
    avatarAction: 'idle',
    createdAt: new Date().toISOString(),
  }
}

/** ?demo=1 时注入演示数据（已有真实数据则不覆盖） */
export function seedDemoIfNeeded(): void {
  const params = new URLSearchParams(window.location.search)
  if (params.get('demo') !== '1') return
  if (loadData().profile) return
  const data = buildDemoData(params.get('heavy') === '1')
  const action = params.get('action')
  const valid: string[] = ['idle', 'run', 'pushup', 'bench', 'badminton', 'flex', 'sleep']
  if (action && valid.includes(action)) {
    data.avatarAction = action as AppData['avatarAction']
  }
  const h = params.get('hair')
  const hc = params.get('hairColor')
  const of = params.get('outfit')
  if (h || hc || of) {
    const base = data.look ?? { skin: 'warm', hair: 'short', hairColor: 'black', outfit: 'mint' }
    data.look = {
      ...base,
      hair: (h as typeof base.hair) ?? base.hair,
      hairColor: (hc as typeof base.hairColor) ?? base.hairColor,
      outfit: (of as typeof base.outfit) ?? base.outfit,
    }
  }
  saveData(data)
}

export function readDemoParams(): { demo: boolean; tab: string | null; sheet: string | null } {
  const params = new URLSearchParams(window.location.search)
  return {
    demo: params.get('demo') === '1',
    tab: params.get('tab'),
    sheet: params.get('sheet'),
  }
}
