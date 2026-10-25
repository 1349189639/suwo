import { useEffect, useMemo, useRef, useState } from 'react'
import { BarcodeScanner } from '../components/BarcodeScanner'
import { PhotoRecognizer } from './PhotoRecognizer'
import { Button, Card, Field, NumberField, Pill, ProgressBar, TextField } from '../components/ui'
import { filterFoods } from '../data/foods'
import { useStore } from '../data/store'
import { todayKey } from '../domain/date'
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
  const addFoodLog = useStore((s) => s.addFoodLog)
  const removeFoodLog = useStore((s) => s.removeFoodLog)
  const updateFoodLog = useStore((s) => s.updateFoodLog)
  const addCustomFood = useStore((s) => s.addCustomFood)
  const setToast = useStore((s) => s.setToast)

  const [view, setView] = useState<'diary' | 'picker'>('diary')
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

  const day = summarizeDay(data, todayKey())
  const targets = targetsFor(data)

  const meals = useMemo(() => {
    return MEAL_ORDER.map((m) => {
      const items = day.meals.filter((l) => l.meal === m)
      return {
        meal: m,
        items,
        kcal: items.reduce((a, b) => a + b.kcal, 0),
        p: items.reduce((a, b) => a + b.p, 0),
      }
    })
  }, [day.meals])

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
    const recent = list.filter((f) => recentIds.includes(f.id))
    const rest = list.filter((f) => !recentIds.includes(f.id))
    return { recent: query ? [] : recent, rest, total: list.length }
  }, [query, category, data.customFoods, recentIds])

  const openPicker = (m: Meal) => {
    setMeal(m)
    setPicked(null)
    setQuery('')
    setCategory('all')
    setView('picker')
  }

  const logPicked = () => {
    if (!picked) return
    const k = grams / 100
    addFoodLog({
      date: todayKey(),
      meal,
      name: picked.name,
      grams,
      kcal: Math.round(picked.per100.kcal * k),
      p: Math.round(picked.per100.p * k * 10) / 10,
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
      date: todayKey(),
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
            addCustomFood(food)
            setPicked(food)
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

        <TextField value={query} onChange={setQuery} placeholder="搜食物，如 鸡胸肉 / 米饭 / 奶茶" prefix="🔍" />

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
                没找到，可以切到「自定义」直接输热量
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
      {editing && (
        <div className="anim-rise mb-3 space-y-2 rounded-2xl border border-accent/40 bg-surface2/60 p-3">
          <div className="text-[12px] text-accent">修改这条记录</div>
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-[14px] outline-none"
            placeholder="食物名称"
          />
          <div className="flex items-center gap-2">
            <div className="w-28">
              <NumberField value={editGrams} onChange={setEditGrams} suffix="g" min={1} max={2000} className="px-2.5 py-1.5" />
            </div>
            <span className="text-[11px] text-muted/60">
              按比例重算 ≈ {Math.round((editing.kcal / (editing.grams || 1)) * editGrams)} kcal
            </span>
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
                  onClick={() => openPicker(m.meal)}
                  className="ml-1 grid h-7 w-7 place-items-center rounded-full bg-accent/15 text-[15px] text-accent active:scale-90"
                  aria-label={`添加${MEAL_LABEL[m.meal]}`}
                >
                  +
                </button>
              </div>
            </div>

            {m.items.length === 0 ? (
              <button
                onClick={() => openPicker(m.meal)}
                className="mt-2 w-full rounded-xl border border-dashed border-line/70 py-3 text-[11px] text-muted/50"
              >
                还没有记录，点这里添加
              </button>
            ) : (
              <div className="mt-2 space-y-1">
                {m.items.map((it) => (
                  <div key={it.id} className="flex items-center justify-between py-0.5">
                    <button
                      onClick={() => {
                        setEditing(it)
                        setEditName(it.name)
                        setEditGrams(Math.round(it.grams))
                      }}
                      className="min-w-0 flex-1 text-left active:opacity-60"
                    >
                      <span className="text-[13px]">{it.name}</span>
                      <span className="ml-1.5 text-[10px] text-muted/60">{Math.round(it.grams)}g</span>
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="tabular text-[12px] text-muted">{it.kcal}</span>
                      <button
                        onClick={() => removeFoodLog(it.id)}
                        className="grid h-5 w-5 place-items-center rounded-full text-[10px] text-muted/30 active:bg-surface2"
                        aria-label="删除"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
                {m.p > 0 && (
                  <div className="pt-1 text-[10px] text-muted/50">蛋白合计 {Math.round(m.p)}g</div>
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
