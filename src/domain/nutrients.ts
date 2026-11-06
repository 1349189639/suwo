import type { FoodItem } from './types'

/**
 * 钠 / 添加糖 / 维D 的**估算**。
 *
 * 食物库原本只有热量与三大宏量，没有这三个字段；逐条补录 250+ 食材的数据
 * 不现实，所以先按「明确条目 → 关键词规则 → 品类默认」三级推断，
 * 并在界面标注「估算」。数值只用于**红标签的强弱判断**，不当作营养成分表。
 */

/** 明确的条目（mg 钠 / g 添加糖 / μg 维D，均为每 100g） */
const EXPLICIT: Record<string, { sodium?: number; sugar?: number; vitd?: number }> = {
  火腿肠: { sodium: 900, sugar: 2 },
  培根: { sodium: 1100, sugar: 1 },
  午餐肉: { sodium: 950, sugar: 2 },
  咸菜: { sodium: 3000 },
  榨菜: { sodium: 4200 },
  泡菜: { sodium: 1200 },
  豆腐干: { sodium: 600 },
  豆干: { sodium: 600 },
  薯片: { sodium: 500, sugar: 2 },
  方便面: { sodium: 1800 },
  拉面: { sodium: 1200 },
  酱油: { sodium: 6000 },
  蚝油: { sodium: 4000 },
  番茄酱: { sodium: 900, sugar: 20 },
  可乐: { sugar: 10.6 },
  雪碧: { sugar: 10 },
  冰红茶: { sugar: 9.5 },
  橙汁: { sugar: 10.5 },
  奶茶: { sugar: 12 },
  蛋糕: { sugar: 25 },
  饼干: { sugar: 20, sodium: 400 },
  三文鱼: { vitd: 11 },
  沙丁鱼: { vitd: 7 },
  蛋黄: { vitd: 5 },
  全脂牛奶: { vitd: 1.3, sugar: 0 },
  奶酪: { sodium: 600, vitd: 0.6 },
}

const HIGH_SODIUM = /腌|酱|卤|咸|火腿|培根|腊|香肠|罐头|榨菜|泡菜|咸菜|方便面|汤料/
const FRIED = /炸|油条|薯条|薯片|酥|锅巴/
const SWEET = /糖|蛋糕|饼干|糕|酥|奶茶|可乐|雪碧|汽水|果汁|饮料|冰淇淋|巧克力|蜜饯/
const DAIRY = /奶|乳|奶酪/
const FISHY = /鱼|虾|蟹|贝/

/** 返回估算值（都可能是 undefined：宁缺毋滥） */
export function estimateNutrients(food: Pick<FoodItem, 'name' | 'category' | 'tags'>): {
  sodium?: number
  sugar?: number
  vitd?: number
} {
  const name = food.name
  const hay = `${name} ${food.tags.join(' ')}`

  const exact = Object.keys(EXPLICIT).find((k) => name === k || name.startsWith(k))
  if (exact) return { ...EXPLICIT[exact] }

  const out: { sodium?: number; sugar?: number; vitd?: number } = {}

  // 钠
  if (HIGH_SODIUM.test(hay)) out.sodium = 900
  else if (FRIED.test(hay)) out.sodium = 400
  else if (food.category === 'veg') out.sodium = 30
  else if (food.category === 'seafood') out.sodium = 120
  else if (food.category === 'dish' || food.category === 'street') out.sodium = 500
  else if (food.category === 'staple') out.sodium = 150
  else if (DAIRY.test(hay)) out.sodium = 60

  // 添加糖（主食与菜肴里的糖按含糖调味估）
  if (SWEET.test(hay)) out.sugar = 8
  else if (food.category === 'drink') out.sugar = 9
  else if (food.category === 'dish' || food.category === 'street') out.sugar = 3

  // 维D：只有鱼、蛋黄、强化奶有像样的量
  if (FISHY.test(hay)) out.vitd = 6
  else if (/蛋黄/.test(name)) out.vitd = 5
  else if (DAIRY.test(hay)) out.vitd = 1

  return out
}

/** 给一个食物补上估算字段（已有值优先） */
export function withEstimatedNutrients<T extends { name: string; category: string; tags: string[]; per100: Record<string, unknown> }>(
  food: T,
): T {
  const est = estimateNutrients(food as never)
  const per100 = { ...food.per100 }
  for (const [k, v] of Object.entries(est)) {
    if (v !== undefined && per100[k] === undefined) per100[k] = v
  }
  return { ...food, per100 } as T
}
