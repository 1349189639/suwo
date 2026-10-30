import { create } from 'zustand'
import { todayKey } from '../domain/date'
import type { Look } from '../domain/look'
import { normalizeLook } from '../domain/look'
import type {
  AppData,
  AvatarAction,
  ExerciseLog,
  FoodItem,
  FoodLog,
  Goal,
  Profile,
} from '../domain/types'
import { clearData, emptyData, importJson, loadData, saveData, setActiveAccount } from './storage'
import { seedDemoIfNeeded } from './demo'
import * as cloud from './cloud.v2'
import type { CloudUser } from './cloud.v2'
import {
  bootstrapForUser,
  pushToCloud,
  readLocalCache,
  writeLocalCache,
  markDirty,
  type SyncStatus,
} from './sync'

// 模块加载期：云端会话尚未恢复，先以匿名命名空间启动；登录后由 cloudLogin / cloudBootstrap 切换。
setActiveAccount(null)

let uid = 0
function nextId(prefix: string): string {
  uid += 1
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${Date.now().toString(36)}_${uid}_${rand}`
}

interface Store {
  data: AppData
  toast: string | null
  setToast: (msg: string | null) => void

  // ===== 原有业务方法（签名保持不变，禁止改名） =====
  saveProfile: (profile: Profile, weightKg: number) => void
  saveGoal: (goal: Goal) => void
  logWeight: (kg: number, date?: string) => void
  addFoodLog: (log: Omit<FoodLog, 'id' | 'createdAt'>) => void
  removeFoodLog: (id: string) => void
  updateFoodLog: (id: string, patch: Partial<FoodLog>) => void
  addExercise: (log: Omit<ExerciseLog, 'id' | 'createdAt'>) => void
  removeExercise: (id: string) => void
  setSteps: (steps: number, date?: string) => void
  setWater: (ml: number, date?: string) => void
  setMealCost: (date: string, meal: string, amount: number) => void
  addCustomFood: (food: Omit<FoodItem, 'id'>) => void
  setAvatarAction: (action: AvatarAction) => void
  setLook: (look: Look) => void
  /** 仅切换服装款式，保留皮肤/发型/发色/服装色等其余外观 */
  setOutfitStyle: (style: Look['outfitStyle']) => void
  switchAccount: (id: string | null) => void
  replaceData: (text: string) => boolean
  reset: () => Promise<void>

  // ===== 云端会话与同步（新增，只增不改旧方法） =====
  cloudUser: CloudUser | null
  syncStatus: SyncStatus
  bootstrapping: boolean
  /** 页面启动：恢复云端已有会话并拉取/合并数据。无会话则保持未登录。 */
  cloudBootstrap: () => Promise<void>
  /** 云端账号密码登录，首次登录自动合并旧本地数据。 */
  cloudLogin: (account: string, password: string) => Promise<void>
  /** 退出云端登录并清掉本机离线副本。 */
  cloudLogout: () => Promise<void>
  cloudChangePassword: (oldPassword: string, newPassword: string) => Promise<void>
  cloudDeleteAccount: (password: string) => Promise<void>
  /** 手动双向同步：先拉取云端最新并与本地合并写回，再把合并结果推送上去。 */
  syncNow: () => Promise<void>
}

/** 推送并发控制：上一次推送未结束时不重复发；期间又有改动则记一个待补推标记。 */
let pushing = false
let repushPending = false

export const useStore = create<Store>((set, get) => {
  /** 写本地（旧命名空间 + 云端离线缓存），标记 dirty，并尝试异步推送。 */
  const commit = (data: AppData) => {
    saveData(data)
    const user = get().cloudUser
    if (user) {
      writeLocalCache(user.uid, data)
      markDirty(true)
      set({ syncStatus: 'dirty' })
    }
    // 必须先把最新整档写进 store，再触发推送；否则 pushOnce 内 get().data 读到的还是旧快照，
    // 新记录只进了本地缓存、云端却收到旧数据（数组类记录会被“漏掉”）。
    set({ data })
    if (user) void pushOnce()
  }

  async function pushOnce(): Promise<void> {
    const user = get().cloudUser
    if (!user) return
    if (pushing) {
      // 上一次还在推：记下"结束后要再补推一次最新状态"，避免最后一次改动被丢弃。
      repushPending = true
      return
    }
    pushing = true
    try {
      set({ syncStatus: 'syncing' })
      // 始终推送当前最新的整档，而不是入队时的快照
      await pushToCloud(user, get().data)
      markDirty(false)
      set({ syncStatus: 'synced' })
    } catch (e) {
      console.error('云端推送失败，保留本地待下次同步', e)
      markDirty(true)
      set({ syncStatus: 'offline' })
    } finally {
      pushing = false
      if (repushPending) {
        repushPending = false
        void pushOnce()
      }
    }
  }

  return {
    data: loadData(),
    toast: null,
    cloudUser: null,
    syncStatus: 'idle',
    bootstrapping: true,

    setToast: (msg) => set({ toast: msg }),

    saveProfile: (profile, weightKg) => {
      const data = { ...get().data, profile }
      const today = todayKey()
      const weights = data.weights.filter((w) => w.date !== today)
      data.weights = [...weights, { date: today, kg: weightKg }].sort((a, b) =>
        a.date.localeCompare(b.date),
      )
      commit(data)
    },

    saveGoal: (goal) => commit({ ...get().data, goal }),

    logWeight: (kg, date) => {
      const d = date ?? todayKey()
      const data = { ...get().data }
      data.weights = [...data.weights.filter((w) => w.date !== d), { date: d, kg }].sort(
        (a, b) => a.date.localeCompare(b.date),
      )
      commit(data)
    },

    addFoodLog: (log) => {
      const data = { ...get().data }
      data.foodLogs = [...data.foodLogs, { ...log, id: nextId('f'), createdAt: Date.now() }]
      commit(data)
    },

    updateFoodLog: (id, patch) => {
      const data = { ...get().data }
      data.foodLogs = data.foodLogs.map((l) => (l.id === id ? { ...l, ...patch } : l))
      commit(data)
    },

    removeFoodLog: (id) => {
      const data = { ...get().data }
      data.foodLogs = data.foodLogs.filter((l) => l.id !== id)
      commit(data)
    },

    addExercise: (log) => {
      const data = { ...get().data }
      data.exercises = [...data.exercises, { ...log, id: nextId('e'), createdAt: Date.now() }]
      commit(data)
    },

    removeExercise: (id) => {
      const data = { ...get().data }
      data.exercises = data.exercises.filter((e) => e.id !== id)
      commit(data)
    },

    setSteps: (steps, date) => {
      const d = date ?? todayKey()
      const data = { ...get().data }
      data.steps = { ...data.steps, [d]: Math.max(0, Math.round(steps)) }
      commit(data)
    },

    setMealCost: (date, meal, amount) => {
      const data = { ...get().data }
      const key = `${date}:${meal}`
      const next = { ...(data.mealCosts ?? {}) }
      if (amount > 0) next[key] = Math.round(amount * 100) / 100
      else delete next[key]
      data.mealCosts = next
      commit(data)
    },

    setWater: (ml, date) => {
      const d = date ?? todayKey()
      const data = { ...get().data }
      data.water = { ...(data.water ?? {}), [d]: Math.max(0, Math.round(ml)) }
      commit(data)
    },

    addCustomFood: (food) => {
      const data = { ...get().data }
      data.customFoods = [...data.customFoods, { ...food, id: nextId('c'), custom: true }]
      commit(data)
    },

    setAvatarAction: (action) => {
      commit({ ...get().data, avatarAction: action })
    },

    setLook: (look) => {
      commit({ ...get().data, look })
    },

    setOutfitStyle: (style) => {
      const data = get().data
      const gender = data.profile?.gender ?? 'male'
      const merged = normalizeLook({ ...(data.look ?? {}), outfitStyle: style }, gender)
      commit({ ...data, look: merged })
    },

    switchAccount: (id) => {
      // 兼容旧本地账号入口；云端流程以 cloudLogin / cloudLogout 为准。
      setActiveAccount(id)
      set({ data: loadData() })
    },

    replaceData: (text) => {
      try {
        commit(importJson(text))
        return true
      } catch {
        return false
      }
    },

    reset: async () => {
      const empty = emptyData()
      const user = get().cloudUser

      // 已登录云端：先把空档覆盖推到云端，否则重新登录时三向合并会把旧记录并回来，
      // 本机清空就没有意义。云端推送失败不回滚本地清空（本机已回到空档），但把错误抛出给界面提示。
      if (user) {
        try {
          await pushToCloud(user, empty)
        } catch (e) {
          markDirty(true)
          set({ syncStatus: 'offline' })
          throw e
        }
      }

      clearData()
      set({ data: empty, syncStatus: user ? 'synced' : 'idle' })
      if (user) writeLocalCache(user.uid, empty)
      markDirty(false)
    },

    // ===== 云端 =====

    cloudBootstrap: async () => {
      set({ bootstrapping: true })
      try {
        const user = await cloud.currentUser()
        if (!user) {
          set({ cloudUser: null, syncStatus: 'idle', bootstrapping: false })
          return
        }
        setActiveAccount(user.uid)
        const result = await bootstrapForUser(user)
        set({ cloudUser: user, data: result.data, syncStatus: 'synced', bootstrapping: false })
        seedDemoIfNeeded()
        const after = get().data
        writeLocalCache(user.uid, after)
        // 首次迁移或本地有未推数据时，补推一次
        markDirty(true)
        await pushOnce()
      } catch (e) {
        console.error('启动恢复云端会话失败', e)
        set({ bootstrapping: false, syncStatus: 'error' })
      }
    },

    cloudLogin: async (account, password) => {
      const user = await cloud.signIn(account, password)
      setActiveAccount(user.uid)
      const result = await bootstrapForUser(user)
      set({ cloudUser: user, data: result.data, syncStatus: 'syncing' })
      seedDemoIfNeeded()
      writeLocalCache(user.uid, get().data)
      await pushOnce()
    },

    cloudLogout: async () => {
      try {
        await cloud.signOut()
      } catch (e) {
        console.warn('云端登出接口报错，本地仍清理会话', e)
      }
      const user = get().cloudUser
      if (user) {
        try {
          localStorage.removeItem(`suwo:cloud:${user.uid}`)
        } catch {
          /* 忽略 */
        }
      }
      markDirty(false)
      setActiveAccount(null)
      clearData()
      set({ cloudUser: null, data: emptyData(), syncStatus: 'idle' })
    },

    cloudChangePassword: async (oldPassword, newPassword) => {
      await cloud.changePassword(oldPassword, newPassword)
    },

    cloudDeleteAccount: async (password) => {
      await cloud.deleteCloudAccount(password)
      // 删号成功后走一遍登出清理
      await get().cloudLogout()
    },

    syncNow: async () => {
      const user = get().cloudUser
      if (!user) return
      set({ syncStatus: 'syncing' })
      // 先拉取云端最新，与本地离线副本三向合并（bootstrapForUser 内部已写本地缓存）
      const result = await bootstrapForUser(user)
      // 合并结果写回 store，并同步落本地主存储，避免刷新页面 loadData() 丢掉刚拉下来的远端记录
      set({ data: result.data })
      saveData(result.data)
      writeLocalCache(user.uid, result.data)
      // 再把合并后的整档推上去，保证另一台设备的新记录不会只留在本机
      await pushOnce()
      // pushOnce 内部吞掉了网络错误并把状态置为 offline/error；这里把失败抛给界面，便于按钮提示「同步失败」
      if (get().syncStatus === 'offline' || get().syncStatus === 'error') {
        throw new Error('云端同步失败')
      }
    },
  }
})

// 供组件读取同步状态时复用；本地缓存读取辅助导出，避免界面重复拼 localStorage key。
export { readLocalCache }
