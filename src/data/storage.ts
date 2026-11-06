import type {
  AppData,
  AvatarAction,
  CareTag,
  Cohort,
  Consent,
  DietGroup,
  EatingContext,
  EatingProfile,
  ExerciseLog,
  FoodCategory,
  FoodItem,
  FoodLog,
  Goal,
  Intensity,
  LoadMode,
  LogSource,
  Profile,
  WeightEntry,
} from '../domain/types'
import { CARE_IDS } from '../domain/care'
import { DEFAULT_EATING_PROFILE } from '../domain/types'
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
    schemaVersion: CURRENT_SCHEMA_VERSION,
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

/** 当前数据结构版本；新增字段时 +1 */
export const CURRENT_SCHEMA_VERSION = 3

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

/** 同一件商品只留一份：有条码按条码，没有条码按名字 */
export function dedupeCustomFoods(list: FoodItem[]): FoodItem[] {
  const seen = new Set<string>()
  const out: FoodItem[] = []
  for (const f of list) {
    const key = f.barcode ? `b:${f.barcode}` : `n:${f.name.trim()}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(f)
  }
  return out
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
  const rawCares = Array.isArray(goalRaw.cares) ? (goalRaw.cares as unknown[]) : []
  const cares = rawCares.filter((c): c is CareTag =>
    typeof c === 'string' && (CARE_IDS as string[]).includes(c),
  )
  const goal: Goal | null = profile
    ? {
        type:
          goalRaw.type === 'lose' || goalRaw.type === 'bulk' || goalRaw.type === 'maintain'
            ? goalRaw.type
            : 'cut',
        cares: cares.length > 0 ? cares : undefined,
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
          // v3：场景 / 来源 / 食物组快照（老数据留空，不猜测）
          context: typeof l.context === 'string' ? (l.context as EatingContext) : undefined,
          source: typeof l.source === 'string' ? (l.source as LogSource) : undefined,
          groups: Array.isArray(l.groups) ? (l.groups as DietGroup[]) : undefined,
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

  const parsedCustomFoods: FoodItem[] = Array.isArray(src.customFoods)
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
            sodium: typeof obj(f.per100).sodium === 'number' ? (obj(f.per100).sodium as number) : undefined,
            sugar: typeof obj(f.per100).sugar === 'number' ? (obj(f.per100).sugar as number) : undefined,
            vitd: typeof obj(f.per100).vitd === 'number' ? (obj(f.per100).vitd as number) : undefined,
          },
          defaultGrams: num(f.defaultGrams, 100),
          unit: typeof f.unit === 'string' ? f.unit : undefined,
          unitGrams: typeof f.unitGrams === 'number' ? f.unitGrams : undefined,
          barcode: typeof f.barcode === 'string' ? f.barcode : undefined,
          custom: true,
        }))
    : []

  // 扫码时代重复入库过同一件商品：按条码（没有条码就按名字）去重，保留先入库的那条
  const customFoods = dedupeCustomFoods(parsedCustomFoods)

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

  // 同意记录：只认结构完整的字段，缺一个就当没同意过（老账号下次登录会补弹）
  const consentRaw = obj(src.consent)
  const consent: Consent | undefined =
    typeof consentRaw.policyVersion === 'string' && consentRaw.policyVersion
      ? {
          policyVersion: consentRaw.policyVersion,
          agreedAt: num(consentRaw.agreedAt, 0),
        }
      : undefined

  // 未知顶层字段原样保留：以后加字段时，旧版客户端同步不会把新字段洗掉。
  // 策略：认识的字段走上面的校验重建，不认识的整块透传（值不做校验）。
  const KNOWN_KEYS = new Set([
    'schema',
    'schemaVersion',
    'consent',
    'profile',
    'goal',
    'weights',
    'customFoods',
    'foodLogs',
    'exercises',
    'steps',
    'avatarAction',
    'look',
    'water',
    'mealCosts',
    'createdAt',
  ])
  const passthrough: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(src)) {
    if (!KNOWN_KEYS.has(k)) passthrough[k] = v
  }

  return {
    ...base,
    ...(passthrough as Partial<AppData>),
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
    schemaVersion: Math.max(1, num(src.schemaVersion, base.schemaVersion ?? 1)),
    consent,
    eating: normalizeEating(src.eating),
  } as AppData
}

/** v3 场景画像：缺字段一律用中性默认，不猜测用户身份 */
function normalizeEating(input: unknown): EatingProfile {
  const raw = obj(input)
  const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
    typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback
  return {
    cohort: pick<Cohort>(raw.cohort, ['student', 'worker', 'other'], DEFAULT_EATING_PROFILE.cohort),
    mainContext: pick<EatingContext>(
      raw.mainContext,
      ['canteen', 'delivery', 'convenience', 'home', 'restaurant', 'dorm', 'other'],
      DEFAULT_EATING_PROFILE.mainContext,
    ),
    budgetLevel: pick(raw.budgetLevel, ['tight', 'normal', 'flexible'], DEFAULT_EATING_PROFILE.budgetLevel),
    hasKitchen: typeof raw.hasKitchen === 'boolean' ? raw.hasKitchen : DEFAULT_EATING_PROFILE.hasKitchen,
    schedule: pick(raw.schedule, ['regular', 'shift', 'irregular'], DEFAULT_EATING_PROFILE.schedule),
    avoid: Array.isArray(raw.avoid) ? (raw.avoid as string[]) : undefined,
    reviewEnabled: typeof raw.reviewEnabled === 'boolean' ? raw.reviewEnabled : true,
    answeredAt: typeof raw.answeredAt === 'string' ? raw.answeredAt : undefined,
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

/**
 * 清掉这台设备上所有账号相关的本地缓存。
 * 登出 / 删号时必须调：否则 A 退出后，B 在同一台设备上仍能从 localStorage 里翻到 A 的数据。
 */
export function clearAllAccountCaches(): void {
  try {
    const doomed: string[] = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (!key) continue
      if (key.startsWith('suwo:cloud:') || key === LEGACY_KEY || key.startsWith(`${LEGACY_KEY}:`)) {
        doomed.push(key)
      }
    }
    for (const key of doomed) localStorage.removeItem(key)
  } catch {
    /* 隐私模式下 localStorage 可能不可用，忽略 */
  }
}
