import { Capacitor, registerPlugin } from '@capacitor/core'

interface StepResult {
  steps: number
  available?: boolean
  total?: number
  branch?: string
  bootToday?: boolean
  base?: number
  savedDate?: string
  latest?: number
  apiLevel?: number
  bootUptimeMs?: number
}

interface StepCounterPlugin {
  isAvailable(): Promise<{ available: boolean }>
  getToday(): Promise<StepResult>
}

const StepCounter = registerPlugin<StepCounterPlugin>('StepCounter')

interface HealthProbePackage {
  matches: string
  matchCount: number
  error?: string | null
}

interface HealthProbeResult {
  apiLevel: number
  androidRelease?: string
  deviceBrand?: string
  deviceModel?: string
  sdkExtension: number
  sdkExtensionError?: string
  builtInHC: boolean
  providerInstalled: boolean
  providerEnabled: boolean
  providerVersion?: string
  providerReason?: string
  healthPackages: HealthProbePackage
}

interface HealthProbePlugin {
  probe(): Promise<HealthProbeResult>
}

const HealthProbe = registerPlugin<HealthProbePlugin>('HealthProbe')

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
  branch: string | null
  bootToday: boolean | null
  base: number | null
  savedDate: string | null
  latest: number | null
  apiLevel: number | null
  bootUptimeMs: number | null
}

/** 诊断用：把插件原始返回暴露到界面上，方便真机定位 */
export async function readStepsDebug(): Promise<StepDebug> {
  const out: StepDebug = {
    native: isNativeApp,
    available: null,
    steps: null,
    total: null,
    error: null,
    branch: null,
    bootToday: null,
    base: null,
    savedDate: null,
    latest: null,
    apiLevel: null,
    bootUptimeMs: null,
  }
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
    out.branch = r.branch ?? null
    out.bootToday = r.bootToday ?? null
    out.base = r.base ?? null
    out.savedDate = r.savedDate ?? null
    out.latest = r.latest ?? null
    out.apiLevel = r.apiLevel ?? null
    out.bootUptimeMs = r.bootUptimeMs ?? null
  } catch (e) {
    out.error = e instanceof Error ? e.message : String(e)
  }
  return out
}

/** 健康平台（Health Connect）可行性探测结果 */
export interface HealthProbeDebug {
  ok: boolean
  data: HealthProbeResult | null
  error: string | null
}

/** 探测本机 Health Connect 是否可用、装了哪些健康类应用（纯系统层，不读步数） */
export async function readHealthProbe(): Promise<HealthProbeDebug> {
  if (!isNativeApp) return { ok: false, data: null, error: '不在原生壳里（网页版无法探测）' }
  try {
    const data = await HealthProbe.probe()
    return { ok: true, data, error: null }
  } catch (e) {
    return { ok: false, data: null, error: e instanceof Error ? e.message : String(e) }
  }
}