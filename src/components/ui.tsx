import { useEffect, useRef, useState } from 'react'
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

type Variant = 'primary' | 'soft' | 'ghost' | 'danger' | 'outline'

export function Button({
  variant = 'primary',
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-[15px] font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-35'
  const styles: Record<Variant, string> = {
    primary: 'bg-accent text-[#052014] shadow-[0_10px_30px_-12px_rgba(61,220,151,0.8)]',
    soft: 'bg-surface2 text-ink',
    ghost: 'text-muted',
    danger: 'bg-danger/12 text-danger',
    outline: 'border border-line text-ink',
  }
  return (
    <button className={cx(base, styles[variant], className)} {...rest}>
      {children}
    </button>
  )
}

export function Card({
  children,
  className,
  style,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  return (
    <div
      className={cx('rounded-3xl border border-line/70 bg-surface/90 p-4 backdrop-blur', className)}
      style={style}
    >
      {children}
    </div>
  )
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 flex items-end justify-between px-1">
      <h3 className="text-[13px] font-semibold tracking-wide text-muted">{children}</h3>
      {right}
    </div>
  )
}

export function Sheet({
  open,
  title,
  subtitle,
  onClose,
  children,
  full,
}: {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  full?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="anim-fade absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cx(
          'anim-sheet relative flex w-full max-w-[430px] flex-col rounded-t-[30px] border-t border-line bg-surface',
          full ? 'h-[93dvh]' : 'max-h-[90dvh]',
        )}
      >
        <div className="flex shrink-0 items-start justify-between px-5 pb-2 pt-4">
          <div>
            <h2 className="text-[18px] font-semibold">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[11px] text-muted">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="grid h-8 w-8 place-items-center rounded-full bg-surface2 text-muted"
          >
            ✕
          </button>
        </div>
        <div
          className="flex-1 overflow-y-auto px-5"
          style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[13px] text-muted">{label}</span>
        {hint && <span className="text-[11px] text-muted/60">{hint}</span>}
      </div>
      {children}
    </label>
  )
}

export const inputClass =
  'w-full rounded-2xl border border-line bg-surface2/70 px-4 py-3 text-[16px] outline-none transition focus:border-accent/60'

function sanitize(raw: string, allowNegative: boolean): string {
  let s = raw.replace(allowNegative ? /[^\d.-]/g : /[^\d.]/g, '')
  if (allowNegative) {
    const neg = s.trimStart().startsWith('-')
    s = s.replace(/-/g, '')
    if (neg) s = '-' + s
  } else {
    s = s.replace(/-/g, '')
  }
  const [head, ...rest] = s.split('.')
  s = rest.length > 0 ? `${head}.${rest.join('').replace(/\./g, '')}` : head
  return s
}

/**
 * 数字输入：内部维护字符串草稿，所以可以清空、可以只输 "-"、
 * 不会被 Number('') = 0 卡住（旧版 0 删不掉的根因）。
 */
export function NumberField({
  value,
  onChange,
  suffix,
  min = 0,
  max = 99999,
  step = 0,
  allowNegative = false,
  placeholder,
  className,
  center,
  big,
  autoFocus,
}: {
  value: number
  onChange: (v: number) => void
  suffix?: string
  min?: number
  max?: number
  step?: number
  allowNegative?: boolean
  placeholder?: string
  className?: string
  center?: boolean
  big?: boolean
  autoFocus?: boolean
}) {
  const [draft, setDraft] = useState(() => String(value))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setDraft(String(value))
  }, [value, focused])

  const commit = (raw: string): number | null => {
    if (raw === '' || raw === '-' || raw === '.' || raw === '-.') return null
    const n = Number(raw)
    if (!Number.isFinite(n)) return null
    const snapped = step > 0 ? Math.round(n / step) * step : n
    return Math.min(max, Math.max(min, Math.round(snapped * 100) / 100))
  }

  return (
    <div
      className={cx(
        'flex items-center gap-2 rounded-2xl border border-line bg-surface2/70 px-4 py-3 transition focus-within:border-accent/60',
        className,
      )}
    >
      <input
        type="text"
        inputMode={allowNegative ? 'text' : 'decimal'}
        autoFocus={autoFocus}
        value={draft}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onChange={(e) => {
          const clean = sanitize(e.target.value, allowNegative)
          setDraft(clean)
          const v = commit(clean)
          if (v !== null) onChange(v)
        }}
        onBlur={() => {
          setFocused(false)
          const v = commit(draft)
          const next = v === null ? min : v
          setDraft(String(next))
          onChange(next)
        }}
        className={cx(
          'tabular w-full min-w-0 bg-transparent font-semibold outline-none placeholder:font-normal placeholder:text-muted/40',
          big ? 'text-[44px] leading-none' : 'text-[17px]',
          center && 'text-center',
        )}
      />
      {suffix && <span className="shrink-0 text-[12px] text-muted">{suffix}</span>}
    </div>
  )
}

/** 兼容旧调用点 */
export const NumberInput = NumberField

export function TextField({
  value,
  onChange,
  placeholder,
  autoFocus,
  prefix,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoFocus?: boolean
  prefix?: ReactNode
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface2/70 px-4 py-3 focus-within:border-accent/60">
      {prefix && <span className="shrink-0 text-[13px] text-muted/60">{prefix}</span>}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full min-w-0 bg-transparent text-[15px] outline-none placeholder:text-muted/45"
      />
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
  size = 'md',
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  className?: string
  size?: 'md' | 'sm'
}) {
  return (
    <div className={cx('flex gap-1 rounded-2xl bg-surface2/80 p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'flex-1 rounded-xl font-medium transition',
            size === 'sm' ? 'py-1.5 text-[12px]' : 'py-2 text-[13px]',
            value === o.value ? 'bg-accent/15 text-accent' : 'text-muted',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 9999,
  suffix,
  allowNegative = false,
}: {
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
  suffix?: string
  allowNegative?: boolean
}) {
  const lo = allowNegative ? min : Math.max(0, min)
  const [draft, setDraft] = useState(() => String(value))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setDraft(String(value))
  }, [value, focused])

  const clamp = (v: number) => Math.min(max, Math.max(lo, Math.round(v * 100) / 100))
  const commit = (raw: string): number | null => {
    if (raw === '' || raw === '-' || raw === '.' || raw === '-.') return null
    const n = Number(raw)
    if (!Number.isFinite(n)) return null
    return clamp(n)
  }

  return (
    <div className="flex items-center gap-1 rounded-2xl bg-surface2/70 px-1.5 py-1.5">
      <button
        onClick={() => onChange(clamp(value - step))}
        className="grid h-9 w-8 shrink-0 place-items-center rounded-xl bg-surface text-lg text-muted active:scale-95"
        aria-label="减少"
      >
        −
      </button>
      <div className="flex min-w-0 flex-1 items-baseline justify-center gap-0.5">
        <input
          type="text"
          inputMode="decimal"
          value={draft}
          onFocus={() => setFocused(true)}
          onChange={(e) => {
            const raw = e.target.value.replace(allowNegative ? /[^\d.-]/g : /[^\d.]/g, '')
            setDraft(raw)
            const v = commit(raw)
            if (v !== null) onChange(v)
          }}
          onBlur={() => {
            setFocused(false)
            const v = commit(draft)
            const next = v === null ? lo : v
            setDraft(String(next))
            onChange(next)
          }}
          className="tabular w-full min-w-0 bg-transparent text-center text-[17px] font-semibold outline-none"
        />
        {suffix && <span className="shrink-0 text-[11px] text-muted">{suffix}</span>}
      </div>
      <button
        onClick={() => onChange(clamp(value + step))}
        className="grid h-9 w-8 shrink-0 place-items-center rounded-xl bg-surface text-lg text-muted active:scale-95"
        aria-label="增加"
      >
        +
      </button>
    </div>
  )
}

export function ProgressBar({
  value,
  max,
  color = '#3ddc97',
  height = 8,
  track = 'rgba(255,255,255,0.07)',
}: {
  value: number
  max: number
  color?: string
  height?: number
  track?: string
}) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className="w-full overflow-hidden rounded-full" style={{ height, background: track }}>
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

export function Pill({
  children,
  active,
  onClick,
  className,
}: {
  children: ReactNode
  active?: boolean
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'shrink-0 rounded-full border px-3.5 py-2 text-[13px] transition active:scale-95',
        active ? 'border-accent/50 bg-accent/15 text-accent' : 'border-line bg-surface2/60 text-muted',
        className,
      )}
    >
      {children}
    </button>
  )
}

/** 汤姆猫式的圆形功能入口 */
export function CircleAction({
  icon,
  label,
  onClick,
  tone = 'default',
  className,
}: {
  icon: ReactNode
  label?: string
  onClick: () => void
  tone?: 'default' | 'accent'
  className?: string
}) {
  return (
    <button onClick={onClick} className={cx('flex flex-col items-center gap-1', className)}>
      <span
        className={cx(
          'grid h-[52px] w-[52px] place-items-center rounded-full border text-[21px] shadow-lg transition active:scale-90',
          tone === 'accent'
            ? 'border-accent/40 bg-accent/15 text-accent'
            : 'border-white/10 bg-white/[0.07] backdrop-blur',
        )}
      >
        {icon}
      </span>
      {label && <span className="text-[10px] text-white/60">{label}</span>}
    </button>
  )
}

export function Empty({ text }: { text: string }) {
  return <div className="py-10 text-center text-[13px] text-muted/70">{text}</div>
}

/** 长按 / 双击无用的简易动画钩子 */
export function useFlash(ms = 220): [boolean, () => void] {
  const [on, setOn] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const fire = () => {
    setOn(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setOn(false), ms)
  }
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return [on, fire]
}
