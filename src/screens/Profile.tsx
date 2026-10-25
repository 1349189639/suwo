import { useRef, useState } from 'react'
import { Avatar } from '../components/Avatar'
import { Button, Card, Field, NumberInput, Pill, SectionTitle, Segmented } from '../components/ui'
import { currentAccount, logout } from '../data/auth'
import { useStore } from '../data/store'
import { downloadText, toCsv } from '../data/export'
import { exportJson } from '../data/storage'
import { latestWeight, bodyState } from '../domain/day'
import { addDays, daysBetween, todayKey } from '../domain/date'
import { defaultLook } from '../domain/look'
import {
  ACTIVITY_FACTOR,
  ACTIVITY_HINT,
  ACTIVITY_LABEL,
  calcBmr,
  calcTdee,
  dailyKcalTarget,
} from '../domain/nutrition'
import {
  GOAL_LABEL,
  type ActivityLevel,
  type Gender,
  type GoalType,
  type Profile,
} from '../domain/types'

const CURRENT_YEAR = new Date().getFullYear()

export function ProfileScreen({
  onOpenLook,
  onOpenVision,
  onLoggedOut,
}: {
  onOpenLook: () => void
  onOpenVision: () => void
  onLoggedOut: () => void
}) {
  const data = useStore((s) => s.data)
  const saveProfile = useStore((s) => s.saveProfile)
  const saveGoal = useStore((s) => s.saveGoal)
  const replaceData = useStore((s) => s.replaceData)
  const reset = useStore((s) => s.reset)
  const setToast = useStore((s) => s.setToast)

  const profile = data.profile!
  const goal = data.goal
  const weight = latestWeight(data) ?? goal?.startWeightKg ?? 70

  const [editProfile, setEditProfile] = useState(false)
  const [form, setForm] = useState<Profile>(profile)
  const [weightInput, setWeightInput] = useState(weight)
  const [editGoal, setEditGoal] = useState(false)
  const [goalType, setGoalType] = useState<GoalType>(goal?.type ?? 'cut')
  const [targetWeight, setTargetWeight] = useState(goal?.targetWeightKg ?? weight - 5)
  const [weeks, setWeeks] = useState(
    goal?.deadline ? Math.max(0, Math.round(daysBetween(todayKey(), goal.deadline) / 7)) : 0,
  )

  const fileRef = useRef<HTMLInputElement>(null)
  const tdee = Math.round(calcTdee(profile, weight))
  const bmr = Math.round(calcBmr(profile.gender, weight, profile.heightCm, profile.birthYear))
  const target = goal ? dailyKcalTarget(profile, weight, goal) : null

  const onExport = () => {
    const blob = new Blob([exportJson(data)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `塑我-备份-${todayKey()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setToast('已导出备份')
  }

  return (
    <div className="px-5 pt-5">
      <header className="mb-4">
        <div className="text-[12px] text-muted">设置</div>
        <h1 className="mt-0.5 text-[22px] font-bold">我的</h1>
      </header>

      <button
        onClick={onOpenLook}
        className="mb-4 flex w-full items-center gap-3 rounded-3xl border border-line/70 bg-surface/90 p-3 text-left backdrop-blur transition active:scale-[0.99]"
      >
        <div
          className="flex h-[72px] w-[60px] shrink-0 items-end justify-center overflow-hidden rounded-2xl"
          style={{ background: 'radial-gradient(100% 80% at 50% 10%, #2a4753 0%, #101a22 100%)' }}
        >
          <Avatar
            build={bodyState(data)?.build ?? 0.4}
            muscle={bodyState(data)?.muscle ?? 0.6}
            gender={profile.gender}
            spirit={82}
            action="idle"
            look={data.look ?? defaultLook(profile.gender)}
            size={52}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold">我的形象</div>
          <div className="mt-0.5 text-[11px] text-muted">肤色 · 发型 · 发色 · 服装</div>
        </div>
        <span className="shrink-0 rounded-full bg-accent/15 px-3 py-1.5 text-[12px] text-accent">编辑</span>
      </button>

      <button
        onClick={onOpenVision}
        className="mb-4 flex w-full items-center gap-3 rounded-3xl border border-line/70 bg-surface/90 p-3 text-left backdrop-blur transition active:scale-[0.99]"
      >
        <div className="grid h-[72px] w-[60px] shrink-0 place-items-center rounded-2xl bg-surface2/60 text-[26px]">
          📷
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold">AI 识图</div>
          <div className="mt-0.5 text-[11px] text-muted">拍照自动出菜名和热量 · 需填一次 Key</div>
        </div>
        <span className="shrink-0 rounded-full bg-surface2 px-3 py-1.5 text-[12px] text-muted">设置</span>
      </button>

      <SectionTitle
        right={
          <button
            className="text-[12px] text-accent"
            onClick={() => {
              if (editProfile) {
                saveProfile(form, weightInput)
                setToast(`已更新，当前体重 ${weightInput} kg`)
              } else {
                setForm(profile)
                setWeightInput(weight)
              }
              setEditProfile(!editProfile)
            }}
          >
            {editProfile ? '保存' : '编辑'}
          </button>
        }
      >
        身体档案
      </SectionTitle>

      <Card className="space-y-3">
        {!editProfile ? (
          <>
            <Row label="性别" value={profile.gender === 'male' ? '男' : '女'} />
            <Row label="年龄" value={`${CURRENT_YEAR - profile.birthYear} 岁`} />
            <Row label="身高" value={`${profile.heightCm} cm`} />
            <Row label="活动水平" value={`${ACTIVITY_LABEL[profile.activity]}（×${ACTIVITY_FACTOR[profile.activity]}）`} />
            <Row label="当前体重" value={`${weight} kg`} />
            <p className="text-[10.5px] leading-4 text-muted/50">
              点右上角「编辑」可以直接改体重（会记为今天的称重），也可以回首页点「称体重」。
            </p>
          </>
        ) : (
          <div className="space-y-3">
            <Segmented<Gender>
              value={form.gender}
              onChange={(g) => setForm({ ...form, gender: g })}
              options={[
                { value: 'male', label: '男' },
                { value: 'female', label: '女' },
              ]}
            />
            <div className="grid grid-cols-2 gap-2">
              <Field label="年龄">
                <NumberInput
                  value={CURRENT_YEAR - form.birthYear}
                  onChange={(v) => setForm({ ...form, birthYear: CURRENT_YEAR - v })}
                  suffix="岁"
                  min={14}
                  max={85}
                />
              </Field>
              <Field label="身高">
                <NumberInput
                  value={form.heightCm}
                  onChange={(v) => setForm({ ...form, heightCm: v })}
                  suffix="cm"
                  min={120}
                  max={230}
                />
              </Field>
            </div>
            <Field label="当前体重" hint="保存后记为今天的称重">
              <NumberInput
                value={weightInput}
                onChange={setWeightInput}
                suffix="kg"
                min={30}
                max={250}
                step={0.1}
              />
            </Field>
            <div>
              <div className="mb-1.5 text-[13px] text-muted">活动水平</div>
              <div className="space-y-1.5">
                {(Object.keys(ACTIVITY_FACTOR) as ActivityLevel[]).map((a) => (
                  <button
                    key={a}
                    onClick={() => setForm({ ...form, activity: a })}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left ${
                      form.activity === a ? 'border-accent/60 bg-accent/10' : 'border-line'
                    }`}
                  >
                    <span className="text-[13px]">{ACTIVITY_LABEL[a]}</span>
                    <span className="text-[11px] text-muted">{ACTIVITY_HINT[a]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      <div className="mt-4">
        <SectionTitle
          right={
            <button
              className="text-[12px] text-accent"
              onClick={() => {
                if (editGoal) {
                  saveGoal({
                    type: goalType,
                    startWeightKg: goal?.startWeightKg ?? weight,
                    targetWeightKg: goalType === 'maintain' ? undefined : targetWeight,
                    deadline: weeks > 0 ? addDays(todayKey(), weeks * 7) : undefined,
                    startedAt: goal?.startedAt ?? new Date().toISOString(),
                  })
                  setToast('目标已更新')
                }
                setEditGoal(!editGoal)
              }}
            >
              {editGoal ? '保存' : '编辑'}
            </button>
          }
        >
          目标
        </SectionTitle>
        <Card className="space-y-3">
          {!editGoal ? (
            <>
              <Row label="目标类型" value={goal ? GOAL_LABEL[goal.type] : '—'} />
              <Row
                label="目标体重"
                value={goal?.targetWeightKg ? `${goal.targetWeightKg} kg` : '未设置'}
              />
              <Row
                label="期限"
                value={goal?.deadline ? `${goal.deadline}（剩 ${daysBetween(todayKey(), goal.deadline)} 天）` : '不限时'}
              />
            </>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {(['cut', 'bulk', 'maintain'] as GoalType[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGoalType(g)}
                    className={`rounded-xl border py-2.5 text-[13px] ${
                      goalType === g ? 'border-accent/60 bg-accent/10 text-accent' : 'border-line text-muted'
                    }`}
                  >
                    {GOAL_LABEL[g]}
                  </button>
                ))}
              </div>
              {goalType !== 'maintain' && (
                <>
                  <Field label="目标体重">
                    <NumberInput value={targetWeight} onChange={setTargetWeight} suffix="kg" min={35} max={250} step={0.5} />
                  </Field>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {[0, 8, 12, 16, 24].map((w) => (
                      <Pill key={w} active={weeks === w} onClick={() => setWeeks(w)}>
                        {w === 0 ? '不限时' : `${w} 周`}
                      </Pill>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-4">
        <SectionTitle>每日额度怎么来的</SectionTitle>
        <Card className="space-y-2">
          <Row label="基础代谢 BMR" value={`${bmr} kcal`} />
          <Row label={`总消耗 TDEE（×${ACTIVITY_FACTOR[profile.activity]}）`} value={`${tdee} kcal`} />
          {target && (
            <>
              <Row
                label={target.delta >= 0 ? '热量缺口' : '热量盈余'}
                value={`${Math.abs(target.delta)} kcal`}
              />
              <Row label="每日目标" value={`${target.kcal} kcal`} accent />
            </>
          )}
          <p className="pt-1 text-[10.5px] leading-4 text-muted/50">
            BMR 用 Mifflin-St Jeor 公式；TDEE = BMR × 活动系数；缺口上限 750 kcal、下限保护女 1200 / 男 1500
            kcal。额外运动会加到当天额度，步数不计入额度以避免重复计算。
          </p>
        </Card>
      </div>

      <div className="mt-4">
        <SectionTitle>数据</SectionTitle>
        <Card className="space-y-2">
          <Row label="饮食记录" value={`${data.foodLogs.length} 条`} />
          <Row label="运动记录" value={`${data.exercises.length} 条`} />
          <Row label="体重记录" value={`${data.weights.length} 次`} />
          <Button
            className="mt-1 w-full"
            onClick={() => {
              downloadText(`塑我-记录-${todayKey()}.csv`, toCsv(data), 'text/csv;charset=utf-8')
              setToast('已导出 CSV')
            }}
          >
            导出记录（CSV · 手机可直接打开）
          </Button>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button variant="soft" onClick={onExport}>
              导出 JSON 备份
            </Button>
            <Button variant="soft" onClick={() => fileRef.current?.click()}>
              导入备份
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const ok = replaceData(await file.text())
              setToast(ok ? '导入成功' : '文件格式不对')
              e.target.value = ''
            }}
          />
          <p className="text-[10.5px] leading-4 text-muted/50">
            CSV 用 WPS / Numbers / Excel 打开就是表格；JSON 备份用于换设备时完整恢复。数据只存在这台设备的浏览器里，建议每周导出一次。
          </p>
        </Card>
      </div>

      <div className="mt-4 mb-6">
        <SectionTitle>账号</SectionTitle>
        <Card className="space-y-2">
          <Row label="当前账号" value={currentAccount()?.name ?? '未登录'} />
          <Button
            variant="soft"
            className="mt-1 w-full"
            onClick={() => {
              logout()
              onLoggedOut()
            }}
          >
            退出登录 / 换账号
          </Button>
        </Card>

      </div>

      <div className="mt-4 mb-6">
        <SectionTitle>关于</SectionTitle>
        <Card className="space-y-2">
          <Row label="版本" value="0.5.0 · PWA 预览版" />
          <Row label="定位" value="个人使用的热量账本" />
          <p className="pt-1 text-[10.5px] leading-4 text-muted/50">
            本应用提供热量与训练量的估算与记录，不提供医疗诊断或治疗建议。身体不适、慢性病或孕期请咨询专业医师。
            食物热量为常见做法的参考值，实际会随品牌与烹饪方式浮动。
          </p>
          <Button
            variant="danger"
            className="mt-1 w-full"
            onClick={() => {
              if (!confirm('会清空所有本机数据，确定？')) return
              reset()
            }}
          >
            清空全部数据
          </Button>
        </Card>
      </div>
    </div>
  )
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[12.5px] text-muted">{label}</span>
      <span className={`tabular text-[13px] ${accent ? 'font-semibold text-accent' : 'text-ink'}`}>
        {value}
      </span>
    </div>
  )
}
