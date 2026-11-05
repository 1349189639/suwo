import { Sparkline, ScoreRing, WeekBars } from '../components/charts'
import { Card, SectionTitle } from '../components/ui'
import { useStore } from '../data/store'
import { spiritLabel } from '../domain/adherence'
import { currentSpirit, currentStreak, latestWeight, monthCost, summarizeWeek, targetsFor } from '../domain/day'
import { formatCN, lastNDates, todayKey, weekdayShort } from '../domain/date'
import { MEAL_LABEL, MEAL_ORDER } from '../domain/types'
import { KCAL_PER_KG, calcTdee } from '../domain/nutrition'

interface Insight {
  tone: 'ok' | 'warn' | 'info'
  text: string
}

export function Stats() {
  const data = useStore((s) => s.data)
  const week = summarizeWeek(data)
  const targets = targetsFor(data)
  const spirit = currentSpirit(data)
  const streak = currentStreak(data)

  const weight = latestWeight(data)
  const sortedWeights = [...data.weights].sort((a, b) => a.date.localeCompare(b.date))
  const recent = sortedWeights.slice(-14)

  const barData = lastNDates(todayKey(), 7).map((d) => {
    const day = week.days.find((x) => x.date === d)
    return {
      label: weekdayShort(d),
      value: day ? Math.round(day.intake.kcal) : 0,
      target: targets.kcal,
      active: d === todayKey(),
    }
  })

  const insights = buildInsights({
    avgIntake: week.avgIntake,
    avgProtein: week.avgProtein,
    targetKcal: targets.kcal,
    targetProtein: targets.p,
    loggedDays: week.loggedDays,
    score: week.score,
    weightChange: week.weightChange,
    goalType: data.goal?.type ?? 'cut',
    totalMinutes: week.totalMinutes,
  })

  return (
    <div className="px-5 pt-5">
      <header className="mb-4">
        <div className="text-[12px] text-muted">最近 7 天</div>
        <h1 className="mt-0.5 text-[22px] font-bold">周报</h1>
      </header>

      <Card>
        <div className="flex items-center gap-4">
          <ScoreRing value={week.score ?? 0} label="自律" color="#3ddc97" />
          <div className="flex-1">
            <div className="text-[15px] font-semibold">{spiritLabel(spirit)}</div>
            <div className="mt-1 text-[12px] leading-5 text-muted">
              记录 {week.loggedDays}/7 天 · 连续 {streak} 天
              <br />
              训练 {week.totalMinutes} 分钟 · 容量 {Math.round(week.totalVolume).toLocaleString()} kg
            </div>
          </div>
        </div>
        {week.score === null && (
          <p className="mt-3 rounded-xl bg-surface2/60 p-2.5 text-[11px] leading-5 text-muted">
            还没有任何记录。自律指数只在有记录的日子计入，忘记记录不会扣分。
          </p>
        )}
      </Card>

      {(() => {
        // 花销 = 单条记录的 cost + 整餐记账（data.mealCosts）。
        // 统一走 summarizeDay 的 $cost，口径才和饮食日记里的「当日花费」一致。
        const weekCost = week.days.reduce((a, d) => a + d.cost, 0)
        const monthTotal = monthCost(data, todayKey().slice(0, 7))
        const byMeal = MEAL_ORDER.map((m) => ({
          m,
          v: week.days.reduce((a, d) => a + d.mealCosts[m], 0),
        }))
        return (
          <div className="mt-4">
            <SectionTitle right={<span className="text-[11px] text-muted/60">记账</span>}>花销</SectionTitle>
            <Card>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-[11px] text-muted">本周</div>
                  <div className="tabular text-[24px] font-bold text-accent">¥{weekCost.toFixed(0)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-muted">本月</div>
                  <div className="tabular text-[18px] font-semibold">¥{monthTotal.toFixed(0)}</div>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {byMeal.map((x) => (
                  <div key={x.m} className="rounded-xl bg-surface2/50 py-1.5 text-center">
                    <div className="text-[10px] text-muted">{MEAL_LABEL[x.m]}</div>
                    <div className="tabular text-[12px]">¥{x.v.toFixed(0)}</div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[10px] leading-4 text-muted/50">
                每餐右上角的「记账」填整餐花费，点单条记录可以填这一项的价；两边都会算进来。
              </p>
            </Card>
          </div>
        )
      })()}

      <div className="mt-4">
        <SectionTitle right={<span className="text-[11px] text-muted/60">虚线 = 每日额度</span>}>
          每日摄入
        </SectionTitle>
        <Card>
          <WeekBars data={barData} height={130} />
        </Card>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <Metric label="日均摄入" display={String(week.avgIntake)} unit="kcal" />
        <Metric label="日均消耗" display={String(week.avgBurn)} unit="kcal" />
        <Metric label="日均蛋白" display={String(week.avgProtein)} unit={`g / ${targets.p}g`} />
        <Metric
          label="体重变化"
          display={
            week.weightChange === null
              ? '—'
              : `${week.weightChange > 0 ? '+' : ''}${week.weightChange}`
          }
          unit={week.weightChange === null ? '7 天内无对比' : 'kg'}
        />
      </div>

      <div className="mt-4">
        <SectionTitle>体重趋势</SectionTitle>
        <Card>
          {recent.length >= 2 ? (
            <Sparkline
              points={recent.map((w) => ({ label: formatCN(w.date), value: w.kg }))}
              height={110}
              color="#63a4ff"
            />
          ) : (
            <div className="py-8 text-center text-[12px] text-muted/60">
              至少记录 2 次体重才能看到趋势
            </div>
          )}
        </Card>
      </div>

      <div className="mt-4 mb-6">
        <SectionTitle>给你的建议</SectionTitle>
        <div className="space-y-2">
          {insights.map((it, i) => (
            <div
              key={i}
              className="flex gap-2.5 rounded-2xl border border-line/60 bg-surface/70 p-3.5"
            >
              <span className="mt-0.5 text-[13px]">
                {it.tone === 'warn' ? '⚠️' : it.tone === 'ok' ? '✅' : '💡'}
              </span>
              <p className="text-[12.5px] leading-5 text-muted">{it.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 px-1 text-[10px] leading-4 text-muted/40">
          建议基于热量平衡与训练量规则生成，不构成医疗建议。体重 {weight ?? '—'} kg，TDEE 约{' '}
          {data.profile ? Math.round(calcTdee(data.profile, weight ?? 70)) : '—'} kcal。
        </p>
      </div>
    </div>
  )
}

function Metric({ label, display, unit }: { label: string; display: string; unit: string }) {
  return (
    <div className="rounded-2xl border border-line/60 bg-surface/70 p-3">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="tabular mt-0.5 text-[20px] font-bold">
        {display}
        <span className="ml-1 text-[11px] font-normal text-muted">{unit}</span>
      </div>
    </div>
  )
}

function buildInsights(input: {
  avgIntake: number
  avgProtein: number
  targetKcal: number
  targetProtein: number
  loggedDays: number
  score: number | null
  weightChange: number | null
  goalType: string
  totalMinutes: number
}): Insight[] {
  const out: Insight[] = []
  const {
    avgIntake,
    avgProtein,
    targetKcal,
    targetProtein,
    loggedDays,
    score,
    weightChange,
    goalType,
    totalMinutes,
  } = input

  if (loggedDays === 0) {
    return [
      { tone: 'info', text: '本周还没有记录。先连续记 3 天，比一开始就追求精准更有用。' },
      { tone: 'info', text: '从每天记一餐开始，把记录变成肌肉记忆，再考虑控制热量。' },
    ]
  }

  if (loggedDays < 4) {
    out.push({
      tone: 'info',
      text: `本周只记了 ${loggedDays} 天，数据样本偏少，建议至少记满 5 天再看趋势。`,
    })
  }

  if (avgProtein < targetProtein * 0.8) {
    out.push({
      tone: 'warn',
      text: `蛋白质日均 ${avgProtein}g，低于目标 ${targetProtein}g。补一个鸡蛋 + 一份鸡胸（约 40g 蛋白）就能补上。`,
    })
  } else if (avgProtein >= targetProtein) {
    const why =
      goalType === 'cut'
        ? '减脂期保住肌肉'
        : goalType === 'lose'
          ? '减肥期少掉肌肉'
          : goalType === 'bulk'
            ? '增肌'
            : '维持体重'
    out.push({ tone: 'ok', text: `蛋白质达标（日均 ${avgProtein}g），这对${why}很关键。` })
  }

  if (avgIntake > targetKcal * 1.08) {
    const excess = Math.round((avgIntake - targetKcal) * 7)
    out.push({
      tone: 'warn',
      text: `日均摄入 ${avgIntake} kcal，超出额度 ${Math.round(avgIntake - targetKcal)} kcal。按这节奏每周多出约 ${excess} kcal，相当于 ${(excess / KCAL_PER_KG).toFixed(2)} kg 脂肪。`,
    })
  } else if (avgIntake < targetKcal * 0.8) {
    out.push({
      tone: 'warn',
      text: `日均只吃到 ${avgIntake} kcal，明显低于额度。长期过度节食会掉肌肉、降低代谢，也不利于坚持。`,
    })
  }

  if (weightChange !== null && Math.abs(weightChange) >= 0.2) {
    const dir = weightChange < 0 ? '下降' : '上升'
    const wantDown = goalType === 'lose' || goalType === 'cut'
    const good = (wantDown && weightChange < 0) || (goalType === 'bulk' && weightChange > 0)
    out.push({
      tone: good ? 'ok' : 'warn',
      text: `体重${dir} ${Math.abs(weightChange)} kg。${good ? '方向正确，保持当前缺口即可。' : '方向和目标不一致，先检查记录是否漏记。'}`,
    })
  }

  if (totalMinutes < 60) {
    out.push({
      tone: 'info',
      text: `本周训练 ${totalMinutes} 分钟。建议每周 2–3 次力量训练 + 150 分钟中等强度有氧。`,
    })
  }

  if (score !== null && score < 0.6) {
    out.push({
      tone: 'info',
      text: '完成度偏低时，优先把「记全」做对，而不是把热量压低。缺口再大，记录不全会让一切失真。',
    })
  } else if (score !== null && score >= 0.8) {
    out.push({ tone: 'ok', text: '这周完成度很高，小人状态也在变好。保持这个节奏就够。' })
  }

  return out.slice(0, 5)
}
