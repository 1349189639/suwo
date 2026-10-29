import type {
  AppData,
  AvatarAction,
  ExerciseLog,
  FoodCategory,
  FoodItem,
  FoodLog,
  Goal,
  Intensity,
  LoadMode,
  Profile,
  WeightEntry,
} from '../domain/types'
import { FOOD_CATEGORY_LABEL } from '../domain/types'
import { normalizeLook } from '../domain/look'

const LEGACY_KEY = 'fitpal:v1'

let activeId: string | null = null

export function setActiveAccount(id: string | null): void {
  activeId = id
}

function storageKey(): string {
  return activeId ? ` ${LEGACY_KEY}:${activeId} ` : LEGACY_KEY
}

export function emptyData(): AppData {
  return {
    schema: 1,
    profile: null,
    goal: null,
    weights: [],
    customFoods: [],
    foodLogs: [],
    exercises: [],
    steps: {},
    createdAt: new Date().toISOString(),
  }
}

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

/** 宽容地把任意输入整理成合法数据结构，损坏字段丢弃而不是整份崩溃 */
export function normalize(input: unknown): AppData {
  const src = obj(input)
  const base = emptyData()

  const profileRaw = obj(src.profile)
  const profile: Profile | null =
    profileRaw.gender === 'male' || profileRaw.gender === 'female'
      ? {
          gender: profileRaw.gender,
          birthYear: num(profileRaw.birthYear, new Date().getFullYear() - 25),
          heightCm: num(profileRaw.heightCm, 170),
          activity:
            profileRaw.activity === 'light' ||
            profileRaw.activity === 'moderate' ||
            profileRaw.activity === 'active'
              ? profileRaw.activity
              : 'sedentary',
        }
      : null

  const goalRaw = obj(src.goal)
  const goal: Goal | null = profile
    ? {
        type:
          goalRaw.type === 'bulk' || goalRaw.type === 'maintain' ? goalRaw.type : 'cut',
        startWeightKg: num(goalRaw.startWeightKg, 70),
        targetWeightKg:
          typeof goalRaw.targetWeightKg === 'number' ? goalRaw.targetWeightKg : undefined,
        deadline: typeof goalRaw.deadline === 'string' ? goalRaw.deadline : undefined,
        startedAt: str(goalRaw.startedAt, new Date().toISOString()),
      }
    : null

  const weights: WeightEntry[] = Array.isArray(src.weights)
    ? (src.weights as unknown[])
        .map((w) => obj(w))
        .filter((w) => typeof w.date === 'string' && typeof w.kg === 'number')
        .map((w) => ({ date: w.date as string, kg: w.kg as number }))
    : []

  const foodLogs: FoodLog[] = Array.isArray(src.foodLogs)
    ? (src.foodLogs as unknown[])
        .map((l) => obj(l))
        .filter((l) => typeof l.date === 'string' && typeof l.name === 'string')
        .map((l, i) => ({
          id: str(l.id, `l${i}`),
          date: l.date as string,
          meal:
            l.meal === 'lunch' || l.meal === 'dinner' || l.meal === 'snack'
              ? l.meal
              : 'breakfast',
          name: l.name as string,
          grams: num(l.grams, 100),
          kcal: num(l.kcal),
          p: num(l.p),
          c: num(l.c),
          f: num(l.f),
          fiber: typeof l.fiber === 'number' ? l.fiber : undefined,
          water: typeof l.water === 'number' ? l.water : undefined,
          cost: typeof l.cost === 'number' ? l.cost : undefined,
          foodId: typeof l.foodId === 'string' ? l.foodId : undefined,
          createdAt: num(l.createdAt, Date.now()),
        }))
    : []

  const exercises: ExerciseLog[] = Array.isArray(src.exercises)
    ? (src.exercises as unknown[])
        .map((e) => obj(e))
        .filter((e) => typeof e.date === 'string' && typeof e.name === 'string')
        .map((e, i) => ({
          id: str(e.id, `e${i}`),
          date: e.date as string,
          kind: e.kind === 'cardio' ? ('cardio' as const) : ('strength' as const),
          name: e.name as string,
          minutes: num(e.minutes, 30),
          kcal: num(e.kcal),
          sets: typeof e.sets === 'number' ? e.sets : undefined,
          reps: typeof e.reps === 'number' ? e.reps : undefined,
          weightKg: typeof e.weightKg === 'number' ? e.weightKg : undefined,
          loadMode: ['barbell', 'dumbbell', 'machine', 'bodyweight'].includes(e.loadMode as string)
            ? (e.loadMode as LoadMode)
            : undefined,
          distanceKm: typeof e.distanceKm === 'number' ? e.distanceKm : undefined,
          intensity:
            e.intensity === 'low' || e.intensity === 'mid' || e.intensity === 'high'
              ? (e.intensity as Intensity)
              : undefined,
          met: typeof e.met === 'number' ? e.met : undefined,
          createdAt: num(e.createdAt, Date.now()),
        }))
    : []

  const customFoods: FoodItem[] = Array.isArray(src.customFoods)
    ? (src.customFoods as unknown[])
        .map((f) => obj(f))
        .filter((f) => typeof f.name === 'string')
        .map((f, i) => ({
          id: str(f.id, `c${i}`),
          name: f.name as string,
          category: (typeof f.category === 'string' && f.category in FOOD_CATEGORY_LABEL
            ? f.category
            : 'dish') as FoodCategory,
          tags: Array.isArray(f.tags) ? (f.tags as string[]) : ['自定义'],
          per100: {
            kcal: num(obj(f.per100).kcal),
            p: num(obj(f.per100).p),
            c: num(obj(f.per100).c),
            f: num(obj(f.per100).f),
            fiber: typeof obj(f.per100).fiber === 'number' ? (obj(f.per100).fiber as number) : undefined,
            water: typeof obj(f.per100).water === 'number' ? (obj(f.per100).water as number) : undefined,
          },
          defaultGrams: num(f.defaultGrams, 100),
          custom: true,
        }))
    : []

  const steps: Record<string, number> = {}
  const stepsRaw = obj(src.steps)
  for (const [k, v] of Object.entries(stepsRaw)) {
    if (typeof v === 'number' && Number.isFinite(v)) steps[k] = v
  }

  const water: Record<string, number> = {}
  for (const [k, v] of Object.entries(obj(src.water))) {
    if (typeof v === 'number' && Number.isFinite(v)) water[k] = v
  }

  const mealCosts: Record<string, number> = {}
  for (const [k, v] of Object.entries(obj(src.mealCosts))) {
    if (typeof v === 'number' && Number.isFinite(v)) mealCosts[k] = v
  }

  const ACTIONS: AvatarAction[] = ['idle', 'run', 'pushup', 'bench', 'badminton', 'flex', 'sleep']
  const avatarAction = ACTIONS.includes(src.avatarAction as AvatarAction)
    ? (src.avatarAction as AvatarAction)
    : undefined

  return {
    ...base,
    profile,
    goal,
    weights,
    foodLogs,
    exercises,
    customFoods,
    steps,
    water,
    mealCosts,
    avatarAction,
    look: normalizeLook(src.look, profile?.gender ?? 'male'),
    createdAt: str(src.createdAt, base.createdAt),
  }
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(storageKey())
    if (!raw) return emptyData()
    return normalize(JSON.parse(raw))
  } catch {
    return emptyData()
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(data))
  } catch (err) {
    console.error('保存失败', err)
  }
}

export function exportJson(data: AppData): string {
  return JSON.stringify(data, null, 2)
}

export function importJson(text: string): AppData {
  return normalize(JSON.parse(text))
}

export function clearData(): void {
  localStorage.removeItem(storageKey())
}
