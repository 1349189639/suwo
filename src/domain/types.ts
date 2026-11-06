import type { Look } from './look'

export type Gender = 'male' | 'female'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active'
/**
 * 减重类目标分两种，指标口径不一样：
 * - lose（减肥）：以体重下降为主，缺口可以更直接，蛋白适中；
 * - cut（减脂）：以降体脂、保住肌肉为主，缺口温和，蛋白更高。
 */
export type GoalType = 'lose' | 'cut' | 'bulk' | 'maintain'
export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type ExerciseKind = 'strength' | 'cardio'

/** 负重方式决定输入界面的语义 */
export type LoadMode = 'barbell' | 'dumbbell' | 'machine' | 'bodyweight'
export type BodyPart = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core'
export type Intensity = 'low' | 'mid' | 'high'

export type FoodCategory =
  | 'staple'
  | 'protein'
  | 'seafood'
  | 'soy'
  | 'veg'
  | 'fruit'
  | 'dish'
  | 'snack'
  | 'street'
  | 'drink'
  | 'fastfood'
  | 'nut'

export type AvatarAction = 'idle' | 'run' | 'pushup' | 'bench' | 'badminton' | 'flex' | 'sleep'

export interface Profile {
  gender: Gender
  birthYear: number
  heightCm: number
  activity: ActivityLevel
}

export interface Goal {
  type: GoalType
  startWeightKg: number
  targetWeightKg?: number
  /** 目标期限，YYYY-MM-DD。留空表示不设期限 */
  deadline?: string
  startedAt: string
}

export interface WeightEntry {
  date: string
  kg: number
}

export interface MacroSet {
  kcal: number
  p: number
  c: number
  f: number
  /** 膳食纤维，克 */
  fiber?: number
  /** 含水量，每 100g 的克数（只对高水分食物标注） */
  water?: number
}

export interface FoodItem {
  id: string
  name: string
  category: FoodCategory
  tags: string[]
  per100: MacroSet
  defaultGrams: number
  /** 计件单位，如 个 / 碗 / 杯 */
  unit?: string
  unitGrams?: number
  /** 扫码得到的商品条码，用来去重 */
  barcode?: string
  custom?: boolean
}

export interface FoodLog {
  id: string
  date: string
  meal: Meal
  name: string
  grams: number
  kcal: number
  p: number
  c: number
  f: number
  fiber?: number
  /** 含水量（%） */
  water?: number
  /** 这一餐花了多少钱 */
  cost?: number
  foodId?: string
  createdAt: number
}

export interface ExerciseLog {
  id: string
  date: string
  kind: ExerciseKind
  name: string
  minutes: number
  kcal: number
  sets?: number
  reps?: number
  /** 力量：负重（自重动作可为负 = 辅助，0 = 自重） */
  weightKg?: number
  loadMode?: LoadMode
  /** 有氧：距离 */
  distanceKm?: number
  intensity?: Intensity
  met?: number
  createdAt: number
}

export interface AppData {
  schema: 1
  /**
   * 数据结构版本。加字段时递增；读取方按此判断兼容策略：
   * 旧版客户端读到更高版本的数据时，保留数据、不静默清空（详见 storage.normalize）。
   */
  schemaVersion?: number
  /** 隐私政策同意记录，按政策版本区分；政策改版后会重新征得同意 */
  consent?: Consent
  profile: Profile | null
  goal: Goal | null
  weights: WeightEntry[]
  customFoods: FoodItem[]
  foodLogs: FoodLog[]
  exercises: ExerciseLog[]
  /** 每日步数，key 为 YYYY-MM-DD */
  steps: Record<string, number>
  avatarAction?: AvatarAction
  look?: Look
  /** 每日饮水，毫升 */
  water?: Record<string, number>
  /** 整餐花费，key = "YYYY-MM-DD:餐次"（不绑定具体食物） */
  mealCosts?: Record<string, number>
  createdAt: string
}

export interface Consent {
  /** 同意的是哪一版政策（取自 PRIVACY_POLICY.updatedAt） */
  policyVersion: string
  /** 同意时间戳（毫秒） */
  agreedAt: number
}

export const MEAL_LABEL: Record<Meal, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐',
}

export const MEAL_HINT: Record<Meal, string> = {
  breakfast: '一天的开头',
  lunch: '主力一餐',
  dinner: '睡前 3 小时吃完',
  snack: '零食、饮料、下午茶',
}

export const MEAL_ORDER: Meal[] = ['breakfast', 'lunch', 'dinner', 'snack']

export const GOAL_ORDER: GoalType[] = ['lose', 'cut', 'bulk', 'maintain']

export const GOAL_LABEL: Record<GoalType, string> = {
  lose: '减肥',
  cut: '减脂',
  bulk: '增重',
  maintain: '保持',
}

export const GOAL_DESC: Record<GoalType, string> = {
  lose: '以体重下降为主，缺口更直接',
  cut: '降体脂、保住肌肉，口径温和',
  bulk: '热量盈余，增加肌肉与体重',
  maintain: '维持现状，稳定在健康区间',
}

/** 每种目标该盯什么指标——减肥和减脂最容易混，这里写清楚 */
export const GOAL_FOCUS: Record<GoalType, string> = {
  lose: '看体重：每周降 0.5–1% 比较稳',
  cut: '看体脂和围度，体重降得慢是正常的',
  bulk: '看训练量：每周 +0.25–0.5 kg',
  maintain: '看体重是否稳在 ±1 kg 区间',
}

export const FOOD_CATEGORY_LABEL: Record<FoodCategory, string> = {
  staple: '主食',
  protein: '肉蛋',
  seafood: '水产',
  soy: '豆奶',
  veg: '蔬菜',
  fruit: '水果',
  dish: '家常菜',
  street: '小吃',
  snack: '零食',
  drink: '饮料',
  fastfood: '快餐',
  nut: '坚果油脂',
}

export const FOOD_CATEGORY_ORDER: FoodCategory[] = [
  'staple',
  'protein',
  'seafood',
  'soy',
  'veg',
  'fruit',
  'dish',
  'street',
  'snack',
  'drink',
  'fastfood',
  'nut',
]
