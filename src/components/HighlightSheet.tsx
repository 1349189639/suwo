import { Sheet } from './ui'
import { useStore } from '../data/store'
import { highlightInfo } from '../domain/highlights'
import { GOAL_LABEL } from '../domain/types'

/** 全局的营养记忆点说明弹层：任何地方点小标签都弹这一个 */
export function HighlightSheet() {
  const highlight = useStore((s) => s.highlight)
  const hideHighlight = useStore((s) => s.hideHighlight)
  const goalType = useStore((s) => s.data.goal?.type ?? 'maintain')
  const info = highlight ? highlightInfo(highlight) : null

  return (
    <Sheet
      open={Boolean(highlight)}
      title={highlight ?? ''}
      subtitle="它有什么用，对你现在的目标有什么帮助"
      onClose={hideHighlight}
    >
      {info && (
        <div className="space-y-2.5 pb-2">
          <div className="rounded-2xl bg-surface2/50 p-3.5">
            <div className="text-[11px] text-muted">是什么</div>
            <div className="mt-1 text-[13px] leading-5">{info.what}</div>
          </div>

          <div className="rounded-2xl bg-surface2/50 p-3.5">
            <div className="text-[11px] text-muted">含量参考</div>
            <div className="mt-1 text-[13px] leading-5">{info.amount}</div>
          </div>

          <div className="rounded-2xl border border-accent/30 bg-accent/10 p-3.5">
            <div className="text-[11px] text-accent/80">
              对你现在的目标（{GOAL_LABEL[goalType]}）
            </div>
            <div className="mt-1 text-[13px] leading-5 text-ink">{info.benefit[goalType]}</div>
          </div>
        </div>
      )}
    </Sheet>
  )
}
