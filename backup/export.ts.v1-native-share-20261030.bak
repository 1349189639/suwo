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

/* ---------------- Excel（.xls，SpreadsheetML 2003） ---------------- */

function xmlEsc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function xlsCell(v: string | number): string {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return `<Cell><Data ss:Type="Number">${v}</Data></Cell>`
  }
  return `<Cell><Data ss:Type="String">${xmlEsc(String(v))}</Data></Cell>`
}

function xlsSheet(name: string, rows: (string | number)[][]): string {
  const body = rows
    .map((r) => `<Row>${r.map(xlsCell).join('')}</Row>`)
    .join('')
  return `<Worksheet ss:Name="${xmlEsc(name).slice(0, 31)}"><Table>${body}</Table></Worksheet>`
}

/**
 * 生成真正的 Excel 表格（.xls，SpreadsheetML 2003）。
 * 不用第三方库：Excel / WPS / Numbers 都能直接打开，且带多个工作表。
 */
export function toXls(data: AppData): string {
  const foodHeader = ['日期', '餐次', '食物', '克数', '热量kcal', '蛋白g', '碳水g', '脂肪g', '纤维g', '水分ml', '花费元']
  const foodRows: (string | number)[][] = [foodHeader]
  for (const l of [...data.foodLogs].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)) {
    foodRows.push([
      l.date,
      MEAL_LABEL[l.meal],
      l.name,
      Math.round(l.grams),
      Math.round(l.kcal),
      l.p,
      l.c,
      l.f,
      l.fiber ?? '',
      l.water ? Math.round((l.grams * l.water) / 100) : '',
      l.cost ?? '',
    ])
  }

  const exHeader = ['日期', '类型', '项目', '时长/组次', '热量kcal']
  const exRows: (string | number)[][] = [exHeader]
  for (const e of [...data.exercises].sort((a, b) => a.date.localeCompare(b.date))) {
    const detail =
      e.kind === 'strength'
        ? `${e.sets ?? 0}组×${e.reps ?? 0}次${e.weightKg ? ` ${e.weightKg}kg` : ''}`
        : `${e.minutes}分钟${e.distanceKm ? ` ${e.distanceKm}km` : ''}`
    exRows.push([e.date, e.kind === 'strength' ? '力量' : '有氧', e.name, detail, Math.round(e.kcal)])
  }

  const wHeader = ['日期', '体重kg']
  const wRows: (string | number)[][] = [wHeader]
  for (const w of [...data.weights].sort((a, b) => a.date.localeCompare(b.date))) {
    wRows.push([w.date, w.kg])
  }

  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<?mso-application progid="Excel.Sheet"?>' +
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"' +
    ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">' +
    xlsSheet('饮食', foodRows) +
    xlsSheet('运动', exRows) +
    xlsSheet('体重', wRows) +
    '</Workbook>'
  )
}

/**
 * 把内容交给系统处理：优先「分享」（APK 里可存到文件 / 发微信），
 * 其次浏览器下载，最后退回剪贴板。
 */
export async function shareOrDownload(
  filename: string,
  content: string,
  mime: string,
): Promise<'shared' | 'downloaded' | 'copied'> {
  // 1) 系统分享（Android WebView / Chrome 支持）
  try {
    const nav = navigator as Navigator & {
      canShare?: (d: { files?: File[] }) => boolean
      share?: (d: { files?: File[]; title?: string }) => Promise<void>
    }
    if (nav.share && nav.canShare) {
      const file = new File([content], filename, { type: mime })
      if (nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: filename })
        return 'shared'
      }
    }
  } catch {
    /* 用户取消或环境不支持，继续往下走 */
  }

  // 2) 浏览器下载
  try {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
    return 'downloaded'
  } catch {
    /* 落空 */
  }

  // 3) 剪贴板兜底
  await navigator.clipboard.writeText(content)
  return 'copied'
}