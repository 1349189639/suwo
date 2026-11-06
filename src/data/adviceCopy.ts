/**
 * 文案库（v3）：中性观察 + 可执行的一个小动作。
 *
 * 硬性规则（由 adviceCopy.test.ts 自动扫描）：
 *  - 不出现道德化、诊断式、称重式词汇（BANNED_WORDS）；
 *  - 每条建议只要求"多一个动作"，不要求做饭/称重/过水/买贵价食材；
 *  - 预算紧时只能用 extraCost === 'none' 的选项。
 */
import type { BudgetLevel, DietGroup, EatingContext } from '../domain/types'

/** 禁用词：出现即单测失败 */
export const BANNED_WORDS: string[] = [
  '超标',
  '未达标',
  '失败',
  '自律',
  '克制',
  '控制',
  '垃圾食品',
  '好食物',
  '坏食物',
  '不健康',
  '干净',
  '必须',
  '别再',
  '不能',
  '暴食',
  '馋',
  '报复性',
  '欺骗餐',
  '作弊',
  '放纵',
  '选得不错',
  '搭配均衡，保持',
  '睡前 3 小时',
  '150 分钟',
  '相当于',
]

export interface AdviceTemplate {
  id: string
  text: string
  context: EatingContext | 'any'
  gap: DietGroup | 'general'
  extraCost: 'none' | 'low' | 'normal'
  /** 依据编号，便于追溯（R1 等） */
  source: string
}

/** 场景模板：一条只做一个动作，做不做都不影响这顿饭 */
export const ADVICE_TEMPLATES: AdviceTemplate[] = [
  {
    id: 'canteen-veg',
    text: '打菜时如果顺手，多拿一个素菜就行；今天窗口没有也不必特意找。',
    context: 'canteen',
    gap: 'vegetable',
    extraCost: 'low',
    source: 'R1-准则三',
  },
  {
    id: 'canteen-protein',
    text: '食堂常见的鸡蛋、豆腐、豆干都算，挑一个顺眼的加一份就好。',
    context: 'canteen',
    gap: 'animalProtein',
    extraCost: 'low',
    source: 'R1-准则四',
  },
  {
    id: 'canteen-grain',
    text: '有杂粮饭、玉米或红薯时换一次就行，没有就照常吃白米饭。',
    context: 'canteen',
    gap: 'wholeGrain',
    extraCost: 'none',
    source: 'R1-准则二',
  },
  {
    id: 'delivery-veg',
    text: '下单时勾一份青菜，或备注「饭菜分装」，不用改主食。',
    context: 'delivery',
    gap: 'vegetable',
    extraCost: 'low',
    source: 'R1-准则三',
  },
  {
    id: 'delivery-general',
    text: '备注「少油少盐」是免费选项；商家做不到也不影响这顿饭。',
    context: 'delivery',
    gap: 'general',
    extraCost: 'none',
    source: 'R4',
  },
  {
    id: 'convenience-protein',
    text: '顺手拿一个茶叶蛋或一盒牛奶，十秒就能完成，不用凑一顿完整的饭。',
    context: 'convenience',
    gap: 'animalProtein',
    extraCost: 'low',
    source: 'R1-准则四',
  },
  {
    id: 'convenience-fruit',
    text: '当季水果或一小盒切好的都行，挑便宜的就好。',
    context: 'convenience',
    gap: 'fruit',
    extraCost: 'low',
    source: 'R1-准则三',
  },
  {
    id: 'dorm-general',
    text: '宿舍能放的东西有限：牛奶、鸡蛋、香蕉、即食海苔这类不用加工的就够；不想补也完全可以。',
    context: 'dorm',
    gap: 'general',
    extraCost: 'low',
    source: 'R1-准则四',
  },
  {
    id: 'tight-general',
    text: '不花钱的做法也有：食堂免费汤、打饭时多要半份青菜、把配菜吃完整。这周预算紧的话，什么都不加也没关系。',
    context: 'any',
    gap: 'general',
    extraCost: 'none',
    source: 'R6',
  },
  {
    id: 'busy-general',
    text: '考试周、加班周三餐不规律很常见。先按你现在的节奏记着就行，不用额外补什么。',
    context: 'any',
    gap: 'general',
    extraCost: 'none',
    source: 'R24',
  },
]

/** 正常化话术（周层开头用） */
export const NORMALIZING_LINES: string[] = [
  '全国调查里，全谷物、深色菜、水果、奶、鱼虾、豆制品吃不够是普遍情况，不是你一个人这样。',
  '外卖和在外就餐多了，油盐偏重是常见结果。',
  '考试周、加班周三餐不规律很常见；记录断了也不用补回来。',
]

export const ESTIMATE_NOTE = '按记录内容与常见份量估算，不是营养成分表。'

/** 周层固定声明 */
export const WEEK_DISCLAIMER =
  '以上只基于你记录到的餐次，未记录的不计入；这不是医学营养评估，也不等同于任何经过验证的膳食指数。'

/** 预算紧 → 只出零成本选项 */
export function filterByBudget(list: AdviceTemplate[], budget: BudgetLevel): AdviceTemplate[] {
  if (budget === 'tight') return list.filter((t) => t.extraCost === 'none')
  return list
}
