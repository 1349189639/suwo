import { useEffect, useState } from 'react'
import { Button, Card, NumberField } from '../components/ui'
import { useStore } from '../data/store'
import { smoothWeight, weightDelta } from '../domain/avatar'
import { latestWeight } from '../domain/day'
import { bmiBand, calcBmi } from '../domain/nutrition'

export function WeightSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const data = useStore((s) => s.data)
  const logWeight = useStore((s) => s.logWeight)
  const setToast = useStore((s) => s.setToast)

  const current = latestWeight(data) ?? 70
  const [value, setValue] = useState(current)

  useEffect(() => {
    if (open) setValue(Math.round(current * 10) / 10)
  }, [open, current])

  const height = data.profile?.heightCm ?? 170
  const bmi = calcBmi(value, height)
  const band = bmiBand(bmi)
  const delta = weightDelta(data.weights)
  const smooth = smoothWeight([...data.weights, { date: '9999-12-31', kg: value }])
  const target = data.goal?.targetWeightKg

  const adjust = (d: number) => setValue((v) => Math.round(Math.max(30, Math.min(250, v + d)) * 10) / 10)

  return (
    <div className="anim-rise">
      <div className="rounded-3xl bg-surface2/50 p-5 text-center">
        <div className="flex items-baseline justify-center gap-2">
          <NumberField
            value={value}
            onChange={setValue}
            suffix="kg"
            min={30}
            max={250}
            center
            big
            className="w-44 border-0 bg-transparent px-0 py-0"
          />
        </div>
        <div className="mt-3 flex justify-center gap-2">
          {[-0.5, -0.1, 0.1, 0.5].map((d) => (
            <button
              key={d}
              onClick={() => adjust(d)}
              className="rounded-xl bg-surface px-3 py-2 text-[12px] text-muted active:scale-95"
            >
              {d > 0 ? `+${d}` : d}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Card className="text-center">
          <div className="text-[11px] text-muted">BMI</div>
          <div className="tabular text-[22px] font-bold">{bmi.toFixed(1)}</div>
          <div className="mt-1 text-[12px] font-semibold" style={{ color: band.color }}>
            {band.label}
          </div>
        </Card>
        <Card className="text-center">
          <div className="text-[11px] text-muted">距目标</div>
          <div className="tabular text-[22px] font-bold">
            {target ? `${Math.abs(value - target).toFixed(1)}` : '—'}
          </div>
          <div className="mt-1 text-[12px] text-muted">{target ? 'kg' : '未设目标'}</div>
        </Card>
      </div>

      <div className="mt-3 space-y-1.5 px-1 text-[11px] text-muted/70">
        {delta !== null && (
          <p>
            比上次 {delta > 0 ? '+' : ''}
            {delta} kg
          </p>
        )}
        {smooth !== null && <p>平滑后的体重 {smooth} kg（用于驱动小人变化，避免水分波动）</p>}
        <p>建议每周称 2–3 次，固定早晨空腹、同一台秤。</p>
      </div>

      <Button
        className="mt-5 w-full"
        onClick={() => {
          logWeight(value)
          setToast('体重已记录')
          onClose()
        }}
      >
        记录体重
      </Button>
    </div>
  )
}
