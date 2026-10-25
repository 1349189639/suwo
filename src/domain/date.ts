const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function todayKey(): string {
  return dateKey(new Date())
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: string, n: number): string {
  const d = fromKey(key)
  d.setDate(d.getDate() + n)
  return dateKey(d)
}

export function lastNDates(endKey: string, n: number): string[] {
  const out: string[] = []
  for (let i = n - 1; i >= 0; i -= 1) out.push(addDays(endKey, -i))
  return out
}

export function weekdayCN(key: string): string {
  return WEEKDAYS[fromKey(key).getDay()]
}

export function weekdayShort(key: string): string {
  return ['日', '一', '二', '三', '四', '五', '六'][fromKey(key).getDay()]
}

export function formatCN(key: string): string {
  const d = fromKey(key)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

export function daysBetween(from: string, to: string): number {
  return Math.round((fromKey(to).getTime() - fromKey(from).getTime()) / 86_400_000)
}

export function ageFromYear(birthYear: number, now = new Date()): number {
  return Math.max(16, now.getFullYear() - birthYear)
}
