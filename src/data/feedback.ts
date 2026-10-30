import type { AppData } from '../domain/types'

export type FeedbackKind = 'bug' | 'idea' | 'other'

export interface FeedbackItem {
  id: string
  at: number
  kind: FeedbackKind
  text: string
  version: string
}

const KEY = 'suwo:feedback:v1'
const MAX = 50

export const FEEDBACK_KINDS: { id: FeedbackKind; label: string }[] = [
  { id: 'bug', label: '有问题' },
  { id: 'idea', label: '提建议' },
  { id: 'other', label: '其他' },
]

export function loadFeedback(): FeedbackItem[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr)) return []
    // 旧版本缓存里可能带 contact 字段，这里按当前结构过滤，多余字段不影响展示。
    return (arr as Array<Partial<FeedbackItem> & { contact?: string }>)
      .filter((x) => x && typeof x.text === 'string' && x.kind && x.at)
      .map((x) => ({ id: String(x.id), at: x.at!, kind: x.kind!, text: x.text!, version: x.version ?? '' }))
      .slice(-MAX)
  } catch {
    return []
  }
}

export function saveFeedback(list: FeedbackItem[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX)))
  } catch {
    /* 存不下不影响提交 */
  }
}

/** 反馈提交时附带的本机数据量快照（后台定位问题用）。 */
export function feedbackSnapshot(data: AppData): { foodCount: number; exerciseCount: number } {
  return { foodCount: data.foodLogs.length, exerciseCount: data.exercises.length }
}
