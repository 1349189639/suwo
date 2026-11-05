import { useState } from 'react'
import { Avatar } from '../components/Avatar'
import { Button, Card, Field, NumberInput, Pill } from '../components/ui'
import { addDays, todayKey } from '../domain/date'
import { buildFromBmi, muscleFromBuild } from '../domain/avatar'
import {
  defaultLook,
  OUTFITS,
  OUTFIT_STYLES,
  styleDef,
  type Look,
  type OutfitColor,
  type OutfitStyle,
} from '../domain/look'
import {
  ACTIVITY_FACTOR,
  ACTIVITY_HINT,
  ACTIVITY_LABEL,
  bmiBand,
  calcBmi,
  calcBmr,
  calcTdee,
  dailyKcalTarget,
  estimateFinishDate,
  macroTarget,
} from '../domain/nutrition'
import type { ActivityLevel, Gender, Goal, GoalType, Profile } from '../domain/types'
import { GOAL_DESC, GOAL_FOCUS, GOAL_LABEL, GOAL_ORDER } from '../domain/types'
import { useStore } from '../data/store'

const CURRENT_YEAR = new Date().getFullYear()

export function Onboarding() {
  const saveProfile = useStore((s) => s.saveProfile)
  const saveGoal = useStore((s) => s.saveGoal)
  const setLook = useStore((s) => s.setLook)

  const [step, setStep] = useState(0)
  const [gender, setGender] = useState<Gender>('male')
  const [age, setAge] = useState(26)
  const [height, setHeight] = useState(175)
  const [weight, setWeight] = useState(72)
  const [activity, setActivity] = useState<ActivityLevel>('light')
  const [goalType, setGoalType] = useState<GoalType>('cut')
  const [targetWeight, setTargetWeight] = useState(65)
  const [weeks, setWeeks] = useState(0)
  const [style, setStyle] = useState<OutfitStyle>('sport')
  const [outfit, setOutfit] = useState<OutfitColor>('mint')

  const profile: Profile = {
    gender,
    birthYear: CURRENT_YEAR - age,
    heightCm: height,
    activity,
  }
  const tdee = Math.round(calcTdee(profile, weight))
  const bmi = calcBmi(weight, height)
  const band = bmiBand(bmi)

  const deadline = weeks > 0 ? addDays(todayKey(), weeks * 7) : undefined
  const goal: Goal = {
    type: goalType,
    startWeightKg: weight,
    targetWeightKg: goalType === 'maintain' ? undefined : targetWeight,
    deadline,
    startedAt: new Date().toISOString(),
  }
  const target = dailyKcalTarget(profile, weight, goal)
  const macros = macroTarget(goalType, weight, target.kcal, targetWeight)
  const finish = estimateFinishDate(weight, targetWeight, target.delta)

  // 形象预览：用当前体重对应的体型，选什么风格就长什么样
  const previewLook: Look = {
    ...defaultLook(gender),
    outfitStyle: style,
    outfit: styleDef(style).colors ? outfit : defaultLook(gender).outfit,
  }
  const build = buildFromBmi(bmi)
  const muscle = muscleFromBuild(build)

  const canNext =
    step === 0
      ? age >= 14 && age <= 85 && height >= 120 && height <= 230 && weight >= 30 && weight <= 250
      : step === 1
        ? true
        : step === 2
          ? true
          : goalType === 'maintain' ||
            (targetWeight >= 35 && targetWeight <= 250 && Math.abs(targetWeight - weight) >= 0.1)

  const finishSetup = () => {
    saveProfile(profile, weight)
    saveGoal(goal)
    setLook(previewLook)
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-5 pb-8 pt-10">
      <div className="mb-8">
        <div className="text-[12px] tracking-[0.2em] text-accent">塑我 · 初始设置</div>
        <h1 className="mt-2 text-[26px] font-bold leading-tight">
          {step === 0 && '先认识一下你'}
          {step === 1 && '你平时动得多吗'}
          {step === 2 && '挑一个你的形象'}
          {step === 3 && '这次想练成什么样'}
        </h1>
        <p className="mt-1.5 text-[13px] leading-5 text-muted">
          {step === 0 && '这些数据只用来计算你的热量账本，登录后会同步到云端，换手机登录同一账号就能恢复。'}
          {step === 1 && '活动水平决定你的每日总消耗（TDEE），之后可以随时修改。'}
          {step === 2 && '首页的小人就是它。选了手绘版会呼吸会眨眼，以后还会加新形象，随时能在「我的 → 我的形象」里换。'}
          {step === 3 && '减肥和减脂的口径不一样：减肥盯体重，缺口更直接；减脂盯体脂，缺口更温和、蛋白更高。'}
        </p>
      </div>

      <div className="mb-6 flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-colors"
            style={{ background: i <= step ? '#3ddc97' : 'rgba(255,255,255,0.1)' }}
          />
        ))}
      </div>

      <div className="flex-1">
        {step === 0 && (
          <div className="anim-rise space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {(['male', 'female'] as Gender[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className={`rounded-3xl border p-4 text-left transition ${
                    gender === g
                      ? 'border-accent/60 bg-accent/10'
                      : 'border-line bg-surface'
                  }`}
                >
                  <div className="text-2xl">{g === 'male' ? '♂' : '♀'}</div>
                  <div className="mt-1 text-[15px] font-semibold">{g === 'male' ? '男' : '女'}</div>
                  <div className="text-[11px] text-muted">
                    基础代谢 {Math.round(calcBmr(g, weight, height, CURRENT_YEAR - age))} kcal
                  </div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="年龄">
                <NumberInput value={age} onChange={setAge} suffix="岁" min={14} max={85} />
              </Field>
              <Field label="身高">
                <NumberInput value={height} onChange={setHeight} suffix="cm" min={120} max={230} />
              </Field>
            </div>

            <Field label="当前体重" hint="早上空腹称最准">
              <NumberInput value={weight} onChange={setWeight} suffix="kg" min={30} max={250} step={0.1} />
            </Field>

            <Card className="flex items-center justify-between">
              <div>
                <div className="text-[12px] text-muted">当前 BMI</div>
                <div className="tabular text-[22px] font-bold">{bmi.toFixed(1)}</div>
              </div>
              <div
                className="rounded-full px-3 py-1.5 text-[12px] font-semibold"
                style={{ background: `${band.color}22`, color: band.color }}
              >
                {band.label}
              </div>
            </Card>
          </div>
        )}

        {step === 1 && (
          <div className="anim-rise space-y-2.5">
            {(Object.keys(ACTIVITY_FACTOR) as ActivityLevel[]).map((a) => (
              <button
                key={a}
                onClick={() => setActivity(a)}
                className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
                  activity === a ? 'border-accent/60 bg-accent/10' : 'border-line bg-surface'
                }`}
              >
                <div>
                  <div className="text-[15px] font-semibold">{ACTIVITY_LABEL[a]}</div>
                  <div className="text-[12px] text-muted">{ACTIVITY_HINT[a]}</div>
                </div>
                <div className="tabular text-[12px] text-muted">×{ACTIVITY_FACTOR[a]}</div>
              </button>
            ))}
            <p className="px-1 pt-2 text-[11px] leading-5 text-muted/70">
              TDEE = 基础代谢 × {ACTIVITY_FACTOR[activity]} ≈ {tdee} kcal。额外训练会单独加到当天额度里。
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="anim-rise space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {OUTFIT_STYLES.filter((s) => s.selectable).map((s) => {
                const active = style === s.id
                return (
                  <button
                    key={s.id}
                    onClick={() => setStyle(s.id)}
                    className={`flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 transition ${
                      active ? 'border-accent/60 bg-accent/10' : 'border-line bg-surface2/40'
                    }`}
                  >
                    <div
                      className="grid h-[92px] w-[74px] place-items-end justify-center overflow-hidden rounded-xl"
                      style={{
                        background: 'radial-gradient(100% 80% at 50% 10%, #2a4753 0%, #101a22 100%)',
                      }}
                    >
                      <Avatar
                        build={build}
                        muscle={muscle}
                        gender={gender}
                        spirit={82}
                        action="idle"
                        look={{ ...previewLook, outfitStyle: s.id }}
                        size={78}
                      />
                    </div>
                    <div className={`text-[13px] font-medium ${active ? 'text-accent' : ''}`}>{s.label}</div>
                    <div className="text-center text-[10px] leading-3 text-muted/60">{s.hint}</div>
                  </button>
                )
              })}
            </div>

            {styleDef(style).colors && (
              <div>
                <div className="mb-1.5 text-[13px] text-muted">配色</div>
                <div className="flex gap-3 px-1">
                  {(styleDef(style).colors ?? []).map((c) => (
                    <button
                      key={c}
                      onClick={() => setOutfit(c)}
                      className="flex flex-col items-center gap-1"
                    >
                      <span
                        className={`h-9 w-9 rounded-full border-2 ${
                          outfit === c ? 'border-accent ring-2 ring-accent/30' : 'border-white/15'
                        }`}
                        style={{ background: OUTFITS[c].color }}
                      />
                      <span className={`text-[10px] ${outfit === c ? 'text-accent' : 'text-muted/70'}`}>
                        {OUTFITS[c].label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="px-1 text-[10.5px] leading-4 text-muted/50">
              体型跟体重走，选哪套都不影响计算。以后想换，去「我的 → 我的形象」。
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="anim-rise space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {GOAL_ORDER.map((g) => (
                <button
                  key={g}
                  onClick={() => setGoalType(g)}
                  className={`rounded-2xl border p-3 text-left transition ${
                    goalType === g ? 'border-accent/60 bg-accent/10' : 'border-line bg-surface'
                  }`}
                >
                  <div className="text-[15px] font-semibold">{GOAL_LABEL[g]}</div>
                  <div className="mt-1 text-[10px] leading-4 text-muted">{GOAL_DESC[g]}</div>
                  <div className="mt-1 text-[10px] leading-4 text-accent/80">{GOAL_FOCUS[g]}</div>
                </button>
              ))}
            </div>

            {goalType !== 'maintain' && (
              <>
                <Field label="目标体重">
                  <NumberInput
                    value={targetWeight}
                    onChange={setTargetWeight}
                    suffix="kg"
                    min={35}
                    max={250}
                    step={0.5}
                  />
                </Field>
                <div>
                  <div className="mb-1.5 text-[13px] text-muted">期限（可不设）</div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {[0, 8, 12, 16, 24].map((w) => (
                      <Pill key={w} active={weeks === w} onClick={() => setWeeks(w)}>
                        {w === 0 ? '不限时' : `${w} 周`}
                      </Pill>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Card>
              <div className="flex items-baseline justify-between">
                <span className="text-[12px] text-muted">每日热量目标</span>
                <span className="tabular text-[26px] font-bold text-accent">{target.kcal}</span>
              </div>
              <div className="mt-1 text-right text-[11px] text-muted">kcal / 天</div>
              <div className="my-3 h-px bg-line" />
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { k: '蛋白', v: macros.p, c: '#63a4ff' },
                  { k: '碳水', v: macros.c, c: '#f5b942' },
                  { k: '脂肪', v: macros.f, c: '#ff9f6b' },
                ].map((m) => (
                  <div key={m.k}>
                    <div className="tabular text-[16px] font-semibold" style={{ color: m.c }}>
                      {m.v}g
                    </div>
                    <div className="text-[11px] text-muted">{m.k}</div>
                  </div>
                ))}
              </div>
              {target.delta !== 0 && (
                <p className="mt-3 text-[11px] leading-5 text-muted/80">
                  {target.delta > 0 ? '每日热量缺口' : '每日热量盈余'}{' '}
                  <span className="text-ink">{Math.abs(target.delta)} kcal</span>
                  {goal.deadline
                    ? `，按 ${weeks} 周计划在 ${goal.deadline.slice(5).replace('-', '/')} 达成`
                    : finish
                      ? `，按此节奏约 ${finish.slice(5).replace('-', '/')} 达成`
                      : ''}
                  {target.gentle && '（期限宽松，几乎不用刻意节食）'}
                  {target.floored && '（已触发安全下限，不建议再压低）'}
                </p>
              )}
            </Card>
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        {step > 0 && (
          <Button variant="soft" className="px-6" onClick={() => setStep(step - 1)}>
            上一步
          </Button>
        )}
        <Button
          className="flex-1"
          disabled={!canNext}
          onClick={() => {
            if (step < 3) setStep(step + 1)
            else finishSetup()
          }}
        >
          {step < 3 ? '继续' : !canNext ? '目标体重不能和当前体重一样' : '开始记录'}
        </Button>
      </div>
    </div>
  )
}
