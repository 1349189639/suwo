import { App as CapApp } from '@capacitor/app'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'

interface UpdaterPlugin {
  install(o: { path: string }): Promise<{ ok: boolean }>
  canInstall(): Promise<{ allowed: boolean }>
}

const Updater = registerPlugin<UpdaterPlugin>('Updater')

export interface RemoteUpdate {
  /** 展示用的版本名，如 1.1 */
  version: string
  /** 原生 versionCode，必须单调递增 */
  nativeCode?: number
  /** 新 APK 的下载地址 */
  apkUrl?: string
  sizeMb?: number
  notes?: string[]
}

export interface NativeVersion {
  code: number
  name: string
}

/** 读当前装着的 APK 版本（网页版返回 0） */
export async function nativeVersion(): Promise<NativeVersion> {
  if (!Capacitor.isNativePlatform()) return { code: 0, name: 'web' }
  try {
    const info = await CapApp.getInfo()
    return { code: Number(info.build ?? 0) || 0, name: String(info.version ?? '') }
  } catch {
    return { code: 0, name: '' }
  }
}

/** 有没有新版本；没有则返回 null */
export async function checkUpdate(): Promise<RemoteUpdate | null> {
  if (!Capacitor.isNativePlatform()) return null
  try {
    const r = await fetch('./version.json?t=' + Date.now(), { cache: 'no-store' })
    if (!r.ok) return null
    const j = (await r.json()) as RemoteUpdate
    if (!j.apkUrl) return null
    const cur = await nativeVersion()
    const target = j.nativeCode ?? 0
    if (target <= cur.code) return null
    return j
  } catch {
    return null
  }
}

/** 下载并调起安装器；调用成功后系统会弹安装界面 */
export async function downloadAndInstall(
  update: RemoteUpdate,
  onProgress: (percent: number) => void,
): Promise<void> {
  const url = update.apkUrl
  if (!url) throw new Error('没有下载地址')

  const perm = await Updater.canInstall().catch(() => ({ allowed: true }))
  if (!perm.allowed) {
    throw new Error('需要先允许「安装未知应用」：手机设置 → 应用 → 塑我 → 安装未知应用')
  }

  onProgress(1)
  const filename = 'suwo-' + (update.nativeCode ?? Date.now()) + '.apk'
  const res = await Filesystem.downloadFile({
    url,
    path: filename,
    directory: Directory.Cache,

  })

  const raw = res.path ?? ''
  const path = raw.startsWith('file://') ? decodeURIComponent(raw.slice(7)) : raw
  if (!path) throw new Error('下载完成但没拿到文件路径')

  onProgress(100)
  await Updater.install({ path })
}
