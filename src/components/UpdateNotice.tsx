import { useBackToClose } from './useBackToClose'
import { useEffect, useState } from 'react'
import { Button } from './ui'
import { CHANGELOG, LATEST, type ChangelogEntry } from '../data/changelog'

const KEY = 'suwo:notice:v1'
const MAX_SHOWN = 3

interface NoticeState {
  seen: number
  dismissed?: boolean
}

function readState(): Record<string, NoticeState> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, NoticeState>
  } catch {
    return {}
  }
}

function writeState(s: Record<string, NoticeState>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* 存不进去也不影响使用 */
  }
}

/** 每次更新后自动弹，最多 3 次，可「不再显示」 */
export function UpdateNotice() {
  const [entry, setEntry] = useState<ChangelogEntry | null>(null)

  useBackToClose(() => setEntry(null), entry !== null)

  useEffect(() => {
    const st = readState()
    const cur = st[LATEST.version] ?? { seen: 0 }
    if (cur.dismissed || cur.seen >= MAX_SHOWN) return
    const t = setTimeout(() => setEntry(LATEST), 600)
    return () => clearTimeout(t)
  }, [])

  if (!entry) return null

  const close = (dismiss: boolean) => {
    const st = readState()
    const cur = st[entry.version] ?? { seen: 0 }
    st[entry.version] = { seen: cur.seen + 1, dismissed: dismiss || cur.dismissed }
    writeState(st)
    setEntry(null)
  }

  return (
    <div className="anim-fade fixed inset-0 z-50 grid place-items-center bg-black/60 px-5">
      <div className="w-full max-w-[400px] overflow-hidden rounded-3xl border border-line bg-surface shadow-2xl">
        <div className="bg-accent/10 px-5 pb-4 pt-5">
          <div className="text-[11px] text-accent">发现新版本 v{entry.version}</div>
          <div className="mt-1 text-[18px] font-bold">{entry.title}</div>
          <div className="mt-0.5 text-[11px] text-muted/60">{entry.date}</div>
        </div>
        <ul className="max-h-[46vh] space-y-1.5 overflow-y-auto px-5 py-4">
          {entry.items.map((t) => (
            <li key={t} className="flex gap-2 text-[12.5px] leading-5 text-muted">
              <span className="text-accent">·</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
        <div className="flex gap-2 px-5 pb-5">
          <Button variant="soft" className="flex-1" onClick={() => close(true)}>
            不再显示
          </Button>
          <Button className="flex-1" onClick={() => close(false)}>
            知道了
          </Button>
        </div>
      </div>
    </div>
  )
}

/** 历史更新公告 */
export function ChangelogList() {
  return (
    <div className="space-y-4 pb-4">
      {CHANGELOG.map((e) => (
        <div key={e.version} className="rounded-2xl border border-line/60 bg-surface/60 p-3.5">
          <div className="flex items-baseline justify-between">
            <span className="text-[14px] font-semibold">{e.title}</span>
            <span className="text-[10px] text-muted/50">
              v{e.version} · {e.date}
            </span>
          </div>
          <ul className="mt-2 space-y-1">
            {e.items.map((t) => (
              <li key={t} className="flex gap-2 text-[12px] leading-5 text-muted">
                <span className="text-accent/70">·</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
