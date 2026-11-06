import type { DietGroup, FoodCategory, FoodLog, FoodItem, LogSource } from './types'

/**
 * 食物组映射（对齐《中国居民膳食指南(2022)》八准则）。
 *
 * 判定优先级：FoodLog.groups 快照 → FoodItem.groups → 规则推断 → unknown（空数组）。
 * **unknown 不产生任何观察**，也不补 0：宁可少说，不猜。
 */

const DARK_VEG = /西兰花|菠菜|胡萝卜|南瓜|番茄|西红柿|紫甘蓝|茄子|青椒|韭菜|空心菜|油菜|芹菜|莴笋|豆角|豇豆/
const WHOLE_GRAIN = /糙米|燕麦|荞麦|全麦|玉米|红薯|紫薯|土豆|山药|藜麦|杂粮|全谷/
const AQUATIC = /鱼|虾|蟹|贝|鱿鱼|海参|蛤|牡蛎|生蚝/
const DAIRY = /牛奶|酸奶|奶酪|奶粉|乳/
const SOY_NUT = /豆腐|豆浆|豆干|腐竹|千张|黄豆|毛豆|坚果|核桃|杏仁|腰果|开心果|瓜子|花生|芝麻/
const SUGARY = /可乐|雪碧|奶茶|果汁|汽水|含糖|饮料|冰红茶|酸梅汤/
const ULTRA = /火腿肠|培根|午餐肉|香肠|方便面|薯片|薯条|炸鸡|汉堡|辣条|罐头/

export function inferGroups(name: string, category: FoodCategory, tags: string[] = []): DietGroup[] {
  const hay = `${name} ${tags.join(' ')}`
  const out: DietGroup[] = []

  if (category === 'staple') out.push('grain')
  if (category === 'staple' && WHOLE_GRAIN.test(hay)) out.push('wholeGrain')
  if (category === 'veg') {
    out.push('vegetable')
    if (DARK_VEG.test(hay)) out.push('darkVegetable')
  }
  if (category === 'fruit') out.push('fruit')
  if (category === 'protein' || category === 'seafood' || category === 'dish' || category === 'fastfood') {
    out.push('animalProtein')
  }
  if (AQUATIC.test(hay) || category === 'seafood') out.push('aquatic')
  if (DAIRY.test(hay) || category === 'soy' && /奶/.test(hay)) out.push('dairy')
  if (SOY_NUT.test(hay) || category === 'soy' || category === 'nut') out.push('soyNut')
  if (category === 'drink' && SUGARY.test(hay)) out.push('sugaryDrink')
  if (ULTRA.test(hay) || /油炸/.test(hay)) out.push('ultraProcessed')

  return [...new Set(out)]
}

/** 单条记录实际能吃到的食物组；来源不可信（ai/custom）时同样只信已有快照 */
export function resolveGroups(
  log: Pick<FoodLog, 'groups' | 'source' | 'name' | 'grams'>,
  lookup?: (name: string) => FoodItem | undefined,
): DietGroup[] {
  if (log.groups && log.groups.length > 0) return log.groups
  const source: LogSource = log.source ?? 'manual'
  if (source === 'ai' || source === 'custom') return []
  const item = lookup?.(log.name)
  if (!item) return []
  return item.groups ?? inferGroups(item.name, item.category, item.tags)
}

export const GROUP_LABEL: Record<DietGroup, string> = {
  grain: '主食',
  wholeGrain: '全谷/薯类',
  vegetable: '蔬菜',
  darkVegetable: '深色菜',
  fruit: '水果',
  animalProtein: '肉蛋',
  aquatic: '鱼虾',
  dairy: '奶',
  soyNut: '豆/坚果',
  sugaryDrink: '含糖饮料',
  ultraProcessed: '深加工',
}

/** 知识卡片：是什么、常见来源、这一组里常碰到什么（中性描述，不做好坏评判） */
export interface GroupInfo {
  what: string
  sources: string
  tip: string
}

export const GROUP_INFO: Record<DietGroup, GroupInfo> = {
  grain: { what: '提供碳水的谷薯主食，是主要能量来源', sources: '米饭、面条、馒头、红薯、玉米', tip: '米饭、面条、馒头都算这一组，食堂和外卖里最常碰到。' },
  wholeGrain: { what: '保留麸皮或胚芽的谷物与薯类，纤维比精制米面多', sources: '糙米、燕麦、全麦面包、红薯、玉米', tip: '玉米、红薯、燕麦、糙米，早餐摊和米饭窗口旁边常有。' },
  vegetable: { what: '提供膳食纤维、钾和多种维生素', sources: '叶菜、瓜茄类、菌菇、海藻', tip: '叶菜、瓜茄、菌菇都算，食堂素菜窗口一般一两块钱一份。' },
  darkVegetable: { what: '深绿色、红橙色或紫黑色的蔬菜，胡萝卜素通常更高', sources: '西兰花、菠菜、胡萝卜、番茄、紫甘蓝', tip: '西兰花、菠菜、胡萝卜、番茄，颜色越深通常胡萝卜素越多。' },
  fruit: { what: '提供维生素 C、钾和天然糖分', sources: '苹果、橙子、香蕉、猕猴桃、莓类', tip: '香蕉、橘子按个卖，便利店和水果摊都能单买。' },
  animalProtein: { what: '提供优质蛋白与铁、锌、维生素 B12', sources: '鸡蛋、瘦肉、禽肉、鱼虾', tip: '鸡蛋、瘦肉、鱼虾、豆腐，食堂里最常见的是鸡蛋和豆制品。' },
  aquatic: { what: '鱼虾类，提供优质蛋白与 n-3 脂肪酸', sources: '鲈鱼、带鱼、三文鱼、虾、贝类', tip: '清蒸鱼、虾仁套餐、贝类汤都算这一组。' },
  dairy: { what: '钙和优质蛋白的主要来源', sources: '牛奶、酸奶、奶酪', tip: '牛奶、酸奶、奶酪，便利店一盒通常两三块。' },
  soyNut: { what: '植物蛋白、钙与不饱和脂肪', sources: '豆腐、豆浆、豆干、核桃、花生', tip: '豆腐、豆浆、豆干、坚果小包，宿舍里也能常温放。' },
  sugaryDrink: { what: '含添加糖的饮料，能量密度高、饱腹感弱', sources: '可乐、奶茶、果汁饮料', tip: '可乐、奶茶、果汁饮料都算这一组，标签上的「碳水化合物」能看到糖。' },
  ultraProcessed: { what: '深加工或油炸食品，油盐糖通常较高', sources: '火腿肠、培根、薯片、方便面、炸物', tip: '火腿肠、薯片、方便面、炸物，配料表通常比较长。' },
}

/**
 * 这一组里常有的营养素（只讲「有什么」，不表示用户缺不缺、不评价吃得好不好）。
 * key 必须能在 HIGHLIGHT_INFO 里查到，单测会校验。
 */
export const GROUP_NUTRIENTS: Record<DietGroup, string[]> = {
  grain: ['碳水', 'B族维生素'],
  wholeGrain: ['膳食纤维', 'B族维生素', '镁'],
  vegetable: ['膳食纤维', '钾', '叶酸'],
  darkVegetable: ['维生素A', '叶酸', '维生素C'],
  fruit: ['维生素C', '钾'],
  animalProtein: ['优质蛋白', '铁', '锌', '维生素B12'],
  aquatic: ['优质蛋白', 'Omega-3', '碘'],
  dairy: ['钙', '优质蛋白'],
  soyNut: ['钙', '优质蛋白', '维生素E'],
  sugaryDrink: ['添加糖'],
  ultraProcessed: ['钠', '饱和脂肪'],
}