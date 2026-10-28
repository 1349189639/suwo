import { create } from 'zustand'
import { todayKey } from '../domain/date'
import type { Look } from '../domain/look'
import type {
  AppData,
  AvatarAction,
  ExerciseLog,
  FoodItem,
  FoodLog,
  Goal,
  Profile,
} from '../domain/types'
import { currentAccountId } from './auth'
import { seedDemoIfNeeded } from './demo'
import { clearData, emptyData, importJson, loadData, saveData, setActiveAccount } from './storage'

// 先按当前登录账号切换数据命名空间，再决定要不要灌演示数据
setActiveAccount(currentAccountId())
seedDemoIfNeeded()

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
  switchAccount: (id: string | null) => void
  replaceData: (text: string) => boolean
  reset: () => void
}

export const useStore = create<Store>((set, get) => {
  const commit = (data: AppData) => {
    saveData(data)
    set({ data })
  }

  return {
    data: loadData(),
    toast: null,

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

    switchAccount: (id) => {
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

    reset: () => {
      clearData()
      set({ data: emptyData() })
    },
  }
})
