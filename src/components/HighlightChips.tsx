import { useStore } from '../data/store'
import { findFoodByName } from '../data/foods'
import { GROUP_INFO, inferGroups } from '../domain/dietGroups'
import type { DietGroup, FoodCategory } from '../domain/types'
import { cx } from './ui'

/**
 * 中性信息标签（v3）：只说明「这条记录里有什么食物组」。
 * 不再用红=坏 / 绿=好，也不对单条食物做质量判定；点击展开知识卡片。
 */
export function HighlightChips({
  name,
  tags,
  category,
  className,
}: {
  name: string
  tags?: string[]
  /** v3 起不再参与判定，保留是为了兼容旧调用 */
  fat?: number
  kcal?: number
  category?: FoodCategory
  className?: string
}) {
  const showHighlight = useStore((s) => s.showHighlight)
  const known = findFoodByName(name)
  const groups: DietGroup[] =
    known?.groups && known.groups.length > 0
      ? known.groups
      : inferGroups(name, known?.category ?? category ?? 'dish', tags ?? known?.tags ?? [])

  if (groups.length === 0) return null
  return (
    <div className={cx('flex flex-wrap gap-1', className)}>
      {groups.slice(0, 3).map((g) => (
        <button
          key={g}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            showHighlight('g:' + g)
          }}
          className="rounded-full bg-[#63a4ff]/12 px-1.5 py-0.5 text-[9.5px] leading-3 text-[#8fbfff] active:scale-95"
        >
          {GROUP_INFO[g] ? gLabel(g) : g}
        </button>
      ))}
    </div>
  )
}

function gLabel(g: DietGroup): string {
  const map: Record<string, string> = {
    grain: '主食',
    wholeGrain: '全谷薯',
    vegetable: '蔬菜',
    darkVegetable: '深色菜',
    fruit: '水果',
    animalProtein: '肉蛋',
    aquatic: '鱼虾',
    dairy: '奶',
    soyNut: '豆坚果',
    sugaryDrink: '含糖饮料',
    ultraProcessed: '深加工',
  }
  return map[g] ?? g
}
