import { useStore } from '../data/store'
import { foodHighlights } from '../domain/highlights'
import { cx } from './ui'

/**
 * 食物记忆点小标签：点一下就弹说明（含量 + 功能 + 对当前目标的好处）。
 * 放在任何一行记录里都能用，点击不会触发外层的「编辑这条」。
 */
export function HighlightChips({
  name,
  tags,
  className,
}: {
  name: string
  tags?: string[]
  className?: string
}) {
  const showHighlight = useStore((s) => s.showHighlight)
  const keys = foodHighlights(name, tags)
  if (keys.length === 0) return null
  return (
    <div className={cx('flex flex-wrap gap-1', className)}>
      {keys.map((k) => (
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
    </div>
  )
}
