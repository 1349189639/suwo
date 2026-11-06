import { Sheet } from './ui'
import { useStore } from '../data/store'
import { highlightInfo } from '../domain/highlights'
import { warningInfo } from '../domain/warnings'
import { GOAL_LABEL } from '../domain/types'

/** 全局标签说明弹层：绿标签（营养记忆点）与红标签（提醒）共用这一个 */
export function HighlightSheet() {
  const highlight = useStore((s) => s.highlight)
  const hideHighlight = useStore((s) => s.hideHighlight)
  const goalType = useStore((s) => s.data.goal?.type ?? 'maintain')

  const isWarn = Boolean(highlight?.startsWith('w:'))
  const label = highlight ? (isWarn ? highlight.slice(2) : highlight) : ''
  const info = highlight ? (isWarn ? warningInfo(highlight) : highlightInfo(highlight)) : null

  return (
    <Sheet
      open={Boolean(highlight)}
      title={label}
      subtitle={isWarn ? '这份食物需要注意的地方' : '它有什么用，对你现在的目标有什么帮助'}
      onClose={hideHighlight}
    >
      {info && (
        <div className="space-y-2.5 pb-2">
          <div className="rounded-2xl bg-surface2/50 p-3.5">
            <div className="text-[11px] text-muted">是什么</div>
            <div className="mt-1 text-[13px] leading-5">{info.what}</div>
          </div>

          <div className="rounded-2xl bg-surface2/50 p-3.5">
            <div className="text-[11px] text-muted">{isWarn ? '参考上限' : '含量参考'}</div>
            <div className="mt-1 text-[13px] leading-5">{info.amount}</div>
          </div>

          <div
            className={
              'rounded-2xl border p-3.5 ' +
              (isWarn ? 'border-[#ff6b81]/30 bg-[#ff6b81]/10' : 'border-accent/30 bg-accent/10')
            }
          >
            <div className={'text-[11px] ' + (isWarn ? 'text-[#ff8a9b]' : 'text-accent/80')}>
              对你现在的目标（{GOAL_LABEL[goalType]}）
            </div>
            <div className="mt-1 text-[13px] leading-5 text-ink">{info.benefit[goalType]}</div>
          </div>

          {isWarn && (
            <p className="px-1 text-[10px] leading-4 text-muted/50">
              钠、添加糖为估算值，用于提示强弱，不等于包装上的营养成分表。有明确疾病请遵医嘱。
            </p>
          )}
        </div>
      )}
    </Sheet>
  )
}
