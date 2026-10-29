import { Capacitor, registerPlugin } from '@capacitor/core'

interface StepResult {
  steps: number
  available?: boolean
  total?: number
}

interface StepCounterPlugin {
  isAvailable(): Promise<{ available: boolean }>
  getToday(): Promise<StepResult>
}

const StepCounter = registerPlugin<StepCounterPlugin>('StepCounter')

/** 是否运行在 Capacitor 原生壳里（APK / iOS） */
export const isNativeApp = Capacitor.isNativePlatform()

/**
 * 读取系统计步器今天的步数。
 * 网页版返回 null（浏览器拿不到计步传感器），由调用方退回手动输入。
 */
export async function readNativeSteps(): Promise<number | null> {
  if (!isNativeApp) return null
  try {
    const { available } = await StepCounter.isAvailable()
    if (!available) return null
    const res = await StepCounter.getToday()
    if (!Number.isFinite(res.steps)) return null
    return Math.max(0, Math.round(res.steps))
  } catch {
    return null
  }
}

export interface StepDebug {
  native: boolean
  available: boolean | null
  steps: number | null
  total: number | null
  error: string | null
}

/** 诊断用：把插件原始返回暴露到界面上，方便真机定位 */
export async function readStepsDebug(): Promise<StepDebug> {
  const out: StepDebug = { native: isNativeApp, available: null, steps: null, total: null, error: null }
  if (!isNativeApp) {
    out.error = '不在原生壳里（网页版拿不到计步器）'
    return out
  }
  try {
    const a = await StepCounter.isAvailable()
    out.available = a.available
    const r = await StepCounter.getToday()
    out.steps = r.steps
    out.total = r.total ?? null
  } catch (e) {
    out.error = e instanceof Error ? e.message : String(e)
  }
  return out
}