import { useEffect, useMemo, useRef, useState } from 'react'
import { Avatar } from '../components/Avatar'
import { CircleAction, ProgressBar } from '../components/ui'
import { isNativeApp, readNativeSteps } from '../data/steps'
import { useStore } from '../data/store'
import { stepsKcal } from '../domain/activity'
import { stageInfo } from '../domain/avatar'
import { bodyState, currentSpirit, currentStreak, summarizeDay, targetsFor } from '../domain/day'
import { buildFromBmi } from '../domain/avatar'
import { calcBmi } from '../domain/nutrition'
import { formatCN, todayKey, weekdayCN } from '../domain/date'
import { defaultLook } from '../domain/look'
import { MEAL_LABEL } from '../domain/types'

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
  const removeExercise = useStore((s) => s.removeExercise)
  const setToast = useStore((s) => s.setToast)
  const setSteps = useStore((s) => s.setSteps)

  const today = todayKey()
  const day = summarizeDay(data, today)
  const targets = targetsFor(data)
  const body = bodyState(data)
  const spirit = currentSpirit(data)
  const streak = currentStreak(data)
  const action = data.avatarAction ?? 'idle'
  const stage = stageInfo(body?.stage ?? 3)

  const [talk, setTalk] = useState<string | null>(null)
  const [previewKg, setPreviewKg] = useState<number | null>(null)

  const previewBuild =
    previewKg !== null && data.profile
      ? buildFromBmi(calcBmi(previewKg, data.profile.heightCm))
      : null

  // 原生壳里自动从系统计步器同步（只增不减，不覆盖手动修正）
  const synced = useRef(false)
  useEffect(() => {
    if (!isNativeApp || synced.current) return
    synced.current = true
    const refresh = (announce: boolean) => {
      void readNativeSteps().then((n) => {
        if (n !== null && n > (data.steps[today] ?? 0)) {
          setSteps(n)
          if (announce) setToast(`已同步 ${n.toLocaleString()} 步`)
        }
      })
    }
    refresh(true)
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh(false)
    }
    document.addEventListener('visibilitychange', onVisible)
    const timer = window.setInterval(() => refresh(false), 60_000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.clearInterval(timer)
    }
  }, [data.steps, setSteps, setToast, today])
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

  const entries = [
    ...day.meals.map((m) => ({
      kind: 'food' as const,
      id: m.id,
      name: m.name,
      meta: MEAL_LABEL[m.meal],
      kcal: m.kcal,
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
      createdAt: e.createdAt,
    })),
  ]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5)

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
        <button
          onClick={onStats}
          className="flex items-center gap-1.5 rounded-full border border-line bg-surface/80 px-3 py-1.5 text-[12px]"
        >
          <span>🔥</span>
          <span className="tabular font-semibold">{streak}</span>
          <span className="text-muted">天</span>
        </button>
      </header>

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
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 flex-col gap-4">
          <CircleAction icon="🎬" label="换动作" onClick={onAction} tone="accent" />
          <CircleAction icon="⚖️" label="称体重" onClick={onWeight} />
        </div>

        {/* 状态 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
          <span className="rounded-full bg-black/35 px-2.5 py-1 text-[10px] text-white/80 backdrop-blur">
            体型 · {stage.label}
          </span>
          <span className="rounded-full bg-black/35 px-2.5 py-1 text-[10px] text-white/80 backdrop-blur">
            状态 · {spirit} 分
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
        ].map((m) => (
          <div key={m.label} className="rounded-2xl border border-line/60 bg-surface/70 p-2.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] text-muted">{m.label}</span>
              <span className="tabular text-[12px] font-semibold">
                {Math.round(m.v)}
                <span className="text-[10px] font-normal text-muted">/{m.t}g</span>
              </span>
            </div>
            <div className="mt-1.5">
              <ProgressBar value={m.v} max={m.t} color={m.c} height={4} />
            </div>
          </div>
        ))}
      </div>

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
                ? `${day.steps.toLocaleString()} 步 · 约 ${stepsKcal(body?.weight ?? 70, day.steps)} kcal`
                : isNativeApp
                  ? '正在从系统计步器读取…'
                  : '还没记录，点这里填写'}
            </div>
          </div>
        </div>
        <span className="text-[12px] text-muted">修改</span>
      </button>

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
            className="flex items-center justify-between rounded-2xl bg-surface2/40 px-3.5 py-2.5"
          >
            <div className="min-w-0">
              <div className="truncate text-[14px]">{e.name}</div>
              <div className="text-[11px] text-muted/70">{e.meta}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`tabular text-[13px] font-semibold ${e.kcal < 0 ? 'text-accent' : 'text-ink'}`}>
                {e.kcal < 0 ? '+' : ''}
                {Math.abs(e.kcal)}
              </span>
              <button
                onClick={() => {
                  if (!confirm('删除这条记录？')) return
                  if (e.kind === 'food') removeFoodLog(e.id)
                  else removeExercise(e.id)
                  setToast('已删除')
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
    </div>
  )
}
