/**
 * 文案库（v3.1）：中性观察 + 一个具体、当下做得到的小动作。
 *
 * 硬性规则（由 adviceCopy.test.ts 自动扫描）：
 *  - 不出现道德化、诊断式、称重式词汇（BANNED_WORDS）；
 *  - 每条只要求"多一个动作"，不要求做饭/称重/过水/买贵价食材；
 *  - 预算紧时只能用 extraCost === 'none' 的选项；
 *  - 单条文案**不再自我撤销**（"也不用""也没关系"那类话只在「关于评价」里说一次），
 *    靠具体信息（位置、价格、窗口）替代缓和词。
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

/** 场景模板：一条只做一个动作 */
export const ADVICE_TEMPLATES: AdviceTemplate[] = [
  {
    id: 'canteen-veg',
    text: '食堂的素菜窗口一般挨着主菜，打饭时多走两步就能带一份，通常一两块钱。',
    context: 'canteen',
    gap: 'vegetable',
    extraCost: 'low',
    source: 'R1-准则三',
  },
  {
    id: 'canteen-protein',
    text: '鸡蛋、豆腐、豆干在食堂基本天天有，加一份大多一两块。',
    context: 'canteen',
    gap: 'animalProtein',
    extraCost: 'low',
    source: 'R1-准则四',
  },
  {
    id: 'canteen-grain',
    text: '米饭窗口旁边常摆着玉米和红薯，想换的时候拿一个就行。',
    context: 'canteen',
    gap: 'wholeGrain',
    extraCost: 'none',
    source: 'R1-准则二',
  },
  {
    id: 'delivery-veg',
    text: '外卖下单页的「加购」里常有一份清炒时蔬，几块钱，主食不用动。',
    context: 'delivery',
    gap: 'vegetable',
    extraCost: 'low',
    source: 'R1-准则三',
  },
  {
    id: 'delivery-general',
    text: '备注栏可以写「饭菜分装」，多数商家会照做，不额外收费。',
    context: 'delivery',
    gap: 'general',
    extraCost: 'none',
    source: 'R4',
  },
  {
    id: 'convenience-protein',
    text: '茶叶蛋和盒装牛奶一般就摆在收银台旁边，结账时顺路带一个。',
    context: 'convenience',
    gap: 'animalProtein',
    extraCost: 'low',
    source: 'R1-准则四',
  },
  {
    id: 'convenience-fruit',
    text: '便利店门口的香蕉、当季水果按个卖，一两块钱拿一个。',
    context: 'convenience',
    gap: 'fruit',
    extraCost: 'low',
    source: 'R1-准则三',
  },
  {
    id: 'dorm-general',
    text: '宿舍抽屉里能常温放的：牛奶、香蕉、即食海苔、坚果小包。',
    context: 'dorm',
    gap: 'general',
    extraCost: 'low',
    source: 'R1-准则四',
  },
  {
    id: 'tight-general',
    text: '食堂的免费汤、打饭时多要半份青菜，都是不加钱的。',
    context: 'any',
    gap: 'general',
    extraCost: 'none',
    source: 'R6',
  },
  {
    id: 'busy-general',
    text: '考试周和加班周，餐次经常是乱的；这里只按你记下来的算。',
    context: 'any',
    gap: 'general',
    extraCost: 'none',
    source: 'R24',
  },
]

/** 周报顶部唯一一次正常化（其余退路话术只在「我的 → 关于评价」出现） */
export const NORMALIZING_LINES: string[] = [
  '全谷物、深色菜、水果、奶、鱼虾吃不够是普遍情况，不是你一个人这样。',
]

/** 周层固定声明（只在「关于评价」页出现，不进主链路） */
export const WEEK_DISCLAIMER =
  '以上只基于你记录到的餐次，未记录的不计入；这不是医学营养评估，也不等同于任何经过验证的膳食指数。'

/** 「关于评价」页统一声明 */
export const ABOUT_REVIEW =
  '这些说明只讲食物里有什么、在哪能碰到，不评价你吃得对不对；照不照做都不影响记录，也不会扣分。'

/** 预算紧 → 只出零成本选项 */
export function filterByBudget(list: AdviceTemplate[], budget: BudgetLevel): AdviceTemplate[] {
  if (budget === 'tight') return list.filter((t) => t.extraCost === 'none')
  return list
}
