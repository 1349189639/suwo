import type { BodyPart, Intensity, LoadMode } from './types'

/* ------------------------------ 力量动作 ------------------------------ */

export interface StrengthMove {
  name: string
  part: BodyPart
  load: LoadMode
  defaultLoad: number
  step: number
  note?: string
}

export const BODY_PART_LABEL: Record<BodyPart, string> = {
  chest: '胸',
  back: '背',
  legs: '腿',
  shoulders: '肩',
  arms: '手臂',
  core: '核心',
}

export const BODY_PART_ORDER: BodyPart[] = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core']

/**
 * load 决定负重输入的含义：
 * barbell / machine —— 器械总重量
 * dumbbell —— 单边重量，容量按 ×2 计
 * bodyweight —— 自重动作，0 表示纯自重，负数表示弹力带等辅助，正数表示额外负重
 */
export const STRENGTH_MOVES: StrengthMove[] = [
  { name: '卧推', part: 'chest', load: 'barbell', defaultLoad: 60, step: 2.5 },
  { name: '上斜卧推', part: 'chest', load: 'barbell', defaultLoad: 50, step: 2.5 },
  { name: '哑铃卧推', part: 'chest', load: 'dumbbell', defaultLoad: 20, step: 2, note: '单边重量' },
  { name: '哑铃飞鸟', part: 'chest', load: 'dumbbell', defaultLoad: 10, step: 1, note: '单边重量' },
  { name: '双杠臂屈伸', part: 'chest', load: 'bodyweight', defaultLoad: 0, step: 2.5 },
  { name: '俯卧撑', part: 'chest', load: 'bodyweight', defaultLoad: 0, step: 2.5 },

  { name: '引体向上', part: 'back', load: 'bodyweight', defaultLoad: 0, step: 2.5, note: '0 = 自重，负 = 辅助' },
  { name: '高位下拉', part: 'back', load: 'machine', defaultLoad: 50, step: 2.5 },
  { name: '杠铃划船', part: 'back', load: 'barbell', defaultLoad: 60, step: 2.5 },
  { name: '坐姿划船', part: 'back', load: 'machine', defaultLoad: 45, step: 2.5 },
  { name: '单臂哑铃划船', part: 'back', load: 'dumbbell', defaultLoad: 22, step: 2, note: '单边重量' },
  { name: '硬拉', part: 'back', load: 'barbell', defaultLoad: 100, step: 5 },

  { name: '深蹲', part: 'legs', load: 'barbell', defaultLoad: 80, step: 5 },
  { name: '腿举', part: 'legs', load: 'machine', defaultLoad: 120, step: 5 },
  { name: '分腿蹲', part: 'legs', load: 'dumbbell', defaultLoad: 16, step: 2, note: '单边重量' },
  { name: '腿弯举', part: 'legs', load: 'machine', defaultLoad: 40, step: 2.5 },
  { name: '腿屈伸', part: 'legs', load: 'machine', defaultLoad: 40, step: 2.5 },
  { name: '罗马尼亚硬拉', part: 'legs', load: 'barbell', defaultLoad: 60, step: 2.5 },

  { name: '肩推', part: 'shoulders', load: 'barbell', defaultLoad: 40, step: 2.5 },
  { name: '哑铃肩推', part: 'shoulders', load: 'dumbbell', defaultLoad: 14, step: 1, note: '单边重量' },
  { name: '侧平举', part: 'shoulders', load: 'dumbbell', defaultLoad: 8, step: 1, note: '单边重量' },
  { name: '面拉', part: 'shoulders', load: 'machine', defaultLoad: 20, step: 2.5 },

  { name: '哑铃弯举', part: 'arms', load: 'dumbbell', defaultLoad: 12, step: 1, note: '单边重量' },
  { name: '杠铃弯举', part: 'arms', load: 'barbell', defaultLoad: 25, step: 2.5 },
  { name: '三头下压', part: 'arms', load: 'machine', defaultLoad: 25, step: 2.5 },
  { name: '窄距卧推', part: 'arms', load: 'barbell', defaultLoad: 40, step: 2.5 },

  { name: '卷腹', part: 'core', load: 'bodyweight', defaultLoad: 0, step: 2.5 },
  { name: '悬垂举腿', part: 'core', load: 'bodyweight', defaultLoad: 0, step: 2.5 },
  { name: '平板支撑', part: 'core', load: 'bodyweight', defaultLoad: 0, step: 2.5, note: '按秒计，可记 4 组' },
]

export const LOAD_MODE_TITLE: Record<LoadMode, string> = {
  barbell: '杠铃总重',
  machine: '配重',
  dumbbell: '单边重量',
  bodyweight: '负重 / 辅助',
}

export const STRENGTH_MET = 5

export function strengthMinutes(sets: number): number {
  return Math.max(1, Math.round(sets * 3))
}

export function strengthKcal(weightKg: number, minutes: number): number {
  return Math.round((STRENGTH_MET * weightKg * minutes) / 60)
}

export function effectiveLoad(loadKg: number, mode: LoadMode, bodyWeightKg: number): number {
  if (mode === 'dumbbell') return loadKg * 2
  if (mode === 'bodyweight') return Math.max(0, bodyWeightKg * 0.85 + loadKg)
  return Math.max(0, loadKg)
}

export function trainingVolume(
  sets: number,
  reps: number,
  loadKg: number,
  mode: LoadMode = 'barbell',
  bodyWeightKg = 0,
): number {
  return Math.round(sets * reps * effectiveLoad(loadKg, mode, bodyWeightKg))
}

/* ------------------------------ 有氧动作 ------------------------------ */

export type CardioGroup = 'run' | 'ball' | 'bike' | 'swim' | 'class' | 'other'

export const CARDIO_GROUP_LABEL: Record<CardioGroup, string> = {
  run: '跑步',
  ball: '球类',
  bike: '骑行',
  swim: '游泳',
  class: '课程',
  other: '其他',
}

export const CARDIO_GROUP_ORDER: CardioGroup[] = ['run', 'ball', 'bike', 'swim', 'class', 'other']

/** 同一个项目下的具体模式，比如羽毛球的单打 / 双打 */
export interface CardioVariant {
  name: string
  met: number
  note?: string
}

export interface CardioActivity {
  id: string
  name: string
  group: CardioGroup
  variants: CardioVariant[]
  /** 是否记录距离 */
  distance?: boolean
}

/**
 * MET 参考《体力活动纲要》(Compendium of Physical Activities)。
 * 一个项目拆成多个模式——羽毛球单打和双打的跑动量差一个档。
 */
export const CARDIO_ACTIVITIES: CardioActivity[] = [
  {
    id: 'run',
    name: '跑步',
    group: 'run',
    distance: true,
    variants: [
      { name: '轻松跑', met: 8.3, note: '约 8 km/h' },
      { name: '常规跑', met: 9.8, note: '约 10 km/h' },
      { name: '节奏跑', met: 11.8, note: '约 12 km/h' },
      { name: '间歇冲刺', met: 13.5, note: '约 14 km/h' },
    ],
  },
  {
    id: 'walk',
    name: '快走',
    group: 'run',
    distance: true,
    variants: [
      { name: '散步', met: 3.0, note: '约 4 km/h' },
      { name: '快走', met: 4.3, note: '约 6 km/h' },
      { name: '竞走', met: 6.5, note: '约 8 km/h' },
    ],
  },
  {
    id: 'treadmill',
    name: '跑步机',
    group: 'run',
    distance: true,
    variants: [
      { name: '常规', met: 8.0 },
      { name: '坡度走', met: 6.0 },
    ],
  },
  { id: 'trail', name: '越野跑', group: 'run', distance: true, variants: [{ name: '越野', met: 9.0 }] },

  {
    id: 'badminton',
    name: '羽毛球',
    group: 'ball',
    variants: [
      { name: '单打', met: 7.0, note: '跑动多、间歇短' },
      { name: '双打', met: 5.5 },
      { name: '多球训练', met: 8.0 },
    ],
  },
  {
    id: 'basketball',
    name: '篮球',
    group: 'ball',
    variants: [
      { name: '半场 1v1', met: 8.0, note: '强度最高' },
      { name: '半场 3v3', met: 6.5 },
      { name: '全场 5v5', met: 8.0 },
      { name: '投篮练习', met: 4.5 },
    ],
  },
  {
    id: 'football',
    name: '足球',
    group: 'ball',
    variants: [
      { name: '5 人制', met: 8.0 },
      { name: '11 人制', met: 7.0 },
      { name: '训练', met: 6.0 },
    ],
  },
  {
    id: 'tennis',
    name: '网球',
    group: 'ball',
    variants: [
      { name: '单打', met: 7.3 },
      { name: '双打', met: 6.0 },
    ],
  },
  {
    id: 'pingpong',
    name: '乒乓球',
    group: 'ball',
    variants: [
      { name: '单打', met: 4.0 },
      { name: '双打', met: 3.5 },
      { name: '多球训练', met: 5.5 },
    ],
  },
  {
    id: 'volleyball',
    name: '排球',
    group: 'ball',
    variants: [
      { name: '室内', met: 4.0 },
      { name: '沙滩', met: 8.0 },
    ],
  },

  {
    id: 'bike',
    name: '骑行',
    group: 'bike',
    distance: true,
    variants: [
      { name: '通勤', met: 6.8, note: '约 16 km/h' },
      { name: '公路', met: 8.0, note: '约 20 km/h' },
      { name: '山地', met: 8.5 },
      { name: '冲刺', met: 10.0 },
    ],
  },
  {
    id: 'spin',
    name: '动感单车',
    group: 'bike',
    variants: [
      { name: '常规', met: 8.5 },
      { name: '间歇', met: 10.0 },
    ],
  },

  {
    id: 'swim',
    name: '游泳',
    group: 'swim',
    distance: true,
    variants: [
      { name: '自由泳', met: 9.8 },
      { name: '蛙泳', met: 7.0 },
      { name: '仰泳', met: 7.0 },
      { name: '蝶泳', met: 11.0 },
    ],
  },

  {
    id: 'hiit',
    name: 'HIIT',
    group: 'class',
    variants: [
      { name: '常规', met: 8.0 },
      { name: 'Tabata', met: 10.0 },
    ],
  },
  {
    id: 'yoga',
    name: '瑜伽',
    group: 'class',
    variants: [
      { name: '哈他', met: 2.5 },
      { name: '流瑜伽', met: 4.0 },
      { name: '热瑜伽', met: 5.0 },
    ],
  },
  {
    id: 'pilates',
    name: '普拉提',
    group: 'class',
    variants: [
      { name: '垫上', met: 3.0 },
      { name: '器械', met: 4.0 },
    ],
  },
  {
    id: 'aerobics',
    name: '健身操',
    group: 'class',
    variants: [
      { name: '低冲击', met: 5.0 },
      { name: '高冲击', met: 7.3 },
    ],
  },
  {
    id: 'boxing',
    name: '搏击',
    group: 'class',
    variants: [
      { name: '沙袋', met: 7.8 },
      { name: '实战', met: 10.0 },
    ],
  },
  {
    id: 'dance',
    name: '舞蹈',
    group: 'class',
    variants: [
      { name: '爵士', met: 5.0 },
      { name: '尊巴', met: 6.5 },
      { name: '街舞', met: 7.0 },
    ],
  },
  {
    id: 'stretch',
    name: '拉伸',
    group: 'class',
    variants: [
      { name: '静态拉伸', met: 2.3 },
      { name: '泡沫轴', met: 2.0 },
    ],
  },

  {
    id: 'rope',
    name: '跳绳',
    group: 'other',
    variants: [
      { name: '慢速', met: 8.8 },
      { name: '常规', met: 12.3 },
      { name: '双摇', met: 15.0 },
    ],
  },
  {
    id: 'stairs',
    name: '爬楼 / 登山',
    group: 'other',
    variants: [
      { name: '爬楼', met: 8.8 },
      { name: '登山', met: 7.0 },
    ],
  },
  {
    id: 'hike',
    name: '徒步',
    group: 'other',
    variants: [
      { name: '平地', met: 5.0 },
      { name: '负重', met: 7.0 },
    ],
  },
  {
    id: 'rowing',
    name: '划船机',
    group: 'other',
    variants: [
      { name: '常规', met: 7.0 },
      { name: '间歇', met: 9.0 },
    ],
  },
  { id: 'elliptical', name: '椭圆机', group: 'other', variants: [{ name: '常规', met: 5.0 }] },
  {
    id: 'housework',
    name: '家务',
    group: 'other',
    variants: [
      { name: '打扫', met: 3.3 },
      { name: '搬东西', met: 5.0 },
    ],
  },
]

export function activitiesByGroup(group: CardioGroup): CardioActivity[] {
  return CARDIO_ACTIVITIES.filter((a) => a.group === group)
}

export const INTENSITY_LABEL: Record<Intensity, string> = {
  low: '轻松',
  mid: '中等',
  high: '全力',
}

export const INTENSITY_FACTOR: Record<Intensity, number> = {
  low: 0.85,
  mid: 1,
  high: 1.2,
}

export function cardioKcal(
  met: number,
  weightKg: number,
  minutes: number,
  intensity: Intensity = 'mid',
): number {
  return Math.round((met * INTENSITY_FACTOR[intensity] * weightKg * minutes) / 60)
}

/** 每小时热量，用来横向比较不同项目 */
export function kcalPerHour(met: number, weightKg: number, intensity: Intensity = 'mid'): number {
  return Math.round(met * INTENSITY_FACTOR[intensity] * weightKg)
}

/** 给出区间而不是假精确：±8% */
export function kcalRange(kcal: number, spread = 0.08): [number, number] {
  return [Math.round(kcal * (1 - spread)), Math.round(kcal * (1 + spread))]
}

/** 跑步类按配速估算热量（约 1.036 kcal/kg/km） */
export function runKcalByDistance(weightKg: number, km: number): number {
  return Math.round(weightKg * km * 1.036)
}

/**
 * 步数消耗经验公式：约 0.0005 kcal / (kg·步)
 * 例：70kg 走 10000 步 ≈ 350 kcal
 */
export function stepsKcal(weightKg: number, steps: number): number {
  return Math.round(weightKg * steps * 0.0005)
}

/** 配速：分钟/公里 → "5'42\"" */
export function paceLabel(minutes: number, km: number): string | null {
  if (km <= 0 || minutes <= 0) return null
  const per = minutes / km
  const m = Math.floor(per)
  const s = Math.round((per - m) * 60)
  return `${m}'${String(s).padStart(2, '0')}"`
}
