import { Sheet } from './ui'
import { useStore } from '../data/store'
import { GROUP_INFO, GROUP_LABEL } from '../domain/dietGroups'
import { pickOption } from '../domain/adviceOptions'
import type { DietGroup } from '../domain/types'

/** 食物组知识卡片：这是什么、常见来源、一个可选动作（由场景决定） */
export function HighlightSheet() {
  const highlight = useStore((s) => s.highlight)
  const hideHighlight = useStore((s) => s.hideHighlight)
  const eating = useStore((s) => s.data.eating)

  const isGroup = Boolean(highlight?.startsWith('g:'))
  const group = isGroup ? ((highlight as string).slice(2) as DietGroup) : null
  const info = group ? GROUP_INFO[group] : null
  const option =
    group && eating
      ? pickOption(group, eating)
      : null

  return (
    <Sheet
      open={Boolean(info)}
      title={group ? GROUP_LABEL[group] : ''}
      subtitle="这一组是什么，常见的有哪些"
      onClose={hideHighlight}
    >
      {info && (
        <div className="space-y-2.5 pb-2">
          <div className="rounded-2xl bg-surface2/50 p-3.5">
            <div className="text-[11px] text-muted">是什么</div>
            <div className="mt-1 text-[13px] leading-5">{info.what}</div>
          </div>
          <div className="rounded-2xl bg-surface2/50 p-3.5">
            <div className="text-[11px] text-muted">常见来源</div>
            <div className="mt-1 text-[13px] leading-5">{info.sources}</div>
          </div>
          {option && (
            <div className="rounded-2xl bg-surface2/50 p-3.5">
              <div className="text-[11px] text-muted">如果顺手，可以这样做</div>
              <div className="mt-1 text-[13px] leading-5">{option.text}</div>
            </div>
          )}
          <p className="px-1 text-[10px] leading-4 text-muted/50">
            这只是食物组的知识说明，不是对你这一餐的评价；做不做都不影响记录。
          </p>
        </div>
      )}
    </Sheet>
  )
}
