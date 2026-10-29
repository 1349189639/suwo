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

export interface ChatState {
  messages: ChatMsg[]
  /** 更早对话的压缩摘要 */
  summary: string
}

/** 事实类问题才做二次核对，避免每句都多花一次调用 */
function needsCheck(q: string): boolean {
  return /多少|几|花了|花费|钱|吃了|摄入|差|达标|几天|几次|kcal|卡/.test(q)
}

const VERIFY_PROMPT = `你在核对一份回答里的数字是否与给定数据一致。

规则：
- 逐项核对回答中出现的数字（热量、克数、金额、天数、次数）。
- 如果全部与数据一致、且没有遗漏关键数据，只输出两个字母：OK
- 如果有数字错误、算错、或明显遗漏了能回答问题的关键数据，输出修正后的完整回答（不要解释你改了什么）。`

export async function askCoach(
  state: ChatState,
  data: AppData,
): Promise<{ answer: string; checked: boolean }> {
  const ctx = buildContext(data)
  const system = state.summary
    ? `${SYSTEM}\n\n【更早对话的摘要】\n${state.summary}\n\n以下是该用户当前的数据：\n${ctx}`
    : `${SYSTEM}\n\n以下是该用户当前的数据：\n${ctx}`

  const history = state.messages.slice(-12).map((m) => ({ role: m.role, content: m.content }))
  const question = state.messages.filter((m) => m.role === 'user').slice(-1)[0]?.content ?? ''
  let answer = await chat([{ role: 'system', content: system }, ...history], 0.6)

  // C：自检。只有事实类问题 + 回答里带数字时才核对
  let checked = false
  if (needsCheck(question) && /\d/.test(answer)) {
    checked = true
    try {
      const verdict = await chat(
        [
          { role: 'system', content: `${VERIFY_PROMPT}\n\n以下是该用户的真实数据：\n${ctx}` },
          {
            role: 'user',
            content: `问题：${question}\n\n待核对的回答：\n${answer}`,
          },
        ],
        0.1,
      )
      const v = verdict.trim()
      if (v && !/^ok$/i.test(v) && v.length > 8) answer = v
    } catch {
      // 核对失败就用原回答，不打断对话
    }
  }

  return { answer, checked }
}

/* ---------------- 对话持久化 ---------------- */

const CHAT_KEY = 'suwo:coach:v2'
const MAX_SAVED = 200
const KEEP_RECENT = 12
const COMPACT_AT = 20

function chatKey(uid: string | null): string {
  return uid ? `${CHAT_KEY}:${uid}` : CHAT_KEY
}

export function loadChat(uid: string | null): ChatState {
  try {
    const raw = localStorage.getItem(chatKey(uid))
    if (!raw) return { messages: [], summary: '' }
    const parsed = JSON.parse(raw) as unknown

    // 兼容旧版（直接存数组）
    if (Array.isArray(parsed)) {
      return { messages: sanitize(parsed), summary: '' }
    }
    const obj = parsed as { messages?: unknown; summary?: unknown }
    return {
      messages: sanitize(Array.isArray(obj.messages) ? obj.messages : []),
      summary: typeof obj.summary === 'string' ? obj.summary : '',
    }
  } catch {
    return { messages: [], summary: '' }
  }
}

function sanitize(arr: unknown[]): ChatMsg[] {
  return arr
    .filter((m): m is ChatMsg => {
      const o = m as { role?: unknown; content?: unknown }
      return (o?.role === 'user' || o?.role === 'assistant') && typeof o?.content === 'string'
    })
    .slice(-MAX_SAVED)
}

export function saveChat(uid: string | null, state: ChatState): void {
  try {
    localStorage.setItem(
      chatKey(uid),
      JSON.stringify({ messages: state.messages.slice(-MAX_SAVED), summary: state.summary }),
    )
  } catch {
    /* 存不下不影响当前会话 */
  }
}

export function clearChat(uid: string | null): void {
  try {
    localStorage.removeItem(chatKey(uid))
  } catch {
    /* ignore */
  }
}

/** C：长对话压缩。超过 20 条时，把较早的部分压成摘要，只留最近 12 条原文 */
export async function compact(state: ChatState): Promise<ChatState> {
  if (state.messages.length <= COMPACT_AT) return state
  const old = state.messages.slice(0, state.messages.length - KEEP_RECENT)
  const recent = state.messages.slice(-KEEP_RECENT)
  try {
    const text = await chat(
      [
        {
          role: 'system',
          content:
            '把下面的对话压缩成一段简短中文摘要。保留：用户的目标、偏好、已确认的结论、还没解决的问题。不要评论、不要分点、不要超过 200 字。',
        },
        {
          role: 'user',
          content:
            (state.summary ? `已有摘要：${state.summary}\n\n` : '') +
            old.map((m) => `${m.role === 'user' ? '用户' : '助手'}：${m.content}`).join('\n'),
        },
      ],
      0.2,
    )
    const summary = `${state.summary ? `${state.summary}\n` : ''}${text}`.slice(-800)
    return { messages: recent, summary }
  } catch {
    return state
  }
}