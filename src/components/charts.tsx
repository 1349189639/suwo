export interface BarDatum {
  label: string
  value: number
  target?: number
  active?: boolean
}

export function WeekBars({ data, height = 120 }: { data: BarDatum[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.value, d.target ?? 0))) * 1.08
  return (
    <div className="flex items-end justify-between gap-1.5" style={{ height }}>
      {data.map((d, i) => {
        const h = d.value <= 0 ? 3 : Math.max(6, (d.value / max) * (height - 18))
        const targetTop = d.target ? (d.target / max) * (height - 18) : null
        return (
          <div key={i} className="relative flex flex-1 flex-col items-center justify-end" style={{ height }}>
            {targetTop !== null && (
              <div
                className="absolute w-full border-t border-dashed border-muted/25"
                style={{ bottom: 18 + targetTop }}
              />
            )}
            <div
              className="w-full rounded-md transition-[height] duration-500"
              style={{
                height: h,
                background: d.active
                  ? 'linear-gradient(180deg,#3ddc97,#1f9c6b)'
                  : d.value > 0
                    ? 'rgba(61,220,151,0.32)'
                    : 'rgba(255,255,255,0.07)',
              }}
            />
            <span className="mt-1.5 text-[10px] text-muted/70">{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

export interface Point {
  label: string
  value: number
}

export function Sparkline({
  points,
  height = 96,
  color = '#63a4ff',
}: {
  points: Point[]
  height?: number
  color?: string
}) {
  const W = 300
  const H = height
  const pad = 6
  if (points.length === 0) return null

  const values = points.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1

  const xy = points.map((p, i) => {
    const x = points.length === 1 ? W / 2 : pad + (i * (W - pad * 2)) / (points.length - 1)
    const y = pad + (1 - (p.value - min) / span) * (H - pad * 2 - 14)
    return { x, y }
  })

  const line = xy.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const area = `${line} L ${xy[xy.length - 1].x.toFixed(1)} ${H - 14} L ${xy[0].x.toFixed(1)} ${H - 14} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkFill)" />
      <path d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      {xy.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === xy.length - 1 ? 4 : 2.2} fill={color} />
      ))}
      <text x={pad} y={H - 2} fontSize="10" fill="rgba(255,255,255,0.35)">
        {points[0].label}
      </text>
      <text x={W - pad} y={H - 2} fontSize="10" fill="rgba(255,255,255,0.35)" textAnchor="end">
        {points[points.length - 1].label}
      </text>
    </svg>
  )
}

export function ScoreRing({
  value,
  size = 92,
  stroke = 9,
  color = '#3ddc97',
  label,
}: {
  value: number
  size?: number
  stroke?: number
  color?: string
  label?: string
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.min(1, Math.max(0, value))
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 600ms ease' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="tabular text-[22px] font-bold leading-none">{Math.round(pct * 100)}</div>
          {label && <div className="mt-0.5 text-[10px] text-muted">{label}</div>}
        </div>
      </div>
    </div>
  )
}
