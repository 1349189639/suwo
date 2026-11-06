import type { CareTag } from './types'

/**
 * 调理（膳食关注点）。
 *
 * 入口沿用大家熟悉的中医叫法（脾胃 / 心肺 / 肝），但从底层到提示
 * 全部落到**可验证的膳食指标**上：钠、饱和脂肪、添加糖、膳食纤维、钙、铁+维C、进餐规律。
 * 这不是治疗建议，界面会常驻声明「有疾病请遵医嘱」。
 */
export interface CareDef {
  id: CareTag
  /** 入口名（习惯叫法） */
  label: string
  /** 副标题（现代口径） */
  subtitle: string
  /** 为什么这样建议（依据） */
  basis: string
  /** 加分特征 */
  prefer: RegExp
  /** 减分特征 */
  avoid: RegExp
}

export const CARE_TAGS: CareDef[] = [
  {
    id: 'digest',
    label: '脾胃',
    subtitle: '消化舒适 · 规律进餐',
    basis: '少量多餐、少油炸与辛辣、膳食纤维循序渐进，可减少腹胀与反酸；乳糖不耐者优先低乳糖乳制品。',
    prefer: /粥|面|蒸|煮|豆腐|鸡蛋|山药|南瓜|鱼/,
    avoid: /油炸|辣|烧烤|烈|肥肉/,
  },
  {
    id: 'cardio',
    label: '心肺',
    subtitle: '心血管 · 限盐控脂',
    basis: '钠 < 2000mg/日、饱和脂肪 < 10% 能量、增加不饱和脂肪与膳食纤维，是心血管风险管理的通行口径（WHO / 中国居民膳食指南 2022）。',
    prefer: /鱼|燕麦|豆|蔬菜|橄榄|坚果/,
    avoid: /腌制|加工肉|高钠|油炸|肥肉|动物油/,
  },
  {
    id: 'liver',
    label: '肝',
    subtitle: '代谢 · 限酒控糖',
    basis: '酒精无安全阈值；含糖饮料与过量果糖增加肝脏脂肪沉积风险；控制总能量与体重是脂肪肝管理的核心。',
    prefer: /蔬菜|鱼|豆|粗粮|燕麦/,
    avoid: /酒|含糖|饮料|油炸|肥肉/,
  },
  {
    id: 'bone',
    label: '骨骼',
    subtitle: '钙与维D · 足量蛋白',
    basis: '成人每日钙推荐 800mg，蛋白与负重运动同样重要；维D 主要靠日照与补充，食物来源有限。',
    prefer: /奶|酸奶|豆腐|豆干|虾皮|小鱼|芝麻/,
    avoid: /碳酸|浓茶|咖啡/,
  },
  {
    id: 'iron',
    label: '气血',
    subtitle: '铁 + 维C 同餐',
    basis: '血红素铁（红肉、动物肝）吸收率高于植物铁；与维C 同餐可提升非血红素铁吸收，茶/咖啡会抑制。',
    prefer: /牛肉|羊肉|猪肝|鸡肝|菠菜|木耳|红枣/,
    avoid: /茶|咖啡/,
  },
  {
    id: 'sugar',
    label: '血糖',
    subtitle: '低GI · 规律餐次',
    basis: '优先低升糖指数主食、保证膳食纤维 25g 以上、固定餐次，有助于餐后血糖平稳（糖尿病患者的个体目标请遵医嘱）。',
    prefer: /糙米|燕麦|荞麦|豆|蔬菜|鸡蛋|鱼/,
    avoid: /含糖|饮料|糕点|油炸|白粥|糯米/,
  },
]

export const CARE_IDS: CareTag[] = CARE_TAGS.map((c) => c.id)

export function careDef(id: CareTag): CareDef | undefined {
  return CARE_TAGS.find((c) => c.id === id)
}

/** 食物是否适合某个调理关注点：+1 偏好，-1 回避，0 无关 */
export function careScore(food: { name: string; tags: string[] }, id: CareTag): number {
  const def = careDef(id)
  if (!def) return 0
  const hay = `${food.name} ${food.tags.join(' ')}`
  if (def.avoid.test(hay)) return -1
  if (def.prefer.test(hay)) return 1
  return 0
}

/**
 * 关注点 → 相关食物组 + 一句中性知识。
 * 只说「这两者相关」，不说「你该多吃 / 达标 / 不足」。
 */
export const CARE_GROUP_HINT: Record<CareTag, { groups: import('./types').DietGroup[]; hint: string }> = {
  digest: { groups: ['wholeGrain', 'vegetable'], hint: '膳食纤维主要来自全谷和蔬菜。' },
  cardio: { groups: ['vegetable', 'aquatic', 'wholeGrain'], hint: '蔬菜、鱼虾、全谷是这一关注点里常提到的几组。' },
  liver: { groups: ['vegetable', 'aquatic', 'wholeGrain'], hint: '这一关注点常提到蔬菜、鱼虾和全谷。' },
  bone: { groups: ['dairy', 'soyNut'], hint: '钙的主要来源是奶和豆制品。' },
  iron: { groups: ['animalProtein', 'darkVegetable'], hint: '铁和维生素C 常在同一餐里一起出现。' },
  sugar: { groups: ['wholeGrain', 'vegetable'], hint: '全谷和蔬菜的纤维通常比精制米面多。' },
}