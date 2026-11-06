import type { FoodCategory, GoalType } from './types'
import { estimateNutrients } from './nutrients'

/**
 * 红色提醒：这份食物在你现在的目标下「要注意什么」。
 *
 * 设计原则（v2，2026-11-06 修订）：
 *  - **只对「复合菜/加工食品」提示**。鸡蛋、牛奶、坚果、三文鱼这类天然食材，
 *    脂肪供能比天生就高（鸡蛋 59%、牛奶 50%），拿整餐的 45% 标准去卡它们是错的；
 *  - 判定看「是不是加了油/盐/糖」，而不是单纯看宏量比例；
 *  - 文案给的是**下一餐怎么改**，不是评判这一口——食堂没法控油是常态，
 *    一天的总量比单餐更重要。
 */

const b = (lose: string, cut: string, bulk: string, maintain: string): Record<GoalType, string> => ({
  lose,
  cut,
  bulk,
  maintain,
})

export interface WarningInfo {
  what: string
  amount: string
  benefit: Record<GoalType, string>
  /** 具体能做的事（食堂也做得到） */
  action: string
}

export const WARNING_INFO: Record<string, WarningInfo> = {
  'w:钠偏高': {
    what: '钠主要来自盐、酱料和加工食品，长期偏高与血压升高相关',
    amount: '成人建议每日钠 < 2000mg（约 5g 盐）；这一份按估算已占不小比例',
    benefit: b(
      '钠高容易水肿，体重数字会忽上忽下',
      '低热量期更容易钾钠失衡、觉得乏',
      '训练量大也不必刻意补盐，正常吃就够',
      '血压更稳、浮肿更少',
    ),
    action: '下一餐选清淡的，少喝汤底、少蘸酱；腌制品一周 1–2 次就够。',
  },
  'w:添加糖': {
    what: '添加糖是额外加进去的糖，不包括水果里的天然糖',
    amount: 'WHO 建议每日添加糖 < 25g，最好控制在总能量 10% 以内',
    benefit: b(
      '糖不顶饱，额度用完了还饿',
      '血糖波动大，更容易饿和馋',
      '空热量占额度，不如吃真食物',
      '控糖对牙齿和代谢都更友好',
    ),
    action: '含糖饮料换无糖茶/水；甜点放饭后吃、减半份。',
  },
  'w:油偏多': {
    what: '这道菜用了较多烹调油（红烧、干锅、油炸、爆炒一类）',
    amount: '脂肪供能超过 50% 且油量明显，属于「做法带来的油」，不是食材本身的脂肪',
    benefit: b(
      '同样热量下更容易吃超，饱腹感却不更好',
      '脂肪额度被一口吃掉，蛋白和碳水就不够了',
      '增重也要靠碳水撑训练，不能全靠油',
      '饱和脂肪建议 < 10% 能量',
    ),
    action: '食堂也能做：菜在水里过一下再吃、汤面撇掉浮油、少点红烧干锅油炸，多选蒸煮白灼。',
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
    action: '能不喝就不喝；非要喝，选低度、小杯，别配高油下酒菜。',
  },
}

const ORDER = Object.keys(WARNING_INFO)

/** 复合/加工类：只有这些才谈得上「做法带来的油盐糖」 */
const COOKED: FoodCategory[] = ['dish', 'street', 'fastfood']
/** 天然高脂食材：脂肪比例再高也不该提示（鸡蛋、坚果、奶、鱼） */
const WHOLE_FAT = /鸡蛋|鸭蛋|鹌鹑蛋|坚果|核桃|杏仁|腰果|开心果|花生|瓜子|芝麻|三文鱼|牛油果|牛奶|酸奶|奶酪/

export function foodWarnings(food: {
  name: string
  tags?: string[]
  category?: FoodCategory
  /** 这一份的脂肪克数（可选，用于算供能比） */
  fat?: number
  /** 这一份的热量（可选） */
  kcal?: number
}): string[] {
  const out: string[] = []
  const tags = food.tags ?? []
  const hay = `${food.name} ${tags.join(' ')}`
  const cat = food.category

  const est = estimateNutrients({ name: food.name, category: cat ?? 'dish', tags })
  const isCooked = (cat ? COOKED.includes(cat) : false) || /红烧|干锅|回锅|水煮肉|油炸|炸|酥|干煸|油焖/.test(hay)

  // 钠：加工/腌制类才提示
  const sodium = est.sodium ?? 0
  if (sodium >= 700) out.push('w:钠偏高')

  // 添加糖：水果天然糖不算
  const sugar = est.sugar ?? 0
  if (cat !== 'fruit' && sugar >= 8) out.push('w:添加糖')

  if (/酒|啤酒|白酒|红酒|黄酒/.test(hay)) out.push('w:酒精')

  // 油：只判「做法带来的油」，且要满足供能比高（天然高脂食材已被上面的名单排除）
  const fat = food.fat
  const kcal = food.kcal
  if (isCooked && !WHOLE_FAT.test(food.name)) {
    const share = typeof fat === 'number' && typeof kcal === 'number' && kcal > 0 ? (fat * 9) / kcal : 0
    if (share > 0.5) out.push('w:油偏多')
    else if (share === 0 && /油炸|炸|干锅|干煸|油焖/.test(hay)) out.push('w:油偏多')
  }

  return out.filter((k) => ORDER.includes(k)).slice(0, 2)
}

export function warningInfo(key: string): WarningInfo | null {
  return WARNING_INFO[key] ?? null
}
