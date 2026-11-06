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
  /** 冗余展示字段：新包签名证书 SHA-256（真正的校验在原生层） */
  signerCertSha256?: string
  /** true = 签名已换代，必须卸载重装，不能走应用内安装 */
  requiresManualReinstall?: boolean
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

/**
 * 换签名后，旧包（debug 签名时代，code<=3）无法覆盖安装新包，
 * 必须走「同步 → 卸载 → 重装」的手动路径。纯函数，方便单测。
 */
export function needsManualReinstall(currentCode: number, targetCode: number): boolean {
  return currentCode > 0 && currentCode <= 3 && targetCode >= 4
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

    if (needsManualReinstall(cur.code, target)) return { ...j, requiresManualReinstall: true }
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
  try {
    await Updater.install({ path })
  } catch (e) {
    // 原生层签名校验失败 / 系统安装器拒绝：给出人话，不要让用户只看到 "应用未安装"
    const raw = e instanceof Error ? e.message : String(e)
    if (/签名|signature|certificate/i.test(raw)) {
      throw new Error(raw)
    }
    if (/未安装|INSTALL_FAILED|应用未安装/i.test(raw)) {
      throw new Error(
        '安装失败：可能是签名已升级或版本冲突。请先在「我的 → 同步」确认数据已上云，卸载旧版后重新安装。',
      )
    }
    throw new Error(raw || '安装失败，请稍后再试')
  }
}
