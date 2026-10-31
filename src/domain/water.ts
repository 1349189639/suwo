import type { FoodCategory } from './types'

const WATER_BY_CATEGORY: Partial<Record<FoodCategory, number>> = {
  fruit: 85,
  veg: 92,
  drink: 90,
}

const WATER_BY_NAME: [string, number][] = [
  ['奶', 89],
  ['乳', 89],
  ['金典', 89],
  ['特仑苏', 89],
  ['伊利', 89],
  ['蒙牛', 89],
  ['光明', 89],
  ['安慕希', 87],
  ['纯甄', 87],
  ['豆浆', 93],
  ['豆花', 92],
  ['豆腐', 85],
  ['酸奶', 85],
  ['果汁', 88],
  ['可乐', 90],
  ['雪碧', 90],
  ['苏打', 95],
  ['矿泉', 100],
  ['茶', 95],
  ['咖啡', 98],
  ['汤', 92],
  ['粥', 90],
  ['西瓜', 92],
  ['冬瓜', 96],
  ['黄瓜', 96],
  ['苹果', 85],
  ['梨', 84],
  ['橙', 87],
]

const FIBER_BY_CATEGORY: Record<string, number> = {
  staple: 1.5,
  protein: 0,
  seafood: 0,
  soy: 1.0,
  veg: 2.5,
  fruit: 2.0,
  dish: 1.5,
  street: 1.5,
  snack: 2.0,
  drink: 0,
  fastfood: 1.5,
  nut: 5.0,
}

/** 按名称/分类估算含水量（%）。名称匹配优先，便于处理"金典"这类不含通用词的品牌名。 */
export function guessWater(name: string, category?: FoodCategory): number | undefined {
  const hit = WATER_BY_NAME.find(([k]) => name.includes(k))
  if (hit) return hit[1]
  if (category) return WATER_BY_CATEGORY[category]
  return undefined
}

/** 按名称/分类估算膳食纤维（g/100g） */
export function guessFiber(name: string, category?: FoodCategory): number {
  if (/奶|乳|可乐|雪碧|苏打|矿泉|茶|咖啡|果汁|豆浆/.test(name)) return 0
  return (category && FIBER_BY_CATEGORY[category]) ?? 0
}
