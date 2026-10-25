import { useEffect, useState } from 'react'
import { Button, Card, NumberField } from '../components/ui'
import { useStore } from '../data/store'
import { todayKey } from '../domain/date'
import { MEAL_LABEL, type Meal } from '../domain/types'
import { VisionError, hasVisionConfig, recalcItems, recognizeImage, type VisionItem } from '../data/vision'

type State = 'loading' | 'ready' | 'error' | 'no-config'

interface Row {
  name: string
  grams: number
  /** 每 100g 的营养，改克数时按它换算 */
  kcal100: number
  p100: number
  c100: number
  f100: number
}

const toRow = (it: VisionItem): Row => {
  const g = it.grams > 0 ? it.grams : 100
  const k = 100 / g
  return {
    name: it.name,
    grams: Math.round(g),
    kcal100: Math.round(it.kcal * k),
    p100: Math.round(it.p * k * 10) / 10,
    c100: Math.round(it.c * k * 10) / 10,
    f100: Math.round(it.f * k * 10) / 10,
  }
}

const toItems = (rows: Row[]): VisionItem[] =>
  rows.map((r) => {
    const k = r.grams / 100
    return {
      name: r.name,
      grams: r.grams,
      kcal: Math.round(r.kcal100 * k),
      p: Math.round(r.p100 * k * 10) / 10,
      c: Math.round(r.c100 * k * 10) / 10,
      f: Math.round(r.f100 * k * 10) / 10,
    }
  })

export function PhotoRecognizer({
  photo,
  meal,
  onFinish,
  onOpenVision,
}: {
  photo: string
  meal: Meal
  onFinish: () => void
  onOpenVision: () => void
}) {
  const addFoodLog = useStore((s) => s.addFoodLog)
  const setToast = useStore((s) => s.setToast)

  const [state, setState] = useState<State>(hasVisionConfig() ? 'loading' : 'no-config')
  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState('')
  const [recalcing, setRecalcing] = useState(false)

  const run = async () => {
    setState('loading')
    setError('')
    try {
      const found = await recognizeImage(photo)
      setRows(found.map(toRow))
      setState('ready')
    } catch (e) {
      setError(e instanceof VisionError ? e.message : '识别失败，重试一次')
      setState('error')
    }
  }

  useEffect(() => {
    if (hasVisionConfig()) void run()
    // eslint-disable-next-line
  }, [])

  const items = toItems(rows)
  const total = items.reduce((a, b) => a + b.kcal, 0)

  const patch = (i: number, p: Partial<Row>) =>
    setRows((prev) => {
      const next = [...prev]
      next[i] = { ...next[i], ...p }
      return next
    })

  const recalc = async () => {
    setRecalcing(true)
    try {
      const fixed = await recalcItems(rows.map((r) => ({ name: r.name, grams: r.grams })))
      if (fixed.length === rows.length) {
        setRows(fixed.map(toRow))
        setToast('已按你改的内容重算')
      } else if (fixed.length > 0) {
        setRows(fixed.map(toRow))
        setToast('已重算（模型返回的条目数有出入，检查一下）')
      } else {
        setToast('重算没有返回结果，稍后再试')
      }
    } catch (e) {
      setToast(e instanceof VisionError ? e.message : '重算失败')
    } finally {
      setRecalcing(false)
    }
  }

  const addAll = () => {
    for (const it of items) {
      addFoodLog({
        date: todayKey(),
        meal,
        name: it.name,
        grams: Math.round(it.grams),
        kcal: it.kcal,
        p: it.p,
        c: it.c,
        f: it.f,
      })
    }
    setToast(`已记入${MEAL_LABEL[meal]} ${items.length} 项`)
    onFinish()
  }

  return (
    <div className="anim-rise mt-3 space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-line">
        <img src={photo} alt="这一餐" className="h-32 w-full object-cover" />
        <div className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[10px] text-white/80">
          {MEAL_LABEL[meal]}
        </div>
      </div>

      {state === 'no-config' && (
        <Card className="space-y-2 text-center">
          <div className="text-[13px]">还没有接入识图服务</div>
          <p className="text-[11px] leading-4 text-muted/60">配一个视觉模型的 Key，拍照就能自动出菜名和热量。</p>
          <Button className="w-full" onClick={onOpenVision}>
            去设置
          </Button>
        </Card>
      )}

      {state === 'loading' && (
        <Card className="flex items-center justify-center gap-2 py-6">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <span className="text-[12px] text-muted">正在识别这顿饭…</span>
        </Card>
      )}

      {state === 'error' && (
        <Card className="space-y-2">
          <div className="text-[12.5px] leading-5 text-danger">{error}</div>
          <div className="flex gap-2">
            <Button variant="soft" className="flex-1" onClick={() => void run()}>
              重试
            </Button>
            <Button variant="soft" className="flex-1" onClick={onOpenVision}>
              检查配置
            </Button>
          </div>
        </Card>
      )}

      {state === 'ready' &&
        (rows.length === 0 ? (
          <Card className="py-6 text-center text-[12px] text-muted">
            没认出来。换张更清楚的，或者把菜拨开再拍一张。
          </Card>
        ) : (
          <>
            <div className="space-y-1.5">
              {items.map((it, i) => (
                <div key={i} className="rounded-2xl bg-surface2/50 p-2.5">
                  <div className="flex items-center gap-2">
                    <input
                      value={rows[i].name}
                      onChange={(e) => patch(i, { name: e.target.value })}
                      className="min-w-0 flex-1 rounded-lg bg-transparent px-1 py-0.5 text-[13.5px] outline-none focus:bg-surface"
                      aria-label="菜名"
                    />
                    <span className="tabular shrink-0 text-[12px] text-accent">{it.kcal} kcal</span>
                    <button
                      onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] text-muted/40 active:bg-surface"
                      aria-label="删除"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="w-24">
                      <NumberField
                        value={rows[i].grams}
                        onChange={(g) => patch(i, { grams: g })}
                        suffix="g"
                        min={1}
                        max={2000}
                        className="px-2.5 py-1.5"
                      />
                    </div>
                    <span className="text-[10.5px] text-muted/60">
                      蛋白 {it.p}g · 碳水 {it.c}g · 脂肪 {it.f}g
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <p className="px-1 text-[10px] leading-4 text-muted/50">
              认错了就直接改名字（比如把「鸡肉」改成「牛肉」），再点下面的重算。
            </p>

            <div className="flex items-baseline justify-between rounded-2xl bg-surface2/60 px-4 py-3">
              <span className="text-[12px] text-muted">合计</span>
              <span className="tabular text-[22px] font-bold text-accent">
                {total}
                <span className="ml-1 text-[11px] font-normal text-muted">kcal</span>
              </span>
            </div>

            <div className="flex gap-2">
              <Button variant="soft" className="flex-1" disabled={recalcing} onClick={() => void recalc()}>
                {recalcing ? '重算中…' : '按修改重算营养'}
              </Button>
              <Button className="flex-1" onClick={addAll}>
                全部记入
              </Button>
            </div>
          </>
        ))}
    </div>
  )
}
