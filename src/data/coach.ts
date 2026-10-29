import { formatCN, lastNDates, todayKey } from '../domain/date'
import { summarizeDay, targetsFor } from '../domain/day'
import { MEAL_LABEL, MEAL_ORDER, type AppData } from '../domain/types'
import { chat } from './vision'

export interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

const SYSTEM = `你是「塑我」App 里的私人健身饮食助手。用户会问你关于他自己的饮食、体重、花费、训练的问题。

规则：
1. 用中文回答，简洁直接，先给结论再给理由，不要客套。
2. **只依据下面给出的数据**回答。数据里没有的，直接说「我这里没有这项记录」，不要编。
3. 涉及钱用 ¥ 表示，保留一位小数以内的精度。
4. 建议要具体、可执行（例如「晚餐主食减到一小碗」），不要泛泛而谈。
5. 如果用户的问题和健身/饮食无关，正常聊天即可，但不要长篇大论。
6. 回答控制在 200 字以内，除非用户要求详细。`

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

  // 体重趋势
  const ws = [...data.weights].sort((a, b) => a.date.localeCompare(b.date)).slice(-7)
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
