import type { GoalType } from './types'
import { estimateNutrients } from './nutrients'

/**
 * 红色提醒：这食物在你现在的目标下「要注意什么」。
 *
 * 和绿色记忆点（highlights）是一套机制，只是配色与口径不同：
 * 绿色 = 它有什么好；红色 = 它有什么需要克制。
 * 规则全部是可复现的阈值/特征，不做模型臆断。
 */
export interface WarningInfo {
  what: string
  amount: string
  benefit: Record<GoalType, string>
}

const b = (lose: string, cut: string, bulk: string, maintain: string): Record<GoalType, string> => ({
  lose,
  cut,
  bulk,
  maintain,
})

export const WARNING_INFO: Record<string, WarningInfo> = {
  'w:钠偏高': {
    what: '钠主要来自盐和加工食品，长期偏高与血压升高相关',
    amount: '成人建议每日钠 < 2000mg（约 5g 盐）；这一份按估算已占不小比例',
    benefit: b(
      '减重期水肿会更明显，体重波动也更难看懂',
      '低热量期更容易缺钾、钠比例失衡',
      '训练量大时也不用刻意补盐，正常吃就够',
      '血压更稳，浮肿更少',
    ),
  },
  'w:添加糖': {
    what: '添加糖是额外加进去的糖，不含水果里的天然糖',
    amount: 'WHO 建议每日添加糖 < 25g，最好控制在总能量 10% 以内',
    benefit: b(
      '糖不顶饱，容易在额度用完后还饿',
      '减脂期血糖波动大，更容易饿和馋',
      '空热量占额度，不如吃真食物',
      '控糖对牙齿和代谢都更友好',
    ),
  },
  'w:油脂偏高': {
    what: '脂肪供能占比偏高，油炸与肥肉以饱和脂肪为主',
    amount: '这一份脂肪供能超过 45%（建议 20%–30%）',
    benefit: b(
      '同样热量下更容易超标，且饱腹感并不更好',
      '减脂期脂肪额度被快速吃掉，蛋白和碳水就不够了',
      '增重也需要碳水支撑训练，不能全靠脂肪',
      '饱和脂肪建议 < 10% 能量',
    ),
  },
  'w:酒精': {
    what: '酒精是空热量，且没有安全摄入阈值',
    amount: '每克酒精约 7kcal，一罐啤酒约 150kcal',
    benefit: b(
      '酒精会抑制脂肪氧化，减重期尤其不划算',
      '影响恢复与睡眠，减脂更吃力',
      '影响蛋白合成与恢复',
      '对肝脏与睡眠都不友好',
    ),
  },
}

const ORDER = Object.keys(WARNING_INFO)

/** 判断一份食物该亮哪些红标签（最多 2 个，避免刷屏） */
export function foodWarnings(food: {
  name: string
  tags?: string[]
  /** 这一份的脂肪克数（可选，用于算供能比） */
  fat?: number
  /** 这一份的热量（可选） */
  kcal?: number
}): string[] {
  const out: string[] = []
  const tags = food.tags ?? []
  const hay = `${food.name} ${tags.join(' ')}`
  const est = estimateNutrients({ name: food.name, category: 'dish', tags })

  const sodium = est.sodium ?? 0
  const sugar = est.sugar ?? 0

  if (sodium >= 600) out.push('w:钠偏高')
  if (sugar >= 8) out.push('w:添加糖')
  if (/酒|啤酒|白酒|红酒|黄酒/.test(hay)) out.push('w:酒精')

  const fat = food.fat
  const kcal = food.kcal
  if (typeof fat === 'number' && typeof kcal === 'number' && kcal > 0) {
    const share = (fat * 9) / kcal
    if (share > 0.45 && !out.includes('w:油脂偏高')) out.push('w:油脂偏高')
  } else if (/油炸|炸|酥|肥肉|五花|猪油/.test(hay)) {
    out.push('w:油脂偏高')
  }

  return out.filter((k) => ORDER.includes(k)).slice(0, 2)
}

export function warningInfo(key: string): WarningInfo | null {
  return WARNING_INFO[key] ?? null
}
