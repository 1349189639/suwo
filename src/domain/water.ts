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
  // 主食
  ['米饭', 65],
  ['白饭', 65],
  ['米线', 90],
  ['面条', 70],
  ['馒头', 45],
  ['面包', 40],
  ['饺子', 60],
  ['包子', 55],
  // 蔬菜
  ['西兰花', 91],
  ['花菜', 90],
  ['青菜', 94],
  ['白菜', 95],
  ['生菜', 95],
  ['菠菜', 91],
  ['油菜', 93],
  ['芹菜', 94],
  ['番茄', 94],
  ['茄子', 92],
  ['胡萝卜', 88],
  ['蘑菇', 92],
  ['木耳', 92],
  ['海带', 94],
  ['土豆', 78],
  ['南瓜', 92],
  // 水果
  ['香蕉', 75],
  ['水蜜桃', 88],
  ['葡萄', 81],
  ['猕猴桃', 84],
  ['芒果', 82],
  ['柚', 89],
  ['莓', 90],
  // 肉蛋
  ['鸡蛋', 75],
  ['牛肉', 68],
  ['猪肉', 60],
  ['鸡肉', 66],
  ['羊肉', 66],
  ['鱼', 76],
  ['虾', 78],
  ['香肠', 55],
  ['火腿', 60],
  ['培根', 55],
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

/** 常见高纤维/低纤维食物的每 100g 纤维量 */
const FIBER_BY_NAME: [string, number][] = [
  ['西兰花', 2.6],
  ['菠菜', 1.7],
  ['生菜', 1.3],
  ['油菜', 1.1],
  ['芹菜', 1.2],
  ['胡萝卜', 1.1],
  ['番茄', 0.5],
  ['黄瓜', 0.5],
  ['蘑菇', 2.1],
  ['木耳', 2.6],
  ['南瓜', 0.8],
  ['土豆', 0.7],
  ['苹果', 1.2],
  ['梨', 3.1],
  ['香蕉', 1.2],
  ['橙', 0.6],
  ['猕猴桃', 2.6],
  ['莓', 2.0],
  ['西瓜', 0.3],
  ['玉米', 2.9],
  ['红薯', 1.6],
  ['燕麦', 5.3],
  ['糙米', 3.5],
  ['全麦', 6.0],
  ['豆腐', 0.4],
]

/** 只按名字估纤维（拍照识别这类拿不到分类的场景用） */
export function guessFiberByName(name: string): number {
  if (/奶|乳|可乐|雪碧|苏打|矿泉|茶|咖啡|果汁|豆浆/.test(name)) return 0
  const hit = FIBER_BY_NAME.find(([k]) => name.includes(k))
  return hit ? hit[1] : 0
}
