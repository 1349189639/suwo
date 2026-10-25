import { MEAL_LABEL, type AppData } from '../domain/types'

function cell(v: string | number): string {
  const s = String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * 导出成 CSV：手机上的 WPS / Numbers / Excel 都能直接打开。
 * 前面加 BOM，避免中文在 Excel 里变乱码。
 */
export function toCsv(data: AppData): string {
  const header = ['日期', '类型', '项目', '数量', '单位', '热量kcal', '蛋白g', '碳水g', '脂肪g', '备注']
  const rows: (string | number)[][] = [header]

  const foods = [...data.foodLogs].sort((a, b) => a.createdAt - b.createdAt)
  for (const l of foods) {
    rows.push([
      l.date,
      '饮食',
      l.name,
      Math.round(l.grams),
      'g',
      l.kcal,
      l.p,
      l.c,
      l.f,
      MEAL_LABEL[l.meal],
    ])
  }

  const exercises = [...data.exercises].sort((a, b) => a.createdAt - b.createdAt)
  for (const e of exercises) {
    const note =
      e.kind === 'strength'
        ? `${e.sets ?? 0}组×${e.reps ?? 0}次 ${e.weightKg ?? 0}kg`
        : [e.distanceKm ? `${e.distanceKm}km` : '', e.intensity === 'low' ? '轻松' : e.intensity === 'high' ? '全力' : '中等']
            .filter(Boolean)
            .join(' · ')
    rows.push([
      e.date,
      '运动',
      e.name,
      e.minutes,
      '分钟',
      e.kcal,
      '',
      '',
      '',
      note,
    ])
  }

  const weights = [...data.weights].sort((a, b) => a.date.localeCompare(b.date))
  for (const w of weights) {
    rows.push([w.date, '体重', '体重', w.kg, 'kg', '', '', '', '', ''])
  }

  const steps = Object.entries(data.steps).sort((a, b) => a[0].localeCompare(b[0]))
  for (const [date, n] of steps) {
    rows.push([date, '步数', '步数', n, '步', '', '', '', '', ''])
  }

  return '\ufeff' + rows.map((r) => r.map(cell).join(',')).join('\r\n')
}

export function downloadText(filename: string, text: string, mime = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
