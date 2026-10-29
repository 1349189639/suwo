/**
 * 塑我 · 云端同步编排层 v1（2026-10-29）
 *
 * 职责（豆包数据层领地：cloud*.ts / store.ts / storage.ts / auth.ts）：
 * - 登录成功后拉取云端整档，与本地离线副本三向合并；
 * - 每次写操作先落本地、标记 dirty，联网后异步推送；失败保留 dirty，不阻塞使用；
 * - 云端返回 JSON 一律先过 normalize() 再进入状态，避免脏字段扩散；
 * - 首次云端登录：把旧本地账号（fitpal:v1*）那份历史数据迁移合并到当前云端账号名下。
 *
 * 合并口径（与协作板 #1 约定一致，不采用“谁后写谁赢”）：
 * - profile / goal / look / avatarAction：单值字段，本地非空以本地为准，本地空则取云端；
 * - foodLogs / exercises / customFoods / weights：按 id 取并集，同 id 按 createdAt 取较新；
 * - steps / water / mealCosts：按日期 key 取并集，同 key 本地覆盖本地最近操作。
 */
import type { AppData, ExerciseLog, FoodLog, FoodItem, WeightEntry } from '../domain/types'
import { normalize, emptyData } from './storage'
import { loadDoc, saveDoc, type CloudUser } from './cloud.v2'

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'dirty' | 'offline' | 'error'

const CLOUD_CACHE_PREFIX = 'suwo:cloud:'
const DIRTY_KEY = 'suwo:dirty'
const MIGRATED_KEY = 'suwo:migrated'
const LEGACY_PREFIX = 'fitpal:v1'

function cacheKey(uid: string): string {
  return `${CLOUD_CACHE_PREFIX}${uid}`
}

/** 读取当前云端账号的本地离线缓存（未经 normalize，交由调用方 normalize）。 */
export function readLocalCache(uid: string): AppData | null {
  try {
    const raw = localStorage.getItem(cacheKey(uid))
    if (!raw) return null
    return normalize(JSON.parse(raw))
  } catch {
    return null
  }
}

/** 写当前云端账号的本地离线副本。 */
export function writeLocalCache(uid: string, data: AppData): void {
  try {
    localStorage.setItem(cacheKey(uid), JSON.stringify(data))
  } catch (err) {
    console.error('写离线缓存失败', err)
  }
}

export function markDirty(dirty: boolean): void {
  try {
    if (dirty) localStorage.setItem(DIRTY_KEY, '1')
    else localStorage.removeItem(DIRTY_KEY)
  } catch {
    /* 忽略 */
  }
}

export function isDirty(): boolean {
  try {
    return localStorage.getItem(DIRTY_KEY) === '1'
  } catch {
    return false
  }
}

/** 找出旧本地账号体系里“非空”的历史数据，用于一次性迁移。 */
function legacyLocalData(): AppData | null {
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i)
      if (k && k.startsWith(LEGACY_PREFIX)) keys.push(k)
    }
    let best: AppData | null = null
    for (const k of keys) {
      const raw = localStorage.getItem(k)
      if (!raw) continue
      const d = normalize(JSON.parse(raw))
      // 只认有档案的那份为“真实历史数据”，空演示/空档跳过
      if (d.profile && (!best || d.foodLogs.length > best.foodLogs.length)) best = d
    }
    return best
  } catch {
    return null
  }
}

/** 该云端账号是否已经完成过一次旧数据迁移。 */
export function hasMigrated(uid: string): boolean {
  try {
    return localStorage.getItem(`${MIGRATED_KEY}:${uid}`) === '1'
  } catch {
    return false
  }
}

function markMigrated(uid: string): void {
  try {
    localStorage.setItem(`${MIGRATED_KEY}:${uid}`, '1')
  } catch {
    /* 忽略 */
  }
}

function byNewestId<T extends { id: string; createdAt?: number }>(arr: T[]): T[] {
  const map = new Map<string, T>()
  for (const item of arr) {
    const prev = map.get(item.id)
    if (!prev) {
      map.set(item.id, item)
      continue
    }
    if ((item.createdAt ?? 0) >= (prev.createdAt ?? 0)) map.set(item.id, item)
  }
  return Array.from(map.values())
}

function mergeDict<T>(local: Record<string, T> | undefined, remote: Record<string, T> | undefined): Record<string, T> {
  const out: Record<string, T> = { ...(remote ?? {}) }
  // 本地覆盖本地最近操作；云端独有 key 保留
  return { ...out, ...(local ?? {}) }
}

/**
 * 三向合并：local 为本地离线副本（可能是旧迁移数据），remote 为云端整档（可能为 null）。
 * 返回值已经过 normalize 的等价结构，调用方拿到后可直接入 store。
 */
export function mergeAppData(local: AppData | null, remote: AppData | null): AppData {
  const L = local ? normalize(local) : null
  const R = remote ? normalize(remote) : null

  const base = emptyData()
  const fallback = L ?? R ?? emptyData()

  const profile = L?.profile ?? R?.profile ?? null
  const goal = L?.goal ?? R?.goal ?? null

  // 体重按日期取并集，同日期本地覆盖本地最近记录
  const weightMap = new Map<string, WeightEntry>()
  for (const w of R?.weights ?? []) weightMap.set(w.date, w)
  for (const w of L?.weights ?? []) weightMap.set(w.date, w)
  const weights: WeightEntry[] = Array.from(weightMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  )

  const foodLogs: FoodLog[] = byNewestId([...(R?.foodLogs ?? []), ...(L?.foodLogs ?? [])])
  const exercises: ExerciseLog[] = byNewestId([...(R?.exercises ?? []), ...(L?.exercises ?? [])])
  const customFoods: FoodItem[] = byNewestId([...(R?.customFoods ?? []), ...(L?.customFoods ?? [])])

  const steps = mergeDict(L?.steps, R?.steps)
  const water = mergeDict(L?.water, R?.water)
  const mealCosts = mergeDict(L?.mealCosts, R?.mealCosts)

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
    avatarAction: L?.avatarAction ?? R?.avatarAction,
    look: L?.look ?? R?.look,
    createdAt: L?.createdAt ?? R?.createdAt ?? fallback.createdAt,
  }
}

export interface BootstrapResult {
  data: AppData
  migrated: boolean
  source: 'cloud' | 'local' | 'merged' | 'empty'
}

/**
 * 登录 / 启动恢复会话后执行：拉云端 → 与本地缓存（首次含旧本地账号历史）合并 → 写本地缓存。
 * 云端读不到时不报错，按本地数据走（离线可用）。
 */
export async function bootstrapForUser(user: CloudUser): Promise<BootstrapResult> {
  let remote: AppData | null = null
  try {
    const doc = await loadDoc(user.uid)
    remote = doc ? normalize(doc) : null
  } catch (e) {
    console.warn('拉取云端数据失败，先按本地缓存启动', e)
    remote = null
  }

  let local = readLocalCache(user.uid)
  let migrated = false

  // 首次：本地缓存为空，尝试把旧本地账号历史搬进来合并
  if (!local && !hasMigrated(user.uid)) {
    const legacy = legacyLocalData()
    if (legacy) {
      local = legacy
      migrated = true
    }
  }

  const data = mergeAppData(local, remote)
  writeLocalCache(user.uid, data)
  if (migrated) markMigrated(user.uid)

  let source: BootstrapResult['source'] = 'empty'
  if (remote && local) source = 'merged'
  else if (remote) source = 'cloud'
  else if (local) source = 'local'

  return { data, migrated, source }
}

/** 把当前整档推送到云端（整档覆盖式；本地已是三向合并后的权威副本）。 */
export async function pushToCloud(user: CloudUser, data: AppData): Promise<void> {
  await saveDoc(user.uid, data)
}
