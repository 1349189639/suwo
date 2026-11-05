import { useEffect, useState } from 'react'
import { Button, Card, NumberField } from '../components/ui'
import { useStore } from '../data/store'
import { todayKey } from '../domain/date'
import { MEAL_LABEL, type Meal } from '../domain/types'
import { VisionError, hasVisionConfig, recalcItems, recognizeImage, type VisionItem } from '../data/vision'

type State = 'loading' | 'ready' | 'error' | 'no-config'

interface Row {
  name: string
  /** 这组营养数字是按哪个名字算出来的；改了名字就说明要重算 */
  baseName: string
  grams: number
  /** 每 100g 的营养，改克数时按它换算 */
  kcal100: number
  p100: number
  c100: number
  f100: number
  fiber100: number
  /** 每 100g 含水量（%） */
  water: number
}

const round1 = (n: number) => Math.round(n * 10) / 10
const waterMl = (it: VisionItem) => Math.round((it.grams * (it.water ?? 0)) / 100)

const toRow = (it: VisionItem): Row => {
  const g = it.grams > 0 ? it.grams : 100
  const k = 100 / g
  return {
    name: it.name,
    baseName: it.name,
    grams: Math.round(g),
    kcal100: Math.round(it.kcal * k),
    p100: round1(it.p * k),
    c100: round1(it.c * k),
    f100: round1(it.f * k),
    fiber100: round1((it.fiber ?? 0) * k),
    water: it.water ?? 0,
  }
}

const toItems = (rows: Row[]): VisionItem[] =>
  rows.map((r) => {
    const k = r.grams / 100
    return {
      name: r.name,
      grams: r.grams,
      kcal: Math.round(r.kcal100 * k),
      p: round1(r.p100 * k),
      c: round1(r.c100 * k),
      f: round1(r.f100 * k),
      fiber: round1(r.fiber100 * k),
      water: r.water,
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
  const [recalcIdx, setRecalcIdx] = useState<number | null>(null)

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

  /** 改完名字离开输入框就自动重算这一条，营养才跟得上新名字 */
  const recalcRow = async (i: number) => {
    const row = rows[i]
    if (!row) return
    const name = row.name.trim()
    if (!name || name === row.baseName) return
    setRecalcIdx(i)
    try {
      const fixed = await recalcItems([{ name, grams: row.grams }])
      const hit = fixed[0]
      if (!hit) {
        setToast('这个新名字没算出来，稍后再试')
        return
      }
      setRows((prev) =>
        prev.map((r, j) =>
          j === i ? { ...toRow({ ...hit, grams: row.grams }), name, baseName: name } : r,
        ),
      )
      setToast(`「${name}」的营养已按新名字更新`)
    } catch (e) {
      setToast(e instanceof VisionError ? e.message : '重算失败')
    } finally {
      setRecalcIdx(null)
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
        fiber: it.fiber ?? 0,
        water: it.water,
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
                      onBlur={() => void recalcRow(i)}
                      className={
                        'min-w-0 flex-1 rounded-lg bg-transparent px-1 py-0.5 text-[13.5px] outline-none focus:bg-surface ' +
                        (rows[i].name.trim() !== rows[i].baseName ? 'text-accent' : '')
                      }
                      aria-label="菜名"
                    />
                    <span className="tabular shrink-0 text-[12px] text-accent">
                      {recalcIdx === i ? '重算中…' : `${it.kcal} kcal`}
                    </span>
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
                    <div className="min-w-0 flex-1 text-[10.5px] leading-4 text-muted/60">
                      <div className="truncate">
                        蛋白 {it.p}g · 碳水 {it.c}g · 脂肪 {it.f}g
                      </div>
                      <div className="truncate">
                        纤维 {(it.fiber ?? 0).toFixed(1)}g · 水分{' '}
                        {it.water === undefined ? '—' : `${waterMl(it)}ml`}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="px-1 text-[10px] leading-4 text-muted/50">
              认错了就直接改名字（比如把「鸡肉」改成「牛肉」），离开输入框会自动按新名字重算营养；改了好几条再点下面的按钮一次算。
            </p>

            <div className="rounded-2xl bg-surface2/60 px-4 py-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[12px] text-muted">合计</span>
                <span className="tabular text-[22px] font-bold text-accent">
                  {total}
                  <span className="ml-1 text-[11px] font-normal text-muted">kcal</span>
                </span>
              </div>
              <div className="tabular mt-1 flex justify-between text-[10px] text-muted/70">
                <span>纤维 {round1(items.reduce((a, b) => a + (b.fiber ?? 0), 0))}g</span>
                <span>
                  水分{' '}
                  {items.some((b) => b.water !== undefined)
                    ? `${items.reduce((a, b) => a + waterMl(b), 0)}ml`
                    : '—'}
                </span>
              </div>
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
