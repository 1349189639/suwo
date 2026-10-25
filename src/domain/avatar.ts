import type { WeightEntry } from './types'

export type BodyStage = 1 | 2 | 3 | 4 | 5

export interface StageInfo {
  stage: BodyStage
  label: string
  desc: string
}

export const BODY_STAGES: StageInfo[] = [
  { stage: 1, label: '精瘦', desc: '腹肌 / 马甲线清晰' },
  { stage: 2, label: '匀称', desc: '线条开始显现' },
  { stage: 3, label: '标准', desc: '处在健康区间' },
  { stage: 4, label: '偏胖', desc: '开始囤积脂肪' },
  { stage: 5, label: '肥胖', desc: '需要认真干预' },
]

export function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v))
}

/**
 * 平滑体重：按记录时间顺序做指数平滑（alpha 0.3）。
 * 单次称重的波动（水分、盐分）不应该立刻反映到体型上。
 */
export function smoothWeight(weights: WeightEntry[], cutoff?: string, alpha = 0.3): number | null {
  const list = [...weights]
    .filter((w) => (cutoff ? w.date <= cutoff : true))
    .sort((a, b) => a.date.localeCompare(b.date))
  if (list.length === 0) return null
  let value = list[0].kg
  for (let i = 1; i < list.length; i += 1) {
    value = alpha * list[i].kg + (1 - alpha) * value
  }
  return Math.round(value * 10) / 10
}

/**
 * BMI → 体型参数 0（精瘦）–1（肥胖）。
 * 真实比例下 1kg 只有约 1cm 腰围，在手机上不到 1 像素，所以这里把
 * 映射区间压到 18.3–27.5，让 5kg 左右的变化肉眼可见（有意放大）。
 */
export function buildFromBmi(bmi: number): number {
  return clamp01((bmi - 18.3) / (27.5 - 18.3))
}

/** 肌肉显现度：越瘦越明显 */
export function muscleFromBuild(build: number): number {
  return clamp01(1 - build * 1.2)
}

export function stageFromBmi(bmi: number): BodyStage {
  if (bmi < 19) return 1
  if (bmi < 21) return 2
  if (bmi < 24) return 3
  if (bmi < 28) return 4
  return 5
}

export function stageInfo(stage: BodyStage): StageInfo {
  return BODY_STAGES[stage - 1]
}

/** 与上一次相比的变化，用于文案「比上次 -0.4kg」 */
export function weightDelta(weights: WeightEntry[]): number | null {
  if (weights.length < 2) return null
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date))
  return Math.round((sorted[sorted.length - 1].kg - sorted[sorted.length - 2].kg) * 10) / 10
}
