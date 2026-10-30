import type { AppData } from '../domain/types'

export type FeedbackKind = 'bug' | 'idea' | 'other'

export interface FeedbackItem {
  id: string
  at: number
  kind: FeedbackKind
  text: string
  contact: string
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
    return (arr as FeedbackItem[]).filter((x) => x && typeof x.text === 'string').slice(-MAX)
  } catch {
    return []
  }
}

export function saveFeedback(list: FeedbackItem[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX)))
  } catch {
    /* 存不下不影响复制 */
  }
}

/** 把反馈整理成一段可直接发送的文本（含版本与设备信息，方便定位问题） */
export function formatFeedback(item: FeedbackItem, data: AppData): string {
  const logs = data.foodLogs.length
  const exs = data.exercises.length
  return [
    `【塑我 · ${FEEDBACK_KINDS.find((k) => k.id === item.kind)?.label ?? '反馈'}】`,
    item.text.trim(),
    '',
    item.contact.trim() ? `联系方式：${item.contact.trim()}` : '',
    `版本：${item.version}`,
    `时间：${new Date(item.at).toLocaleString('zh-CN')}`,
    `数据量：饮食 ${logs} 条 / 运动 ${exs} 条`,
    `设备：${navigator.userAgent.slice(0, 90)}`,
  ]
    .filter(Boolean)
    .join('\n')
}
