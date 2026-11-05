import type { GoalType } from './types'

/**
 * 食物的「记忆点」：普通用户记不住一串营养素，但记得住「菠菜补钾」「牛奶补钙」。
 * 每个记忆点都带一句功能说明 + 对你当前目标的好处，点一下就能看到。
 */
export interface HighlightInfo {
  /** 它是什么 / 干什么用 */
  what: string
  /** 含量参考（每 100g 大致量级） */
  amount: string
  /** 对你当前目标的好处 */
  benefit: Record<GoalType, string>
}

const b = (lose: string, cut: string, bulk: string, maintain: string): Record<GoalType, string> => ({
  lose,
  cut,
  bulk,
  maintain,
})

export const HIGHLIGHT_INFO: Record<string, HighlightInfo> = {
  钾: {
    what: '维持电解质平衡，管肌肉收缩和神经传导',
    amount: '蔬菜、薯类、香蕉每 100g 约 300–500mg',
    benefit: b(
      '减少水肿，体重掉得更真实',
      '保肌期不容易抽筋、乏力',
      '支撑大重量训练的肌肉发力',
      '有助血压稳定',
    ),
  },
  钙: {
    what: '骨骼牙齿的主要成分，也参与肌肉收缩',
    amount: '牛奶每 100ml 约 100–120mg',
    benefit: b(
      '减重时骨量容易流失，钙是保底',
      '低热量期更要护住骨密度',
      '力量训练对骨骼负荷大，钙要跟上',
      '长期维持骨密度',
    ),
  },
  铁: {
    what: '造血原料，负责把氧气运到肌肉',
    amount: '红肉每 100g 约 2–3mg，动物肝脏更高',
    benefit: b(
      '减重期容易缺铁、乏力，补上更有劲',
      '训练耐力不掉',
      '增肌期血氧供应足',
      '不容易疲劳',
    ),
  },
  锌: {
    what: '参与激素合成和免疫，和睾酮水平有关',
    amount: '生蚝、贝类、红肉每 100g 约 3–10mg',
    benefit: b(
      '减重期代谢不塌',
      '保肌、少生病',
      '训练恢复和激素环境',
      '免疫稳定',
    ),
  },
  镁: {
    what: '参与 300 多种酶反应，管肌肉放松和睡眠',
    amount: '坚果、全谷物每 100g 约 100–250mg',
    benefit: b(
      '睡得好，第二天不容易暴食',
      '减少抽筋、改善睡眠',
      '训练后恢复更快',
      '情绪和睡眠更稳',
    ),
  },
  维生素C: {
    what: '抗氧化，帮铁吸收，参与胶原合成',
    amount: '猕猴桃、彩椒每 100g 约 60–130mg',
    benefit: b(
      '抗氧化，减重期免疫别垮',
      '帮助铁吸收，少掉头发',
      '训练后恢复',
      '增强免疫',
    ),
  },
  维生素A: {
    what: '视力、皮肤黏膜和免疫都靠它',
    amount: '胡萝卜、南瓜、动物肝脏含量高',
    benefit: b(
      '减重期皮肤别垮',
      '低热量期护住皮肤和免疫',
      '免疫不掉',
      '视力和皮肤',
    ),
  },
  维生素E: {
    what: '脂溶性抗氧化剂，保护细胞膜',
    amount: '坚果、植物油含量高',
    benefit: b('抗氧化，减脂更"干净"', '抗氧化', '训练后细胞修复', '抗氧化'),
  },
  B族维生素: {
    what: '把食物变成能量的辅酶',
    amount: '全谷物、瘦肉、蛋含量高',
    benefit: b(
      '代谢不掉速，少吃也有精神',
      '低热量时最容易缺，补上更有精神',
      '高热量摄入需要它们参与代谢',
      '精力更稳',
    ),
  },
  叶酸: {
    what: '参与红细胞生成和 DNA 合成',
    amount: '深绿叶菜每 100g 约 100–200μg',
    benefit: b('造血原料，脸色更好', '造血原料', '造血原料', '心血管健康'),
  },
  膳食纤维: {
    what: '增加饱腹、稳定血糖、喂养肠道菌',
    amount: '蔬菜、全谷物每 100g 约 2–6g',
    benefit: b(
      '最直接：更容易吃饱，自然少吃',
      '饱腹感强，缺口更好坚持',
      '增重也要肠胃通畅',
      '血糖稳、肠道好',
    ),
  },
  优质蛋白: {
    what: '肌肉修复与合成的原料',
    amount: '肉蛋奶豆每 100g 约 10–30g',
    benefit: b(
      '减重不掉肌肉，基础代谢稳',
      '保肌减脂的核心指标',
      '增肌必需',
      '维持肌肉量',
    ),
  },
  'Omega-3': {
    what: '抗炎的必需脂肪酸',
    amount: '深海鱼每 100g 约 1–2g',
    benefit: b(
      '减少炎症，代谢更顺',
      '关节和恢复',
      '训练恢复、护关节',
      '心血管',
    ),
  },
  碘: {
    what: '合成甲状腺激素，管基础代谢',
    amount: '海带、紫菜含量极高',
    benefit: b(
      '代谢别掉链子',
      '代谢别掉链子',
      '代谢别掉链子',
      '甲状腺健康',
    ),
  },
  抗氧化: {
    what: '花青素、番茄红素等，清除自由基',
    amount: '深色蔬果里最多',
    benefit: b('抗氧化，减脂更"干净"', '抗氧化', '训练后恢复', '抗氧化、抗老化'),
  },
  咖啡因: {
    what: '提神，提升运动表现',
    amount: '一杯咖啡约 80–120mg',
    benefit: b(
      '训练前提神，能多消耗一点',
      '训练表现更好',
      '撑住训练强度',
      '提神，但别影响睡眠',
    ),
  },
}

const RULES: { match: RegExp; keys: string[] }[] = [
  // 蔬菜
  { match: /菠菜|苋菜|空心菜|芥蓝/, keys: ['钾', '叶酸'] },
  { match: /西兰花|菜花|花菜/, keys: ['维生素C', '膳食纤维'] },
  { match: /胡萝卜|南瓜|红薯|紫薯/, keys: ['维生素A'] },
  { match: /番茄|西红柿/, keys: ['抗氧化'] },
  { match: /紫甘蓝|蓝莓|桑葚|黑莓|樱桃/, keys: ['抗氧化'] },
  { match: /海带|紫菜|海藻|裙带菜/, keys: ['碘'] },
  { match: /香菇|蘑菇|木耳|银耳/, keys: ['膳食纤维'] },
  { match: /青椒|彩椒|辣椒/, keys: ['维生素C'] },
  { match: /生菜|油麦菜|白菜|娃娃菜|韭菜|芹菜|豆角|豇豆/, keys: ['膳食纤维'] },

  // 水果
  { match: /猕猴桃|橙子|柑橘|柠檬|柚子/, keys: ['维生素C'] },
  { match: /香蕉/, keys: ['钾'] },
  { match: /草莓|蓝莓|树莓|樱桃/, keys: ['抗氧化', '维生素C'] },
  { match: /苹果|梨/, keys: ['膳食纤维'] },

  // 蛋白
  { match: /三文鱼|沙丁鱼|秋刀鱼|青花鱼/, keys: ['Omega-3'] },
  { match: /牡蛎|生蚝|蛤|扇贝/, keys: ['锌'] },
  { match: /猪肝|鸡肝|鸭肝|鹅肝/, keys: ['铁', '维生素A'] },
  { match: /牛肉|羊肉|驴肉/, keys: ['铁', '锌'] },
  { match: /鸡胸|鸡腿|鸡里脊/, keys: ['优质蛋白'] },
  { match: /鸡蛋|鸭蛋|鹌鹑蛋/, keys: ['优质蛋白'] },
  { match: /虾|蟹|鱿鱼|墨鱼/, keys: ['优质蛋白'] },
  { match: /豆腐|豆浆|豆干|腐竹|千张/, keys: ['优质蛋白', '钙'] },
  { match: /牛奶|酸奶|奶酪|奶粉/, keys: ['钙'] },

  // 主食 / 坚果 / 饮品
  { match: /燕麦|荞麦|糙米|全麦|藜麦/, keys: ['膳食纤维', 'B族维生素'] },
  { match: /玉米/, keys: ['膳食纤维'] },
  { match: /土豆|红薯|山药/, keys: ['钾'] },
  { match: /坚果|核桃|杏仁|腰果|开心果|碧根果|瓜子|花生|芝麻/, keys: ['镁', '维生素E'] },
  { match: /黑巧克力|可可/, keys: ['抗氧化'] },
  { match: /绿茶|红茶|乌龙|普洱/, keys: ['抗氧化'] },
  { match: /咖啡/, keys: ['咖啡因'] },
]

/** 按名字（和标签）给出一两个记忆点 */
export function foodHighlights(name: string, tags: string[] = []): string[] {
  const haystack = `${name} ${tags.join(' ')}`
  const out: string[] = []
  for (const rule of RULES) {
    if (!rule.match.test(haystack)) continue
    for (const k of rule.keys) if (!out.includes(k) && HIGHLIGHT_INFO[k]) out.push(k)
    if (out.length >= 3) break
  }
  return out.slice(0, 3)
}

export function highlightInfo(key: string): HighlightInfo | null {
  return HIGHLIGHT_INFO[key] ?? null
}
