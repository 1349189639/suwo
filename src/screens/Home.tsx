import { useBackToClose } from '../components/useBackToClose'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Avatar } from '../components/Avatar'
import { Button, Card, CircleAction, Field, NumberField, ProgressBar, Sheet, inputClass } from '../components/ui'
import { ChangelogList } from '../components/UpdateNotice'
import { HighlightChips } from '../components/HighlightChips'
import { Coach } from './Coach'
import { Feedback } from './Feedback'
import { isNativeApp, readNativeSteps } from '../data/steps'
import { useStore } from '../data/store'
import { stepsDistanceKm, stepsKcal } from '../domain/activity'
import { recommendToday } from '../data/recommend'
import { stageInfo } from '../domain/avatar'
import { bodyState, currentSpiritInfo, currentStreak, summarizeDay, targetsFor } from '../domain/day'
import { buildFromBmi } from '../domain/avatar'
import { calcBmi, fiberTargetG, waterTargetMl } from '../domain/nutrition'
import { formatCN, todayKey, weekdayCN } from '../domain/date'
import { defaultLook } from '../domain/look'
import { guessFiberByName, guessWater } from '../domain/water'
import { MEAL_LABEL, type FoodLog } from '../domain/types'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 6) return '还没睡？'
  if (h < 11) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  if (h < 23) return '晚上好'
  return '该休息了'
}

const CHATTER = [
  '今天想练哪里？',
  '别光看着我，去动一动。',
  '喝水了吗？',
  '记录一下，我才知道你在努力。',
  '慢慢来，比昨天好一点就够了。',
]

export function Home({
  onFood,
  onExercise,
  onWeight,
  onStats,
  onAction,
}: {
  onFood: () => void
  onExercise: () => void
  onWeight: () => void
  onStats: () => void
  onAction: () => void
}) {
  const data = useStore((s) => s.data)
  const removeFoodLog = useStore((s) => s.removeFoodLog)
  const updateFoodLog = useStore((s) => s.updateFoodLog)
  const restoreFoodLog = useStore((s) => s.restoreFoodLog)
  const removeExercise = useStore((s) => s.removeExercise)
  const restoreExercise = useStore((s) => s.restoreExercise)
  const offerUndo = useStore((s) => s.offerUndo)
  const setToast = useStore((s) => s.setToast)
  const setSteps = useStore((s) => s.setSteps)

  const today = todayKey()
  const day = summarizeDay(data, today)
  const targets = targetsFor(data)
  const plan = recommendToday(data, today)
  const body = bodyState(data)
  const spiritInfo = currentSpiritInfo(data)
  const spirit = spiritInfo.score
  const streak = currentStreak(data)
  const action = data.avatarAction ?? 'idle'
  const setAvatarAction = useStore((s) => s.setAvatarAction)
  const stage = stageInfo(body?.stage ?? 3)

  const [talk, setTalk] = useState<string | null>(null)
  const [previewKg, setPreviewKg] = useState<number | null>(null)
  const [showLog, setShowLog] = useState(false)
  const [showCoach, setShowCoach] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [editing, setEditing] = useState<FoodLog | null>(null)
  const [editName, setEditName] = useState('')
  const [editGrams, setEditGrams] = useState(100)
  const [editCost, setEditCost] = useState(0)
  const [showAllLogs, setShowAllLogs] = useState(false)

  useBackToClose(() => setShowLog(false), showLog)
  useBackToClose(() => setEditing(null), editing !== null)

  // 动作是"临时动画"：播完自动回到静止态。
  // 否则 avatarAction 会被持久保存，贴图形象只在 idle 下使用，用户就会一直看到手绘版。
  useEffect(() => {
    if (action === 'idle') return
    const t = setTimeout(() => setAvatarAction('idle'), 8000)
    return () => clearTimeout(t)
  }, [action, setAvatarAction])
  const syncStatus = useStore((s) => s.syncStatus)
  const syncNow = useStore((s) => s.syncNow)
  const [syncing, setSyncing] = useState(false)
  const stepRefresh = useRef<() => void>(() => {})

  const previewBuild =
    previewKg !== null && data.profile
      ? buildFromBmi(calcBmi(previewKg, data.profile.heightCm))
      : null

  // 原生壳里自动从系统计步器同步（只增不减，不覆盖手动修正）
  useEffect(() => {
    if (!isNativeApp) return
    let alive = true
    const refresh = (announce: boolean) => {
      void readNativeSteps().then((n) => {
        if (!alive || n === null) return
        // 用最新 store 快照比较，避免闭包里拿着旧数据
        const cur = useStore.getState().data.steps[today] ?? 0
        if (n > cur) {
          setSteps(n)
          if (announce) setToast(`已同步 ${n.toLocaleString()} 步`)
        }
      })
    }
    stepRefresh.current = () => refresh(true)
    refresh(true)
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh(false)
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh(false)
    }, 20_000)
    return () => {
      alive = false
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
      window.clearInterval(timer)
    }
  }, [setSteps, setToast, today])
  useEffect(() => {
    if (!talk) return
    const t = setTimeout(() => setTalk(null), 2600)
    return () => clearTimeout(t)
  }, [talk])

  const bubble = useMemo(() => {
    if (talk) return talk
    const h = new Date().getHours()
    if (action === 'sleep') return '今天先歇着，明天再来。'
    if (action === 'run') return '我在跑，你也动起来！'
    if (action === 'pushup') return '来，一起做几组俯卧撑。'
    if (action === 'bench') return '卧推注意肩胛收紧。'
    if (action === 'badminton') return '球场上见，单打两小时。'
    if (action === 'flex') return '看，腹肌出来了。'
    if (day.remaining < 0) return `今天超了 ${Math.abs(day.remaining)} kcal，明天多走 3000 步就好。`
    if (day.meals.length === 0 && h >= 11) return '今天还没记录，我都饿了…'
    if (spirit >= 82) return `状态 ${spirit} 分，继续保持！`
    return `今天还能吃 ${day.remaining} kcal，想好吃什么了吗？`
  }, [talk, action, day.remaining, day.meals.length, spirit])

  const allEntries = [
    ...day.meals.map((m) => ({
      kind: 'food' as const,
      id: m.id,
      name: m.name,
      meta: MEAL_LABEL[m.meal],
      kcal: m.kcal,
      p: m.p,
      c: m.c,
      f: m.f,
      fiber: m.fiber ?? guessFiberByName(m.name),
      waterMl: Math.round(((m.water ?? guessWater(m.name) ?? 0) * m.grams) / 100),
      createdAt: m.createdAt,
    })),
    ...day.exercises.map((e) => ({
      kind: 'exercise' as const,
      id: e.id,
      name: e.name,
      meta:
        e.kind === 'strength'
          ? `${e.sets ?? 0} 组 × ${e.reps ?? 0}${e.distanceKm ? '' : ''}`
          : `${e.minutes} 分钟${e.distanceKm ? ` · ${e.distanceKm}km` : ''}`,
      kcal: -e.kcal,
      p: 0,
      c: 0,
      f: 0,
      fiber: 0,
      waterMl: 0,
      createdAt: e.createdAt,
    })),
  ].sort((a, b) => b.createdAt - a.createdAt)

  const entries = showAllLogs ? allEntries : allEntries.slice(0, 5)

  const openLogEditor = (log: FoodLog) => {
    setEditing(log)
    setEditName(log.name)
    setEditGrams(Math.round(log.grams))
    setEditCost(log.cost ?? 0)
  }

  const over = day.remaining < 0
  const color = over ? '#ff6b81' : '#3ddc97'

  return (
    <div className="px-4 pt-4">
      <header className="flex items-start justify-between px-1">
        <div>
          <div className="text-[12px] text-muted">
            {formatCN(today)} {weekdayCN(today)}
          </div>
          <h1 className="mt-0.5 text-[21px] font-bold">{greeting()}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              if (syncing) return
              setSyncing(true)
              try {
                await syncNow()
                stepRefresh.current()
                setToast('已同步')
              } catch {
                setToast('同步失败，稍后再试')
              } finally {
                setSyncing(false)
              }
            }}
            className={
              'rounded-full border px-2.5 py-1.5 text-[12px] active:opacity-60 ' +
              (syncing ? 'border-accent/50 bg-accent/15 text-accent' : 'border-line bg-surface/80')
            }
            aria-label="立即同步"
          >
            {syncing ? '…' : '↻'}
          </button>
          <button
            onClick={() => setShowCoach(true)}
            className="flex flex-col items-center rounded-2xl border border-accent/40 bg-accent/10 px-2.5 py-1.5"
            aria-label="问教练"
          >
            <span className="text-[13px] leading-none">🤖</span>
            <span className="mt-0.5 text-[9px] leading-none text-accent/80">教练</span>
          </button>
          <button
            onClick={() => setShowLog(true)}
            className="rounded-full border border-line bg-surface/80 px-2.5 py-1.5 text-[12px]"
            aria-label="更新公告"
          >
            📣
          </button>
          <button
            onClick={onStats}
            className="flex items-center gap-1.5 rounded-full border border-line bg-surface/80 px-3 py-1.5 text-[12px]"
          >
            <span>🔥</span>
            <span className="tabular font-semibold">{streak}</span>
            <span className="text-muted">天</span>
          </button>
        </div>
      </header>

      {syncStatus !== 'synced' && (
        <div className="mt-1 flex items-center gap-1.5 px-1 text-[10px] text-muted/60">
          <span
            className={
              'h-1.5 w-1.5 rounded-full ' +
              (syncStatus === 'error'
                ? 'bg-[#ff6b81]'
                : syncStatus === 'syncing'
                  ? 'bg-[#63a4ff]'
                  : 'bg-[#f5b942]')
            }
          />
          {{
            idle: '未连接云端',
            syncing: '正在同步…',
            synced: '',
            dirty: '有改动待上传',
            offline: '离线，联网后自动上传',
            error: '同步异常',
          }[syncStatus]}
        </div>
      )}

      {showCoach && <Coach onClose={() => setShowCoach(false)} />}
      {showFeedback && <Feedback onClose={() => setShowFeedback(false)} />}

      {showLog && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={() => setShowLog(false)}>
          <div
            className="max-h-[82vh] w-full overflow-y-auto rounded-t-3xl border-t border-line bg-canvas px-4 pb-6 pt-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[16px] font-semibold">更新公告</span>
              <button onClick={() => setShowLog(false)} className="text-[12px] text-muted">
                关闭
              </button>
            </div>
            <ChangelogList />
          </div>
        </div>
      )}

      {/* 场景：小人 + 四周按钮 */}
      <div
        className="relative mt-3 h-[420px] overflow-hidden rounded-[30px] border border-line/60"
        style={{
          background:
            'radial-gradient(115% 80% at 50% 8%, #2a4753 0%, #16242e 52%, #0c141b 100%)',
        }}
      >
        {/* 墙上的光斑 */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 40% at 50% 0%, rgba(93,220,172,0.18) 0%, rgba(93,220,172,0) 70%)',
          }}
        />
        {/* 地面 */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[86px]"
          style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.42) 100%)' }}
        />

        {/* 说话气泡 */}
        <div className="absolute left-4 right-16 top-3.5">
          <div className="relative rounded-2xl rounded-bl-md bg-white/95 px-3 py-2 text-[12px] leading-[1.35] text-[#16232c] shadow-lg">
            {bubble}
            <div className="absolute -bottom-1.5 left-4 h-3 w-3 rotate-45 rounded-[2px] bg-white/95" />
          </div>
        </div>

        {/* 角色 */}
        <button
          onClick={() => setTalk(CHATTER[Math.floor(Math.random() * CHATTER.length)])}
          className="absolute bottom-9 left-1/2 -translate-x-1/2 transition active:scale-[0.98]"
          aria-label="和小人互动"
        >
          <Avatar
            build={previewBuild ?? body?.build ?? 0.4}
            muscle={body?.muscle ?? 0.6}
            gender={data.profile?.gender ?? 'male'}
            spirit={spirit}
            action={action}
            look={data.look ?? defaultLook(data.profile?.gender ?? 'male')}
            size={206}
          />
        </button>

        <div className="absolute left-2 top-1/2 flex -translate-y-1/2 flex-col gap-4">
          <CircleAction icon="🍱" label="记饮食" onClick={onFood} />
          <CircleAction icon="🏃" label="记运动" onClick={onExercise} />
        </div>
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 flex-col gap-3">
          <CircleAction icon="🎬" label="换动作" onClick={onAction} tone="accent" />
          <CircleAction icon="⚖️" label="称体重" onClick={onWeight} />
          <CircleAction icon="💬" label="留言板" onClick={() => setShowFeedback(true)} />
        </div>

        {/* 状态 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
          <span className="rounded-full bg-black/35 px-2.5 py-1 text-[10px] text-white/80 backdrop-blur">
            体型 · {stage.label}
          </span>
          <span className="rounded-full bg-black/35 px-2.5 py-1 text-[10px] text-white/80 backdrop-blur">
            状态 · {spiritInfo.label}
          </span>
          {body && (
            <span className="rounded-full bg-black/35 px-2.5 py-1 text-[10px] text-white/80 backdrop-blur">
              BMI {body.bmi.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {/* 体型试穿：拖动看不同体重下的样子（不保存） */}
      <div className="mt-2 flex items-center gap-2 rounded-2xl border border-line/60 bg-surface/70 px-3 py-2">
        <span className="shrink-0 text-[11px] text-muted">试穿</span>
        <input
          type="range"
          min={40}
          max={130}
          step={0.5}
          value={previewKg ?? body?.weight ?? 70}
          onChange={(e) => setPreviewKg(Number(e.target.value))}
          className="w-full accent-[#3ddc97]"
        />
        <span className="tabular w-14 shrink-0 text-right text-[11px] text-accent">
          {previewKg !== null ? `${previewKg}kg` : `${body?.weight ?? 70}kg`}
        </span>
        {previewKg !== null && (
          <button onClick={() => setPreviewKg(null)} className="shrink-0 text-[10px] text-muted">
            重置
          </button>
        )}
      </div>

      {/* 今日额度 */}
      <div className="mt-3 rounded-3xl border border-line/70 bg-surface/90 p-4 backdrop-blur">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[12px] text-muted">{over ? '今天已超出' : '今天还能吃'}</div>
            <div className="flex items-baseline gap-1.5">
              <span className="tabular text-[42px] font-bold leading-none" style={{ color }}>
                {Math.abs(day.remaining)}
              </span>
              <span className="text-[13px] text-muted">kcal</span>
            </div>
          </div>
          <div className="space-y-0.5 text-right text-[11px] leading-5 text-muted">
            <div>
              额度 <span className="tabular text-ink">{day.budget}</span>
            </div>
            <div>
              已摄入 <span className="tabular text-ink">{Math.round(day.intake.kcal)}</span>
            </div>
            {day.exerciseKcal > 0 && <div className="text-accent">运动 +{day.exerciseKcal}</div>}
          </div>
        </div>
        <div className="mt-3">
          <ProgressBar value={day.intake.kcal} max={day.budget} color={color} height={8} />
        </div>
      </div>

      {/* 宏量 */}
      <div className="mt-2.5 grid grid-cols-3 gap-2">
        {[
          { label: '蛋白', v: day.intake.p, t: targets.p, c: '#63a4ff' },
          { label: '碳水', v: day.intake.c, t: targets.c, c: '#f5b942' },
          { label: '脂肪', v: day.intake.f, t: targets.f, c: '#ff9f6b' },
          { label: '纤维', v: day.fiber, t: fiberTargetG(body?.weight ?? 60), c: '#7bd88f' },
          {
            label: '水分',
            v: day.water + day.foodWater,
            t: waterTargetMl(body?.weight ?? 60, Math.max(0, day.budget - targets.kcal)),
            c: '#63c7ff',
            u: 'ml',
          },
        ].map((m) => (
          <div key={m.label} className="rounded-2xl border border-line/60 bg-surface/70 p-2.5">
            <div className="flex items-baseline justify-between gap-1">
              <span className="shrink-0 whitespace-nowrap text-[11px] text-muted">{m.label}</span>
              <span className="tabular whitespace-nowrap text-[12px] font-semibold">
                {Math.round(m.v)}
                <span className="text-[9.5px] font-normal text-muted">
                  /{m.t}
                  {('u' in m ? 'ml' : 'g')}
                </span>
              </span>
            </div>
            <div className="mt-1.5">
              <ProgressBar value={m.v} max={m.t} color={m.c} height={4} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-1.5 px-1 text-[10px] text-muted/40">
        目标按你的体重 {body?.weight ?? 60}kg 推算（蛋白 1.8g/kg · 脂肪 0.8g/kg · 纤维 0.35g/kg · 饮水 35ml/kg）
      </p>

      {/* 步数 */}
      <button
        onClick={onExercise}
        className="mt-2.5 flex w-full items-center justify-between rounded-2xl border border-line/60 bg-surface/70 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-[16px]">👟</span>
          <div>
            <div className="text-[13px]">今日步数</div>
            <div className="text-[11px] text-muted/70">
              {day.steps > 0
                ? `${day.steps.toLocaleString()} 步 · 约 ${stepsDistanceKm(day.steps, data.profile?.heightCm ?? 170).toFixed(2)} km · 约 ${stepsKcal(body?.weight ?? 70, day.steps)} kcal`
                : isNativeApp
                  ? '正在从系统计步器读取…'
                  : '还没记录，点这里填写'}
            </div>
          </div>
        </div>
        <span className="text-[12px] text-muted">修改</span>
      </button>
      <button
        onClick={() => {
          const raw = window.prompt('今天走了多少步？', String(day.steps || ''))
          if (raw === null) return
          const n = Number(raw.replace(/[^\d]/g, ''))
          if (Number.isFinite(n) && n >= 0) {
            setSteps(n)
            setToast('已记录步数')
          }
        }}
        className="mt-1 w-full text-center text-[10px] text-muted/45"
      >
        步数不准？点这里手动填写
      </button>

      <p className="mt-1 px-1 text-center text-[10px] leading-4 text-muted/40">
        华为 / 荣耀机型对计步权限管得比较严，数字可能偏低或少报，这时直接手动填写即可
      </p>

      {/* 今天可以这样吃 */}
      <div className="mb-2 mt-4 flex items-end justify-between px-1">
        <h3 className="text-[13px] font-semibold tracking-wide text-muted">今天可以这样吃</h3>
        <span className="text-[10px] text-muted/45">
          {data.goal?.cares?.length ? '按剩余额度 + 调理关注点' : '按剩余额度'}
        </span>
      </div>
      <Card className="space-y-2">
        {plan.items.length === 0 ? (
          <p className="text-[11.5px] leading-5 text-muted">{plan.note}</p>
        ) : (
          <>
            {plan.items.map((it) => (
              <div key={it.name} className="flex items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[13px]">{it.name}</span>
                  <span className="ml-1.5 text-[10px] text-muted/60">{it.grams}g</span>
                  <div className="mt-0.5 text-[9.5px] leading-3 text-muted/45">{it.reason}</div>
                </div>
                <span className="tabular shrink-0 text-[12px] text-accent">{it.kcal}</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-line/40 pt-1.5">
              <span className="text-[10px] text-muted/60">
                合计 <span className="tabular text-[11px] text-ink">{plan.kcal}</span> kcal
              </span>
              <button onClick={onFood} className="text-[10.5px] text-accent">
                去记录 →
              </button>
            </div>
            <p className="text-[9.5px] leading-4 text-muted/40">{plan.note}</p>
          </>
        )}
      </Card>

      {/* 今日记录 */}
      <div className="mb-2 mt-4 flex items-end justify-between px-1">
        <h3 className="text-[13px] font-semibold tracking-wide text-muted">今天的记录</h3>
        <button onClick={onFood} className="text-[12px] text-accent">
          查看饮食日记
        </button>
      </div>

      <div className="space-y-1.5">
        {entries.length === 0 && (
          <div className="rounded-2xl border border-dashed border-line/70 py-8 text-center text-[12px] text-muted/60">
            今天还没有记录，从记一餐开始
          </div>
        )}
        {entries.map((e) => (
          <div
            key={`${e.kind}-${e.id}`}
            className="flex items-center justify-between gap-2 rounded-2xl bg-surface2/40 px-3.5 py-2.5"
          >
            <button
              disabled={e.kind !== 'food'}
              onClick={() => {
                const log = day.meals.find((m) => m.id === e.id)
                if (log) openLogEditor(log)
              }}
              className="min-w-0 flex-1 text-left active:opacity-60 disabled:active:opacity-100"
            >
              <div className="flex items-baseline gap-1.5">
                <span className="truncate text-[14px]">{e.name}</span>
                {e.kind === 'food' && <span className="shrink-0 text-[11px] text-muted/30">›</span>}
              </div>
              {e.kind === 'food' ? (
                <div className="mt-0.5 text-[10px] leading-4 text-muted/60">
                  <span className="text-muted/45">{e.meta}</span>
                  {` · 蛋白 ${e.p.toFixed(1)} · 碳水 ${e.c.toFixed(1)} · 脂肪 ${e.f.toFixed(1)}`}
                  {` · 纤维 ${e.fiber.toFixed(1)}g · 水 ${e.waterMl}ml`}
                </div>
              ) : (
                <div className="text-[11px] text-muted/70">{e.meta}</div>
              )}
              {e.kind === 'food' && (
                <HighlightChips name={e.name} fat={e.f} kcal={e.kcal} className="mt-0.5" />
              )}
            </button>
            <div className="flex items-center gap-2">
              <span className={`tabular text-[13px] font-semibold ${e.kcal < 0 ? 'text-accent' : 'text-ink'}`}>
                {e.kcal < 0 ? '+' : ''}
                {Math.abs(e.kcal)}
              </span>
              <button
                onClick={() => {
                  if (e.kind === 'food') {
                    const log = day.meals.find((m) => m.id === e.id)
                    if (!log) return
                    removeFoodLog(log.id)
                    offerUndo(`已删除「${log.name}」`, () => restoreFoodLog(log))
                  } else {
                    const ex = day.exercises.find((x) => x.id === e.id)
                    if (!ex) return
                    removeExercise(ex.id)
                    offerUndo(`已删除「${ex.name}」`, () => restoreExercise(ex))
                  }
                }}
                className="grid h-6 w-6 place-items-center rounded-full text-[11px] text-muted/40 active:bg-surface"
                aria-label="删除"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {allEntries.length > 5 && (
        <button
          onClick={() => setShowAllLogs((v) => !v)}
          className="mt-1.5 w-full py-1.5 text-center text-[11px] text-muted/60"
        >
          {showAllLogs ? '收起' : `查看全部 ${allEntries.length} 条`}
        </button>
      )}

      <Sheet
        open={editing !== null}
        title="修改这条记录"
        subtitle="改完立刻生效，热量和三大宏量按份量自动换算"
        onClose={() => setEditing(null)}
      >
        {editing && (
          <div className="space-y-3">
            <Field label="食物名称">
              <input
                className={inputClass}
                value={editName}
                onChange={(ev) => setEditName(ev.target.value)}
                placeholder="食物名称"
              />
            </Field>

            <Field label="份量" hint={`原来 ${Math.round(editing.grams)}g`}>
              <NumberField value={editGrams} onChange={setEditGrams} suffix="g" min={1} max={3000} />
            </Field>

            <div className="rounded-2xl bg-surface2/50 px-4 py-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[12px] text-muted">换算后</span>
                <span className="tabular text-[20px] font-bold text-accent">
                  {Math.round((editing.kcal / (editing.grams || 1)) * editGrams)}
                  <span className="ml-1 text-[11px] font-normal text-muted">kcal</span>
                </span>
              </div>
              <div className="tabular mt-1 text-[10.5px] leading-4 text-muted/60">
                蛋白 {((editing.p / (editing.grams || 1)) * editGrams).toFixed(1)}g · 碳水{' '}
                {((editing.c / (editing.grams || 1)) * editGrams).toFixed(1)}g · 脂肪{' '}
                {((editing.f / (editing.grams || 1)) * editGrams).toFixed(1)}g · 纤维{' '}
                {(((editing.fiber ?? 0) / (editing.grams || 1)) * editGrams).toFixed(1)}g · 水{' '}
                {Math.round((((editing.water ?? 0) * editGrams) / 100))}ml
              </div>
            </div>

            <Field label="这一条花了多少钱（可不填）" hint="可直接算 12+8">
              <NumberField
                value={editCost}
                onChange={setEditCost}
                suffix="元"
                min={0}
                max={9999}
                emptyWhenZero
                placeholder="0"
                allowMath
              />
            </Field>

            <Button
              className="w-full"
              onClick={() => {
                const ratio = editGrams / (editing.grams || 1)
                updateFoodLog(editing.id, {
                  name: editName.trim() || editing.name,
                  grams: editGrams,
                  cost: editCost,
                  kcal: Math.round(editing.kcal * ratio),
                  p: Math.round(editing.p * ratio * 10) / 10,
                  c: Math.round(editing.c * ratio * 10) / 10,
                  f: Math.round(editing.f * ratio * 10) / 10,
                  fiber: Math.round((editing.fiber ?? 0) * ratio * 10) / 10,
                })
                setEditing(null)
                setToast('已修改')
              }}
            >
              保存
            </Button>
            <Button
              variant="danger"
              className="w-full"
              onClick={() => {
                const log = editing
                removeFoodLog(log.id)
                setEditing(null)
                offerUndo(`已删除「${log.name}」`, () => restoreFoodLog(log))
              }}
            >
              删除这条
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  )
}
