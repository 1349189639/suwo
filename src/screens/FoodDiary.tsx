import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { BarcodeScanner } from '../components/BarcodeScanner'
import { PhotoRecognizer } from './PhotoRecognizer'
import { Button, Card, Field, NumberField, Pill, ProgressBar, TextField } from '../components/ui'
import { filterFoods, splitPickerResults } from '../data/foods'
import { estimateFood } from '../data/vision'
import { useStore } from '../data/store'
import { addDays, formatCN, todayKey } from '../domain/date'
import { HighlightChips } from '../components/HighlightChips'
import { buildMealObservation } from '../domain/mealObservation'
import { DEFAULT_EATING_PROFILE } from '../domain/types'
import { guessFiberByName, guessWater } from '../domain/water'
import { summarizeDay, targetsFor } from '../domain/day'
import {
  FOOD_CATEGORY_LABEL,
  FOOD_CATEGORY_ORDER,
  MEAL_HINT,
  MEAL_LABEL,
  MEAL_ORDER,
  type FoodCategory,
  type FoodItem,
  type FoodLog,
  type Meal,
} from '../domain/types'

function defaultMeal(): Meal {
  const h = new Date().getHours()
  if (h < 10) return 'breakfast'
  if (h < 15) return 'lunch'
  if (h < 20) return 'dinner'
  return 'snack'
}

type CategoryKey = FoodCategory | 'all' | 'custom'

export function FoodDiary({
  open,
  onClose,
  onOpenVision,
}: {
  open: boolean
  onClose: () => void
  onOpenVision: () => void
}) {
  const data = useStore((s) => s.data)
  const eating = data.eating ?? DEFAULT_EATING_PROFILE
  const customFoods = data.customFoods
  const addFoodLog = useStore((s) => s.addFoodLog)
  const removeFoodLog = useStore((s) => s.removeFoodLog)
  const restoreFoodLog = useStore((s) => s.restoreFoodLog)
  const copyMeal = useStore((s) => s.copyMeal)
  const offerUndo = useStore((s) => s.offerUndo)
  const updateFoodLog = useStore((s) => s.updateFoodLog)
  const addCustomFood = useStore((s) => s.addCustomFood)
  const setWater = useStore((s) => s.setWater)
  const setMealCost = useStore((s) => s.setMealCost)
  const setToast = useStore((s) => s.setToast)

  const [view, setView] = useState<'diary' | 'picker'>('diary')
  const [viewDate, setViewDate] = useState(todayKey())
  const [aiBusy, setAiBusy] = useState(false)
  const [meal, setMeal] = useState<Meal>(defaultMeal())
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryKey>('all')
  const [picked, setPicked] = useState<FoodItem | null>(null)
  const [grams, setGrams] = useState(100)
  const [custom, setCustom] = useState({ name: '', kcal: 0, p: 0, c: 0, f: 0 })
  const [scanning, setScanning] = useState(false)
  const [editing, setEditing] = useState<FoodLog | null>(null)
  const [editName, setEditName] = useState('')
  const [editGrams, setEditGrams] = useState(100)
  const [editCost, setEditCost] = useState(0)
  const [openMeal, setOpenMeal] = useState<Meal | null>(null)
  const [costDraft, setCostDraft] = useState(0)
  const [photo, setPhoto] = useState<string | null>(null)
  const photoRef = useRef<HTMLInputElement | null>(null)
  const galleryRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (open) {
      setView('diary')
      setQuery('')
      setCategory('all')
      setPicked(null)
      setCustom({ name: '', kcal: 0, p: 0, c: 0, f: 0 })
      setScanning(false)
      setPhoto(null)
      if (new URLSearchParams(window.location.search).get('picker')) setView('picker')
    }
  }, [open])

  // 弹层的滚动容器是共用的：从日记（尤其是晚餐/加餐）点进来时它停在原来的位置，
  // 新界面就只露出中段。每次换视图/换层级都归位到顶部，界面才从第一行开始。
  useEffect(() => {
    const el = document.querySelector('[data-sheet-scroll]')
    if (el instanceof HTMLElement) el.scrollTop = 0
  }, [view, picked, scanning, photo])

  const day = summarizeDay(data, viewDate)
  const targets = targetsFor(data)

  const meals = useMemo(() => {
    return MEAL_ORDER.map((m) => {
      const items = day.meals.filter((l) => l.meal === m)
      const sum = (fn: (x: (typeof items)[number]) => number) => items.reduce((a, b) => a + fn(b), 0)
      return {
        meal: m,
        items,
        kcal: Math.round(sum((x) => x.kcal)),
        p: Math.round(sum((x) => x.p) * 10) / 10,
        c: Math.round(sum((x) => x.c) * 10) / 10,
        f: Math.round(sum((x) => x.f) * 10) / 10,
        fiber: Math.round(sum((x) => x.fiber ?? guessFiberByName(x.name)) * 10) / 10,
        cost: day.mealCosts[m],
        waterMl: Math.round(sum((x) => ((x.water ?? guessWater(x.name) ?? 0) * x.grams) / 100)),
      }
    })
  }, [day])

  const recentIds = useMemo(() => {
    const out: string[] = []
    for (const log of [...data.foodLogs].reverse()) {
      if (log.foodId && !out.includes(log.foodId)) out.push(log.foodId)
      if (out.length >= 5) break
    }
    return out
  }, [data.foodLogs])

  const results = useMemo(() => {
    const list = filterFoods(query, data.customFoods, category)
    return splitPickerResults(list, recentIds, query)
  }, [query, category, data.customFoods, recentIds])

  const openPicker = (m: Meal) => {
    setMeal(m)
    setPicked(null)
    setQuery('')
    setCategory('all')
    setView('picker')
  }

  /** 往前 7 天里，最近一次记过这个餐次的日期（用于「复制上一餐」） */
  const prevMealDate = (m: Meal): string | null => {
    for (let i = 1; i <= 7; i += 1) {
      const d = addDays(viewDate, -i)
      if (data.foodLogs.some((l) => l.date === d && l.meal === m)) return d
    }
    return null
  }

  const logPicked = () => {
    if (!picked) return
    const k = grams / 100
    addFoodLog({
      date: viewDate,
      meal,
      name: picked.name,
      grams,
      kcal: Math.round(picked.per100.kcal * k),
      p: Math.round(picked.per100.p * k * 10) / 10,
      fiber: Math.round((picked.per100.fiber ?? 0) * k * 10) / 10,
      water: picked.per100.water,
      c: Math.round(picked.per100.c * k * 10) / 10,
      f: Math.round(picked.per100.f * k * 10) / 10,
      foodId: picked.id,
    })
    setToast(`已加入${MEAL_LABEL[meal]} · ${picked.name}`)
    setPicked(null)
    setView('diary')
  }

  const addCustom = () => {
    if (!custom.name.trim() || custom.kcal <= 0) return
    const item = {
      name: custom.name.trim(),
      category: 'dish' as FoodCategory,
      tags: ['自定义'],
      per100: { kcal: custom.kcal, p: custom.p, c: custom.c, f: custom.f },
      defaultGrams: 100,
      custom: true,
    }
    addCustomFood(item)
    addFoodLog({
      date: viewDate,
      meal,
      name: item.name,
      grams: 100,
      kcal: Math.round(custom.kcal),
      p: custom.p,
      c: custom.c,
      f: custom.f,
    })
    setToast(`已记录 ${item.name}`)
    setCustom({ name: '', kcal: 0, p: 0, c: 0, f: 0 })
    setView('diary')
  }

  /* ------------------------------ 选食物 ------------------------------ */
  if (view === 'picker' && picked) {
    const k = grams / 100
    return (
      <div className="anim-rise pb-4">
        <button onClick={() => setPicked(null)} className="mb-3 text-[13px] text-muted">
          ← 返回列表
        </button>
        <div className="mb-1 text-[20px] font-bold">{picked.name}</div>
        <div className="text-[12px] text-muted">
          每 100g · {Math.round(picked.per100.kcal)} kcal · 蛋白 {picked.per100.p}g · 碳水{' '}
          {picked.per100.c}g · 脂肪 {picked.per100.f}g
        </div>
        <HighlightChips name={picked.name} tags={picked.tags} fat={picked.per100.f} kcal={picked.per100.kcal} className="mt-1.5" />

        <div className="mt-5 space-y-3">
          <Field label="份量" hint={`加入${MEAL_LABEL[meal]}`}>
            <NumberField value={grams} onChange={setGrams} suffix="g" min={1} max={2000} />
          </Field>
          <div className="flex gap-2">
            {(picked.unit && picked.unitGrams
              ? [0.5, 1, 1.5, 2].map((n) => ({ label: `${n} ${picked.unit}`, grams: Math.round(picked.unitGrams! * n) }))
              : [50, 100, 150, 200].map((g) => ({ label: `${g}g`, grams: g }))
            ).map((o) => (
              <button
                key={o.label}
                onClick={() => setGrams(o.grams)}
                className="flex-1 rounded-xl border border-line bg-surface2/60 py-2 text-[12px] text-muted"
              >
                {o.label}
              </button>
            ))}
          </div>

          <Card className="flex items-center justify-between">
            <div>
              <div className="text-[12px] text-muted">本次摄入</div>
              <div className="tabular text-[30px] font-bold text-accent">
                {Math.round(picked.per100.kcal * k)}
                <span className="ml-1 text-[12px] font-normal text-muted">kcal</span>
              </div>
            </div>
            <div className="space-y-0.5 text-right text-[11px] text-muted">
              <div>蛋白 {(picked.per100.p * k).toFixed(1)}g</div>
              <div>碳水 {(picked.per100.c * k).toFixed(1)}g</div>
              <div>脂肪 {(picked.per100.f * k).toFixed(1)}g</div>
            </div>
          </Card>

          <Button className="w-full" onClick={logPicked}>
            加入{MEAL_LABEL[meal]}
          </Button>
          <p className="text-center text-[10px] leading-4 text-muted/50">
            数值为常见做法的参考值，实际以你的烹饪方式为准
          </p>
        </div>
      </div>
    )
  }

  if (view === 'picker' && scanning) {
    return (
      <div className="anim-rise pb-4">
        <button onClick={() => setScanning(false)} className="mb-3 text-[13px] text-muted">
          ← 返回
        </button>
        <BarcodeScanner
          onPick={(food) => {
            // 扫码结果自动进食物库；同条码/同名只存一份，重复扫直接复用已有的那条
            const existed = customFoods.find(
              (f) => (food.barcode && f.barcode === food.barcode) || f.name === food.name,
            )
            if (existed) {
              setPicked(existed)
              setToast('这个商品已经在食物库里')
            } else {
              addCustomFood(food)
              setPicked(food)
              setToast(`已存入食物库 · ${food.name}`)
            }
            setGrams(100)
            setScanning(false)
          }}
        />
      </div>
    )
  }

  if (view === 'picker') {
    return (
      <div className="anim-rise pb-4">
        <div className="mb-3 flex items-center justify-between">
          <button onClick={() => setView('diary')} className="text-[13px] text-muted">
            ← 返回
          </button>
          <span className="rounded-full bg-accent/15 px-3 py-1 text-[11px] text-accent">
            加入{MEAL_LABEL[meal]}
          </span>
        </div>

        <TextField
          value={query}
          onChange={(v) => {
            setQuery(v)
            if (v.trim() && category !== 'all') setCategory('all')
          }}
          placeholder="搜食物，如 鸡胸肉 / 米饭 / 奶茶"
          prefix="🔍"
        />

        <div className="mt-2 flex gap-2">
          <button
            onClick={() => setScanning(true)}
            className="flex-1 rounded-xl border border-line bg-surface2/50 py-2.5 text-[12px] text-muted active:scale-[0.98]"
          >
            📷 扫条码
          </button>
          <button
            onClick={() => photoRef.current?.click()}
            className="flex-1 rounded-xl border border-line bg-surface2/50 py-2.5 text-[12px] text-muted active:scale-[0.98]"
          >
            📷 拍照记一餐
          </button>
          <button
            onClick={() => galleryRef.current?.click()}
            className="flex-1 rounded-xl border border-line bg-surface2/50 py-2.5 text-[12px] text-muted active:scale-[0.98]"
          >
            🖼 相册导入
          </button>
        </div>
        <input
          ref={photoRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (!file) return
            const reader = new FileReader()
            reader.onload = () => setPhoto(String(reader.result))
            reader.readAsDataURL(file)
            e.target.value = ''
          }}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (!file) return
            const reader = new FileReader()
            reader.onload = () => setPhoto(String(reader.result))
            reader.readAsDataURL(file)
            e.target.value = ''
          }}
        />
        {photo && (
          <div>
            <PhotoRecognizer
              photo={photo}
              meal={meal}
              onFinish={onClose}
              onOpenVision={onOpenVision}
            />
            <button
              onClick={() => setPhoto(null)}
              className="mt-2 w-full text-center text-[10.5px] text-muted/60"
            >
              移除照片，手动记录
            </button>
          </div>
        )}

        <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
          <Pill active={category === 'all'} onClick={() => setCategory('all')}>
            全部
          </Pill>
          {FOOD_CATEGORY_ORDER.map((c) => (
            <Pill key={c} active={category === c} onClick={() => setCategory(c)}>
              {FOOD_CATEGORY_LABEL[c]}
            </Pill>
          ))}
          <Pill active={category === 'custom'} onClick={() => setCategory('custom')}>
            自定义
          </Pill>
        </div>

        {category === 'custom' ? (
          <div className="mt-4 space-y-3">
            <Field label="食物名称">
              <TextField
                value={custom.name}
                onChange={(v) => setCustom({ ...custom, name: v })}
                placeholder="如：食堂的番茄炒蛋"
              />
            </Field>
            <Field label="每 100g 热量" hint="包装食品看营养成分表">
              <NumberField value={custom.kcal} onChange={(v) => setCustom({ ...custom, kcal: v })} suffix="kcal" max={1500} />
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="蛋白">
                <NumberField value={custom.p} onChange={(v) => setCustom({ ...custom, p: v })} suffix="g" max={100} />
              </Field>
              <Field label="碳水">
                <NumberField value={custom.c} onChange={(v) => setCustom({ ...custom, c: v })} suffix="g" max={100} />
              </Field>
              <Field label="脂肪">
                <NumberField value={custom.f} onChange={(v) => setCustom({ ...custom, f: v })} suffix="g" max={100} />
              </Field>
            </div>
            <Button className="w-full" disabled={!custom.name.trim() || custom.kcal <= 0} onClick={addCustom}>
              记为 100g 加入{MEAL_LABEL[meal]}
            </Button>
          </div>
        ) : (
          <div className="mt-3 space-y-4">
            {results.recent.length > 0 && (
              <div>
                <div className="mb-1.5 px-1 text-[11px] text-muted/70">最近常吃</div>
                <div className="space-y-1.5">
                  {results.recent.map((f) => (
                    <FoodRow
                      key={f.id}
                      food={f}
                      onClick={() => {
                        setPicked(f)
                        setGrams(f.defaultGrams)
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              {results.rest.map((f) => (
                <FoodRow
                  key={f.id}
                  food={f}
                  onClick={() => {
                    setPicked(f)
                    setGrams(f.defaultGrams)
                  }}
                />
              ))}
            </div>
            {results.total === 0 && (
              <div className="py-10 text-center text-[13px] text-muted/70">
                <div className="space-y-2">
                  <div>没找到，可以切到「自定义」直接输热量</div>
                  <button
                    disabled={aiBusy || query.trim().length < 2}
                    onClick={async () => {
                      setAiBusy(true)
                      try {
                        const items = await estimateFood(query.trim())
                        if (items.length > 0) {
                          const it = items[0]
                          const g = Math.max(it.grams, 1)
                          if (!customFoods.some((f) => f.name === it.name)) {
                            addCustomFood({
                              name: it.name,
                              category: 'dish',
                              tags: ['AI 估算'],
                              per100: {
                                kcal: Math.round((it.kcal / g) * 100),
                                p: Math.round((it.p / g) * 1000) / 10,
                                c: Math.round((it.c / g) * 1000) / 10,
                                f: Math.round((it.f / g) * 1000) / 10,
                                fiber: Math.round(((it.fiber ?? 0) / g) * 1000) / 10,
                                water: it.water,
                              },
                              defaultGrams: Math.round(g),
                            })
                          }
                          addFoodLog({
                            date: viewDate,
                            meal,
                            name: it.name,
                            grams: Math.round(it.grams),
                            kcal: Math.round(it.kcal),
                            p: it.p,
                            c: it.c,
                            f: it.f,
                            fiber: it.fiber ?? 0,
                            water: it.water,
                          })
                          setToast('已记入，并存进食物库')
                          setView('diary')
                        } else {
                          setToast('AI 也没估出来，换个说法试试')
                        }
                      } catch (e) {
                        setToast(e instanceof Error ? e.message : 'AI 估算失败')
                      } finally {
                        setAiBusy(false)
                      }
                    }}
                    className="rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-[12px] text-accent disabled:opacity-40"
                  >
                    {aiBusy ? 'AI 估算中…' : `用 AI 估算「${query.trim()}」`}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  /* ------------------------------ 饮食日记 ------------------------------ */
  return (
    <div className="anim-rise pb-4">
      <div className="mb-2 flex items-center justify-between rounded-2xl border border-line/60 bg-surface/60 px-2 py-1.5">
        <button
          onClick={() => setViewDate(addDays(viewDate, -1))}
          className="rounded-lg px-2 py-1 text-[12px] text-muted active:bg-surface2"
        >
          ‹ 前一天
        </button>
        <button onClick={() => setViewDate(todayKey())} className="text-[12px] text-accent">
          {viewDate === todayKey() ? '今天' : formatCN(viewDate)}
        </button>
        <button
          onClick={() => setViewDate(addDays(viewDate, 1))}
          disabled={viewDate >= todayKey()}
          className="rounded-lg px-2 py-1 text-[12px] text-muted active:bg-surface2 disabled:opacity-30"
        >
          后一天 ›
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-surface2/50 p-3">
        <div className="text-center">
          <div className="tabular text-[19px] font-bold text-accent">{Math.round(day.intake.kcal)}</div>
          <div className="text-[10px] text-muted">已摄入</div>
        </div>
        <div className="text-center">
          <div className="tabular text-[19px] font-bold">{day.budget}</div>
          <div className="text-[10px] text-muted">额度</div>
        </div>
        <div className="text-center">
          <div className={`tabular text-[19px] font-bold ${day.remaining < 0 ? 'text-danger' : 'text-ink'}`}>
            {Math.abs(day.remaining)}
          </div>
          <div className="text-[10px] text-muted">{day.remaining < 0 ? '已超出' : '剩余'}</div>
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between px-1 text-[10px] text-muted/70">
          <span>蛋白 {Math.round(day.intake.p)} / {targets.p}g</span>
          <span>碳水 {Math.round(day.intake.c)} / {targets.c}g</span>
          <span>脂肪 {Math.round(day.intake.f)} / {targets.f}g</span>
        </div>
        <ProgressBar value={day.intake.kcal} max={day.budget} color={day.remaining < 0 ? '#ff6b81' : '#3ddc97'} />
      </div>

      <div className="mt-2 flex items-center justify-between rounded-2xl border border-line/60 bg-surface/60 px-3 py-2">
        <span className="text-[12px] text-muted">当日花费</span>
        <span className="tabular text-[15px] font-semibold text-accent">¥{money(day.cost ?? 0)}</span>
      </div>

      <div className="mt-2 flex items-center justify-between rounded-2xl border border-line/60 bg-surface/60 px-3 py-2">
        <div>
          <div className="text-[12px] text-muted">今日饮水</div>
          <div className="tabular text-[15px] font-semibold">{day.water} <span className="text-[10px] font-normal text-muted">ml</span></div>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setWater(day.water + 250)} className="rounded-xl bg-surface2 px-3 py-1.5 text-[12px] text-accent">+250</button>
          <button onClick={() => setWater(day.water + 500)} className="rounded-xl bg-surface2 px-3 py-1.5 text-[12px] text-accent">+500</button>
          <button onClick={() => setWater(0)} className="rounded-xl bg-surface2 px-3 py-1.5 text-[10px] text-muted">清零</button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {meals.map((m) => (
          <div key={m.meal} className="rounded-2xl border border-line/60 bg-surface/60 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-[14px] font-semibold">{MEAL_LABEL[m.meal]}</span>
                <span className="text-[10px] text-muted/60">{MEAL_HINT[m.meal]}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="tabular text-[13px] font-semibold text-accent">{m.kcal || 0}</span>
                <span className="text-[10px] text-muted">kcal</span>
                <button
                  onClick={() => {
                    const next = openMeal === m.meal ? null : m.meal
                    setOpenMeal(next)
                    if (next) setCostDraft(data.mealCosts?.[`${viewDate}:${m.meal}`] ?? 0)
                  }}
                  className={
                    'rounded-lg border px-2 py-0.5 text-[10px] active:opacity-60 ' +
                    (openMeal === m.meal
                      ? 'border-accent/60 bg-accent/15 text-accent'
                      : 'border-line/70 bg-surface/60 text-muted')
                  }
                >
                  记账 ¥{money(m.cost)}
                </button>
                <button
                  onClick={() => openPicker(m.meal)}
                  className="ml-1 grid h-7 w-7 place-items-center rounded-full bg-accent/15 text-[15px] text-accent active:scale-90"
                  aria-label={`添加${MEAL_LABEL[m.meal]}`}
                >
                  +
                </button>
              </div>
            </div>

            {openMeal === m.meal && (
              <div className="mt-2 space-y-2 rounded-xl bg-surface/70 p-2.5">
                <div className="text-[11px] text-muted">这一餐一共花了（留空就只算单项·可直接算 12+8）</div>
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <NumberField value={costDraft} onChange={setCostDraft} suffix="元" min={0} max={9999} emptyWhenZero placeholder="0" allowMath />
                  </div>
                  <Button
                    variant="soft"
                    className="shrink-0 px-4 py-2 text-[12px]"
                    onClick={() => {
                      setMealCost(viewDate, m.meal, costDraft)
                      setOpenMeal(null)
                      setToast('已记这一餐的花费')
                    }}
                  >
                    保存
                  </Button>
                </div>
                <div className="text-[10px] text-muted/60">
                  单项合计 ¥{m.items.reduce((a, x) => a + (x.cost ?? 0), 0).toFixed(2)}
                </div>
              </div>
            )}

            {m.items.length === 0 ? (
              <div className="mt-2 space-y-1.5">
                <button
                  onClick={() => openPicker(m.meal)}
                  className="w-full rounded-xl border border-dashed border-line/70 py-3 text-[11px] text-muted/50"
                >
                  还没有记录，点这里添加
                </button>
                {(() => {
                  const prev = prevMealDate(m.meal)
                  if (!prev) return null
                  return (
                    <button
                      onClick={() => {
                        const n = copyMeal(prev, viewDate, m.meal)
                        setToast(
                          n > 0
                            ? `已复制 ${formatCN(prev)} 的${MEAL_LABEL[m.meal]} ${n} 项`
                            : '那天没有可复制的记录',
                        )
                      }}
                      className="w-full text-center text-[10.5px] text-accent/80 active:opacity-60"
                    >
                      复制 {formatCN(prev)} 的{MEAL_LABEL[m.meal]}
                    </button>
                  )
                })()}
              </div>
            ) : (
              <div className="mt-2 space-y-1">
                {m.items.map((it) => (
                  <Fragment key={it.id}>
                  <div className="flex items-center justify-between py-0.5">
                    <button
                      onClick={() => {
                        setEditing(it)
                        setEditName(it.name)
                        setEditGrams(Math.round(it.grams))
                        setEditCost(it.cost ?? 0)
                      }}
                      className="min-w-0 flex-1 text-left active:opacity-60"
                    >
                      <div>
                        <span className="text-[13px]">{it.name}</span>
                        <span className="ml-1.5 text-[10px] text-muted/60">{Math.round(it.grams)}g</span>
                      </div>
                      <div className="text-[10px] text-muted/45">
                        蛋白 {it.p.toFixed(1)} · 碳水 {it.c.toFixed(1)} · 脂肪 {it.f.toFixed(1)}
                        {it.fiber ? ` · 纤维 ${it.fiber.toFixed(1)}` : ''}
                        {it.water ? ` · 水 ${Math.round((it.grams * it.water) / 100)}ml` : ''}
                        {it.cost ? ` · ¥${it.cost.toFixed(1)}` : ''}
                      </div>
                      <HighlightChips name={it.name} fat={it.f} kcal={it.kcal} className="mt-0.5" />
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="tabular text-[12px] text-muted">{it.kcal}</span>
                      <button
                        onClick={() => {
                          removeFoodLog(it.id)
                          offerUndo(`已删除「${it.name}」`, () => restoreFoodLog(it))
                        }}
                        className="grid h-5 w-5 place-items-center rounded-full text-[10px] text-muted/30 active:bg-surface2"
                        aria-label="删除"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {editing && editing.id === it.id && (
                    <div className="mb-2 mt-1 space-y-2 rounded-xl border border-accent/40 bg-surface2/50 p-2.5">
                      <div className="text-[11px] text-accent">修改这一条</div>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-[14px] outline-none"
                        placeholder="食物名称"
                      />
                      <div>
                        <div className="mb-1 text-[10px] text-muted/60">吃了多少</div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <NumberField value={editGrams} onChange={setEditGrams} suffix="g" min={1} max={2000} />
                          </div>
                          <span className="shrink-0 text-[10px] text-muted/60">
                            ≈ {Math.round((editing.kcal / (editing.grams || 1)) * editGrams)} kcal
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 text-[10px] text-muted/60">这一条花了多少钱（可不填）</div>
                        <NumberField value={editCost} onChange={setEditCost} suffix="元" min={0} max={9999} emptyWhenZero placeholder="0" allowMath />
                      </div>
                      <div className="flex gap-2">
                        <Button variant="soft" className="flex-1" onClick={() => setEditing(null)}>
                          取消
                        </Button>
                        <Button
                          className="flex-1"
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
                            })
                            setEditing(null)
                            setToast('已修改')
                          }}
                        >
                          保存
                        </Button>
                      </div>
                    </div>
                  )}
                  </Fragment>
                ))}
                {m.items.length > 0 && (
                  <div className="mt-1 space-y-1 border-t border-line/40 pt-1.5">
                    <div className="tabular flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted/60">
                      <span>蛋白 {m.p}g</span>
                      <span>碳水 {m.c}g</span>
                      <span>脂肪 {m.f}g</span>
                      <span>纤维 {m.fiber}g</span>
                      <span>水分 {m.waterMl}ml</span>
                    </div>
                    {(() => {
                      const obs = buildMealObservation(m.items, m.meal, eating)
                      if (obs.skipped || obs.noted.length === 0) return null
                      return (
                        <div className="mt-1 space-y-0.5 text-[10px] leading-4 text-muted/70">
                          {obs.noted.map((t) => (
                            <div key={t}>{t}</div>
                          ))}
                          {obs.option && (
                            <div className="text-[#8fbfff]">{obs.option.text}</div>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <Button variant="soft" className="mt-4 w-full" onClick={onClose}>
        完成
      </Button>
    </div>
  )
}

function FoodRow({ food, onClick }: { food: FoodItem; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-2xl bg-surface2/50 px-3.5 py-2.5 text-left active:bg-surface2"
    >
      <div className="min-w-0">
        <div className="truncate text-[14px]">{food.name}</div>
        <div className="text-[11px] text-muted/70">
          {food.unit ? `1 ${food.unit} ≈ ${food.unitGrams}g` : `每份 ${food.defaultGrams}g`} · 蛋白{' '}
          {food.per100.p}g/100g
        </div>
      </div>
      <div className="tabular ml-2 shrink-0 text-right text-[13px] font-semibold text-accent">
        {Math.round((food.per100.kcal * food.defaultGrams) / 100)}
        <span className="ml-0.5 text-[10px] font-normal text-muted">kcal</span>
      </div>
    </button>
  )
}

/** 按餐次定位给建议：加餐不该按正餐的标准要求蛋白 */
const money = (n: number) => (n % 1 === 0 ? String(n) : n.toFixed(2))

