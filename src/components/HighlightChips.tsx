import { useStore } from '../data/store'
import { foodHighlights } from '../domain/highlights'
import { foodWarnings } from '../domain/warnings'
import { cx } from './ui'

/**
 * 食物标签：绿色 = 记忆点（有什么好），红色 = 提醒（要注意什么）。
 * 点任何一个都会弹同一个说明层；点击不会触发外层的「编辑这条」。
 */
export function HighlightChips({
  name,
  tags,
  fat,
  kcal,
  className,
}: {
  name: string
  tags?: string[]
  /** 这一份的脂肪克数（可选，用于判断脂肪供能比） */
  fat?: number
  /** 这一份的热量（可选） */
  kcal?: number
  className?: string
}) {
  const showHighlight = useStore((s) => s.showHighlight)
  const good = foodHighlights(name, tags)
  const warn = foodWarnings({ name, tags, fat, kcal })
  if (good.length === 0 && warn.length === 0) return null
  return (
    <div className={cx('flex flex-wrap gap-1', className)}>
      {good.map((k) => (
        <button
          key={k}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            showHighlight(k)
          }}
          className="rounded-full bg-accent/12 px-1.5 py-0.5 text-[9.5px] leading-3 text-accent/85 active:scale-95"
        >
          {k}
        </button>
      ))}
      {warn.map((k) => (
        <button
          key={k}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            showHighlight(k)
          }}
          className="rounded-full bg-[#ff6b81]/14 px-1.5 py-0.5 text-[9.5px] leading-3 text-[#ff8a9b] active:scale-95"
        >
          {k.replace('w:', '')}
        </button>
      ))}
    </div>
  )
}
