import { CURRENT_VERSION } from './changelog'

export interface RemoteVersion {
  version: string
  date?: string
  notes?: string[]
  apkUrl?: string
}

export async function fetchRemoteVersion(): Promise<RemoteVersion | null> {
  try {
    const r = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!r.ok) return null
    return (await r.json()) as RemoteVersion
  } catch {
    return null
  }
}

function parts(v: string): number[] {
  return v.split('.').map((x) => Number.parseInt(x.replace(/\D/g, ''), 10) || 0)
}

export function isNewer(remote: string, current = CURRENT_VERSION): boolean {
  const a = parts(remote)
  const b = parts(current)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0
    const y = b[i] ?? 0
    if (x !== y) return x > y
  }
  return false
}
