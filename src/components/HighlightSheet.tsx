import { useState } from 'react'
import { Sheet } from './ui'
import { useStore } from '../data/store'
import { GROUP_INFO, GROUP_LABEL, GROUP_NUTRIENTS } from '../domain/dietGroups'
import { CARE_GROUP_HINT, careDef } from '../domain/care'
import { nutrientKnowledge } from '../domain/highlights'
import type { DietGroup } from '../domain/types'

/** 食物组知识卡片：是什么、常见来源、这一组里常碰到什么、这组里常有的营养素 */
export function HighlightSheet() {
  const highlight = useStore((s) => s.highlight)
  const hideHighlight = useStore((s) => s.hideHighlight)
  const cares = useStore((s) => s.data.goal?.cares ?? [])
  const [openNutrient, setOpenNutrient] = useState<string | null>(null)

  const isGroup = Boolean(highlight?.startsWith('g:'))
  const group = isGroup ? ((highlight as string).slice(2) as DietGroup) : null
  const info = group ? GROUP_INFO[group] : null
  const nutrients = group ? (GROUP_NUTRIENTS[group] ?? []) : []

  // 关联行：只在用户选过相关关注点时出现，只说关联
  const careLine = (() => {
    if (!group) return null
    for (const c of cares) {
      const def = careDef(c)
      const hint = CARE_GROUP_HINT[c]
      if (def && hint && hint.groups.includes(group)) return `你选过「${def.label}」：${hint.hint}`
    }
    return null
  })()

  const close = () => {
    setOpenNutrient(null)
    hideHighlight()
  }

  return (
    <Sheet
      open={Boolean(info)}
      title={group ? GROUP_LABEL[group] : ''}
      subtitle="这一组里有什么"
      onClose={close}
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
          <div className="rounded-2xl bg-surface2/50 p-3.5">
            <div className="text-[11px] text-muted">关于这组</div>
            <div className="mt-1 text-[13px] leading-5">{info.tip}</div>
          </div>

          {nutrients.length > 0 && (
            <div className="rounded-2xl bg-surface2/50 p-3.5">
              <div className="text-[11px] text-muted">这组里常有的</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {nutrients.map((n) => (
                  <button
                    key={n}
                    onClick={() => setOpenNutrient(openNutrient === n ? null : n)}
                    className={`rounded-full px-2 py-0.5 text-[10.5px] ${
                      openNutrient === n
                        ? 'bg-[#63a4ff]/25 text-[#a9cdff]'
                        : 'bg-[#63a4ff]/12 text-[#8fbfff]'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {openNutrient && nutrientKnowledge(openNutrient) && (
                <div className="mt-2 rounded-xl bg-surface/70 p-2.5">
                  <div className="text-[12px] leading-5">
                    {nutrientKnowledge(openNutrient)!.what}
                  </div>
                  <div className="mt-1 text-[11px] leading-4 text-muted">
                    {nutrientKnowledge(openNutrient)!.amount}
                  </div>
                  <div className="mt-1 text-[9.5px] text-muted/45">
                    常见含量参考，不是你这一份的实测值
                  </div>
                </div>
              )}
            </div>
          )}

          {careLine && (
            <div className="rounded-2xl border border-accent/25 bg-accent/8 p-3.5">
              <div className="text-[12px] leading-5 text-ink">{careLine}</div>
            </div>
          )}
        </div>
      )}
    </Sheet>
  )
}
