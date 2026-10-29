import { formatCN, lastNDates, todayKey } from '../domain/date'
import { summarizeDay, targetsFor } from '../domain/day'
import { MEAL_LABEL, MEAL_ORDER, type AppData } from '../domain/types'
import { chat } from './vision'

export interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

const SYSTEM = `你是「塑我」App 里的私人教练兼营养师，服务一个具体的用户。

你有两种能力：
1. 基于下面的数据，回答关于他的事实问题（花了多少钱、吃了多少、还差多少）；
2. 用你的专业知识做推理、给建议、解释原因。

回答要求：
- 中文，口吻自然，像朋友里的专业人士：直接、有判断，不客套、不喊口号、不说"作为一个AI"。
- 事实类问题：先给数字和结论，必要时补一句依据。
- 建议类问题：先给结论，再给 2-3 条可执行的做法，最好落到"下一餐具体怎么吃"。
- 允许推理和判断，例如「这周蛋白只有 60g/天，掉秤大概率掉的是肌肉」；但要把推断和事实区分开，用"我判断/大概率"这类措辞。
- 数据里没有的项，直说「没有这项记录」，绝不编数字。
- 长度跟着问题走：简单问题一两句，复杂问题分点展开，不要为了凑字数注水。
- 涉及钱用 ¥。
- 用户如果问的是方法论（怎么练、怎么吃、为什么不掉秤），可以给通用专业知识，但要结合他的数据说。`

/** 把用户数据压成一段紧凑的上下文，喂给模型 */
export function buildContext(data: AppData): string {
  const lines: string[] = []
  const p = data.profile
  const g = data.goal

  if (p) {
    lines.push(
      `【用户】${p.gender === 'male' ? '男' : '女'} · ${p.heightCm}cm · ${new Date().getFullYear() - p.birthYear}岁 · 当前体重 ${
        data.weights.length ? data.weights[data.weights.length - 1].kg : (g?.startWeightKg ?? '—')
      }kg`,
    )
  }
  if (g) {
    const typeText = g.type === 'cut' ? '减脂' : g.type === 'bulk' ? '增肌' : '维持'
    lines.push(
      `【目标】${typeText} · 目标体重 ${g.targetWeightKg ?? '—'}kg${g.deadline ? ` · 期限 ${g.deadline}` : ''}`,
    )
  }

  const today = todayKey()
  const day = summarizeDay(data, today)
  const t = targetsFor(data)
  lines.push(
    `【今日 ${formatCN(today)}】摄入 ${Math.round(day.intake.kcal)}/${Math.round(t.kcal)} kcal，` +
      `蛋白 ${Math.round(day.intake.p)}/${Math.round(t.p)}g，碳水 ${Math.round(day.intake.c)}/${Math.round(t.c)}g，` +
      `脂肪 ${Math.round(day.intake.f)}/${Math.round(t.f)}g，纤维 ${day.fiber}g，水分 ${day.water + day.foodWater}ml`,
  )

  const mc = MEAL_ORDER.map((m) => `${MEAL_LABEL[m]} ¥${(day.mealCosts[m] ?? 0).toFixed(1)}`).join(' · ')
  lines.push(`【今日花费】合计 ¥${(day.cost ?? 0).toFixed(1)}（${mc}）`)

  // 本周（近 7 天）
  const dates = lastNDates(todayKey(), 7)
  let kcalSum = 0
  let costSum = 0
  let loggedDays = 0
  const mealCostSum = {} as Record<string, number>
  for (const m of MEAL_ORDER) mealCostSum[m] = 0
  const detail: string[] = []
  for (const d of dates) {
    const s = summarizeDay(data, d)
    if (s.meals.length > 0) {
      loggedDays++
      kcalSum += s.intake.kcal
      detail.push(`${d.slice(5)}:${Math.round(s.intake.kcal)}`)
    }
    costSum += s.cost ?? 0
    for (const m of MEAL_ORDER) mealCostSum[m] += s.mealCosts[m] ?? 0
  }
  lines.push(
    `【近7天】有记录 ${loggedDays} 天，日均 ${loggedDays ? Math.round(kcalSum / loggedDays) : 0} kcal；` +
      `花费合计 ¥${costSum.toFixed(1)}（` +
      MEAL_ORDER.map((m) => `${MEAL_LABEL[m]} ¥${mealCostSum[m].toFixed(1)}`).join(' · ') +
      `）`,
  )
  if (detail.length) lines.push(`【近7天每日热量】${detail.join('  ')}`)

  // 今天的明细（最多 12 条）
  const todayItems = day.meals.slice(0, 12).map(
    (l) => `${MEAL_LABEL[l.meal]} ${l.name} ${Math.round(l.grams)}g(${Math.round(l.kcal)}kcal)`,
  )
  if (todayItems.length) lines.push(`【今日记录】${todayItems.join('；')}`)

  // 近 7 天运动
  const exs = data.exercises.filter((e) => dates.includes(e.date))
  if (exs.length) {
    const byName = new Map<string, number>()
    for (const e of exs) byName.set(e.name, (byName.get(e.name) ?? 0) + Math.round(e.kcal))
    lines.push(
      `【近7天运动】${exs.length} 次，合计 ${Math.round(exs.reduce((a, b) => a + b.kcal, 0))} kcal：` +
        [...byName.entries()].slice(0, 6).map(([n, k]) => `${n} ${k}kcal`).join('；'),
    )
  } else {
    lines.push('【近7天运动】没有记录')
  }

  // 连续记录天数
  let streak = 0
  const probe = [...dates].reverse()
  for (const d of probe) {
    if (summarizeDay(data, d).meals.length > 0) streak++
    else break
  }
  lines.push(`【连续记录】${streak} 天`)

  // 体重趋势
  const ws = [...data.weights].sort((a, b) => a.date.localeCompare(b.date)).slice(-30)
  if (ws.length) {
    lines.push(`【体重记录】${ws.map((w) => `${w.date.slice(5)} ${w.kg}kg`).join('  ')}`)
  }

  return lines.join('\n')
}

export async function askCoach(history: ChatMsg[], data: AppData): Promise<string> {
  const ctx = buildContext(data)
  const messages = [
    { role: 'system', content: `${SYSTEM}\n\n以下是该用户当前的数据：\n${ctx}` },
    ...history.slice(-8).map((m) => ({ role: m.role, content: m.content })),
  ]
  return chat(messages, 0.5)
}

/* ---------------- 对话持久化 ---------------- */

const CHAT_KEY = 'suwo:coach:v1'
const MAX_SAVED = 200

function chatKey(uid: string | null): string {
  return uid ? `${CHAT_KEY}:${uid}` : CHAT_KEY
}

export function loadChat(uid: string | null): ChatMsg[] {
  try {
    const raw = localStorage.getItem(chatKey(uid))
    if (!raw) return []
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr)) return []
    return arr
      .filter((m): m is ChatMsg => {
        const o = m as { role?: unknown; content?: unknown }
        return (
          (o?.role === 'user' || o?.role === 'assistant') && typeof o?.content === 'string'
        )
      })
      .slice(-MAX_SAVED)
  } catch {
    return []
  }
}

export function saveChat(uid: string | null, messages: ChatMsg[]): void {
  try {
    localStorage.setItem(chatKey(uid), JSON.stringify(messages.slice(-MAX_SAVED)))
  } catch {
    /* 存不下就算了，不影响当前会话 */
  }
}

export function clearChat(uid: string | null): void {
  try {
    localStorage.removeItem(chatKey(uid))
  } catch {
    /* ignore */
  }
}