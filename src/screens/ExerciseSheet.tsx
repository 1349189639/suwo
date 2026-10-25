import { useEffect, useState } from 'react'
import { Button, Card, Field, NumberField, Pill, Segmented, Stepper } from '../components/ui'
import { useStore } from '../data/store'
import {
  BODY_PART_LABEL,
  BODY_PART_ORDER,
  CARDIO_ACTIVITIES,
  CARDIO_GROUP_LABEL,
  CARDIO_GROUP_ORDER,
  INTENSITY_FACTOR,
  INTENSITY_LABEL,
  LOAD_MODE_TITLE,
  STRENGTH_MOVES,
  activitiesByGroup,
  cardioKcal,
  effectiveLoad,
  kcalPerHour,
  kcalRange,
  paceLabel,
  runKcalByDistance,
  stepsKcal,
  strengthKcal,
  strengthMinutes,
  trainingVolume,
  type CardioGroup,
} from '../domain/activity'
import { latestWeight } from '../domain/day'
import { todayKey } from '../domain/date'
import type { Intensity } from '../domain/types'

type Tab = 'strength' | 'cardio' | 'steps'

export function ExerciseSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const data = useStore((s) => s.data)
  const addExercise = useStore((s) => s.addExercise)
  const setSteps = useStore((s) => s.setSteps)
  const setToast = useStore((s) => s.setToast)

  const [tab, setTab] = useState<Tab>('strength')

  // 力量
  const [part, setPart] = useState(STRENGTH_MOVES[0].part)
  const [moveName, setMoveName] = useState(STRENGTH_MOVES[0].name)
  const [sets, setSets] = useState(4)
  const [reps, setReps] = useState(10)
  const [load, setLoad] = useState(STRENGTH_MOVES[0].defaultLoad)

  // 有氧
  const [group, setGroup] = useState<CardioGroup>('ball')
  const [activityId, setActivityId] = useState('badminton')
  const [variantIdx, setVariantIdx] = useState(0)
  const [intensity, setIntensity] = useState<Intensity>('mid')
  const [minutes, setMinutes] = useState(60)
  const [distance, setDistance] = useState(0)

  const [stepsInput, setStepsInput] = useState(0)

  const bodyWeight = latestWeight(data) ?? 70
  const move = STRENGTH_MOVES.find((m) => m.name === moveName) ?? STRENGTH_MOVES[0]

  const groupActivities = activitiesByGroup(group)
  const activity = CARDIO_ACTIVITIES.find((a) => a.id === activityId) ?? groupActivities[0]
  const variant = activity.variants[Math.min(variantIdx, activity.variants.length - 1)]

  useEffect(() => {
    if (!open) return
    const sec = new URLSearchParams(window.location.search).get('section')
    setTab(sec === 'cardio' || sec === 'steps' ? sec : 'strength')
    setStepsInput(data.steps[todayKey()] ?? 0)
  }, [open, data.steps])

  useEffect(() => {
    setLoad(move.defaultLoad)
  }, [move.name, move.defaultLoad])

  const sMinutes = strengthMinutes(sets)
  const sKcal = strengthKcal(bodyWeight, sMinutes)
  const effLoad = effectiveLoad(load, move.load, bodyWeight)
  const volume = trainingVolume(sets, reps, load, move.load, bodyWeight)
  const isBodyweight = move.load === 'bodyweight'

  const cKcal = cardioKcal(variant.met, bodyWeight, minutes, intensity)
  const [cLow, cHigh] = kcalRange(cKcal)
  const pace = paceLabel(minutes, distance)
  const runKcal = activity.distance && distance > 0 ? runKcalByDistance(bodyWeight, distance) : null
  const fullName = activity.variants.length > 1 ? `${activity.name}（${variant.name}）` : activity.name

  const saveStrength = () => {
    addExercise({
      date: todayKey(),
      kind: 'strength',
      name: move.name,
      minutes: sMinutes,
      kcal: sKcal,
      sets,
      reps,
      weightKg: load,
      loadMode: move.load,
    })
    setToast(`已记录 ${move.name} ${sets}×${reps}`)
    onClose()
  }

  const saveCardio = () => {
    addExercise({
      date: todayKey(),
      kind: 'cardio',
      name: fullName,
      minutes,
      kcal: cKcal,
      distanceKm: distance > 0 ? distance : undefined,
      intensity,
      met: variant.met,
    })
    setToast(`已记录 ${fullName} ${minutes} 分钟`)
    onClose()
  }

  const loadTitle = move.load === 'bodyweight' ? '负重 / 辅助' : LOAD_MODE_TITLE[move.load]

  return (
    <div>
      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'strength', label: '力量' },
          { value: 'cardio', label: '有氧' },
          { value: 'steps', label: '步数' },
        ]}
        className="mb-4"
      />

      {tab === 'strength' && (
        <div className="anim-rise space-y-4">
          <div>
            <div className="mb-1.5 text-[13px] text-muted">练哪里</div>
            <div className="flex flex-wrap gap-1.5">
              {BODY_PART_ORDER.map((p) => (
                <Pill
                  key={p}
                  active={part === p}
                  onClick={() => {
                    setPart(p)
                    const first = STRENGTH_MOVES.find((m) => m.part === p)
                    if (first) setMoveName(first.name)
                  }}
                >
                  {BODY_PART_LABEL[p]}
                </Pill>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-[13px] text-muted">动作</div>
            <div className="flex flex-wrap gap-1.5">
              {STRENGTH_MOVES.filter((m) => m.part === part).map((m) => (
                <Pill key={m.name} active={moveName === m.name} onClick={() => setMoveName(m.name)}>
                  {m.name}
                </Pill>
              ))}
            </div>
            {move.note && <p className="mt-1.5 px-1 text-[10.5px] text-muted/50">{move.note}</p>}
          </div>

          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-[13px] text-muted">{loadTitle}</span>
              {isBodyweight && (
                <span className="text-[10.5px] text-muted/60">0 = 纯自重 · 负 = 辅助 · 正 = 负重</span>
              )}
            </div>
            {isBodyweight ? (
              <div className="space-y-2">
                <NumberField value={load} onChange={setLoad} suffix="kg" min={-60} max={120} allowNegative />
                <div className="flex gap-1.5">
                  {[
                    { label: '纯自重', v: 0 },
                    { label: '辅助 15kg', v: -15 },
                    { label: '辅助 25kg', v: -25 },
                    { label: '负重 10kg', v: 10 },
                  ].map((o) => (
                    <button
                      key={o.label}
                      onClick={() => setLoad(o.v)}
                      className={`flex-1 rounded-xl border py-1.5 text-[11px] ${
                        load === o.v ? 'border-accent/50 bg-accent/10 text-accent' : 'border-line text-muted'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                <p className="px-1 text-[10.5px] text-muted/50">
                  有效负荷 = 体重 × 0.85 + 负重 = {Math.round(effLoad)} kg（容量按此计算）
                </p>
              </div>
            ) : (
              <Stepper
                value={load}
                onChange={setLoad}
                min={0}
                max={500}
                step={move.step}
                suffix={move.load === 'dumbbell' ? 'kg / 单边' : 'kg'}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="组数">
              <Stepper value={sets} onChange={setSets} min={1} max={20} suffix="组" />
            </Field>
            <Field label="每组次数">
              <Stepper value={reps} onChange={setReps} min={1} max={100} suffix="次" />
            </Field>
          </div>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] text-muted">训练容量</div>
                <div className="tabular text-[21px] font-bold">
                  {volume.toLocaleString()}
                  <span className="ml-1 text-[10px] font-normal text-muted">kg</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-muted">估算消耗</div>
                <div className="tabular text-[21px] font-bold text-accent">
                  {sKcal}
                  <span className="ml-1 text-[10px] font-normal text-muted">kcal</span>
                </div>
              </div>
            </div>
            <p className="mt-2 text-[10.5px] leading-4 text-muted/60">
              按每组约 3 分钟（含休息）估算 {sMinutes} 分钟；容量用来追踪渐进超负荷。
            </p>
          </Card>

          <Button className="w-full" onClick={saveStrength}>
            记录这次训练
          </Button>
        </div>
      )}

      {tab === 'cardio' && (
        <div className="anim-rise space-y-4">
          <div>
            <div className="mb-1.5 text-[13px] text-muted">类别</div>
            <div className="flex flex-wrap gap-1.5">
              {CARDIO_GROUP_ORDER.map((g) => (
                <Pill
                  key={g}
                  active={group === g}
                  onClick={() => {
                    setGroup(g)
                    const first = activitiesByGroup(g)[0]
                    if (first) {
                      setActivityId(first.id)
                      setVariantIdx(0)
                    }
                  }}
                >
                  {CARDIO_GROUP_LABEL[g]}
                </Pill>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-[13px] text-muted">项目</div>
            <div className="grid grid-cols-2 gap-1.5">
              {groupActivities.map((a) => {
                const active = activityId === a.id
                const perHour = kcalPerHour(a.variants[0].met, bodyWeight, intensity)
                return (
                  <button
                    key={a.id}
                    onClick={() => {
                      setActivityId(a.id)
                      setVariantIdx(0)
                    }}
                    className={`rounded-2xl border px-3 py-2 text-left transition active:scale-[0.98] ${
                      active ? 'border-accent/60 bg-accent/10' : 'border-line bg-surface2/40'
                    }`}
                  >
                    <div className={`text-[13.5px] font-medium ${active ? 'text-accent' : 'text-ink'}`}>
                      {a.name}
                    </div>
                    <div className="text-[10.5px] text-muted/60">约 {perHour} kcal / 时</div>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-[13px] text-muted">模式</div>
            <div className="flex flex-wrap gap-1.5">
              {activity.variants.map((v, i) => (
                <Pill key={v.name} active={variantIdx === i} onClick={() => setVariantIdx(i)}>
                  {v.name}
                  <span className="ml-1 text-[10px] opacity-60">{kcalPerHour(v.met, bodyWeight, intensity)}/时</span>
                </Pill>
              ))}
            </div>
            {variant.note && <p className="mt-1.5 px-1 text-[10.5px] text-muted/50">{variant.note}</p>}
          </div>

          <div>
            <div className="mb-1.5 text-[13px] text-muted">强度</div>
            <Segmented<Intensity>
              value={intensity}
              onChange={setIntensity}
              options={[
                { value: 'low', label: `${INTENSITY_LABEL.low} ×${INTENSITY_FACTOR.low}` },
                { value: 'mid', label: INTENSITY_LABEL.mid },
                { value: 'high', label: `${INTENSITY_LABEL.high} ×${INTENSITY_FACTOR.high}` },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="时长" hint="可直接输入">
              <Stepper value={minutes} onChange={setMinutes} step={5} min={1} max={600} suffix="分钟" />
            </Field>
            {activity.distance && (
              <Field label="距离" hint="可不填">
                <NumberField value={distance} onChange={setDistance} suffix="km" min={0} max={300} />
              </Field>
            )}
          </div>

          <Card>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-[11px] text-muted">
                  {fullName} · {variant.met} MET · 体重 {bodyWeight}kg
                </div>
                <div className="tabular mt-0.5 text-[26px] font-bold text-accent">
                  {cKcal}
                  <span className="ml-1 text-[11px] font-normal text-muted">kcal</span>
                </div>
                <div className="text-[10.5px] text-muted/60">
                  区间 {cLow}–{cHigh} kcal（强度与个体差异）
                </div>
              </div>
              <div className="text-right text-[10.5px] leading-4 text-muted/70">
                {pace && (
                  <>
                    配速 {pace}/km
                    <br />
                  </>
                )}
                {runKcal !== null && (
                  <>
                    按距离约 {runKcal} kcal
                    <br />
                  </>
                )}
                MET × 体重 × 时长
              </div>
            </div>
          </Card>

          <Button className="w-full" onClick={saveCardio}>
            记录这次有氧
          </Button>
        </div>
      )}

      {tab === 'steps' && (
        <div className="anim-rise space-y-4">
          <p className="text-[12px] leading-5 text-muted">
            网页版读不到手机计步传感器，先手输。步数只计入活动量与自律指数，
            <span className="text-ink">不加入可吃额度</span>，避免和活动系数重复计算。
          </p>
          <Field label="今天的步数">
            <NumberField value={stepsInput} onChange={setStepsInput} suffix="步" min={0} max={100000} />
          </Field>
          <div className="flex gap-2">
            {[3000, 6000, 8000, 10000].map((n) => (
              <button
                key={n}
                onClick={() => setStepsInput(n)}
                className="flex-1 rounded-xl border border-line bg-surface2/60 py-2 text-[12px] text-muted"
              >
                {n / 1000}k
              </button>
            ))}
          </div>
          <Card className="flex items-center justify-between">
            <span className="text-[12px] text-muted">折算消耗</span>
            <span className="tabular text-[20px] font-bold text-accent">
              {stepsKcal(bodyWeight, stepsInput)}
              <span className="ml-1 text-[11px] font-normal text-muted">kcal</span>
            </span>
          </Card>
          <Button
            className="w-full"
            onClick={() => {
              setSteps(stepsInput)
              setToast('步数已更新')
              onClose()
            }}
          >
            保存步数
          </Button>
        </div>
      )}
    </div>
  )
}
