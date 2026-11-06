/**
 * 搜索别名：同一种菜的不同叫法（方言、俗名）。
 *
 * 收录原则：
 *  - **同一食材的不同叫法**才收；近似但不同的（娃娃菜≠白菜、凤梨≠菠萝）不收；
 *  - 每个正名必须在食物库里真实存在（单测会校验），否则搜出来是空的。
 */
export const ALIASES: Record<string, string[]> = {
  卷心菜: ['洋白菜', '包菜', '圆白菜', '甘蓝', '大头菜', '莲花白', '包心菜'],
  番茄: ['西红柿'],
  土豆: ['马铃薯', '洋芋', '山药蛋'],
  红薯: ['地瓜', '番薯', '山芋', '红苕'],
  玉米: ['苞米', '棒子', '玉蜀黍', '苞谷'],
  炒花生: ['花生', '长生果', '落花生'],
  猕猴桃: ['奇异果'],
  西兰花: ['绿花菜', '青花菜', '绿菜花'],
  花菜: ['菜花', '椰菜花', '白花菜'],
  香菜: ['芫荽'],
  空心菜: ['通菜', '蕹菜', '竹叶菜'],
  莴笋: ['莴苣', '青笋'],
  茄子: ['矮瓜'],
  青椒: ['柿子椒', '菜椒'],
  南瓜: ['倭瓜', '番瓜', '北瓜'],
  冬瓜: ['白瓜'],
  四季豆: ['豆角', '芸豆', '菜豆'],
  毛豆: ['枝豆'],
  豇豆: ['长豆角'],
  鸡蛋: ['鸡子'],
  带鱼: ['刀鱼'],
  鱿鱼: ['枪乌贼'],
  虾: ['白虾', '对虾'],
  面条: ['面'],
  馒头: ['馍', '馍馍'],
  油条: ['馃子'],
  北豆腐: ['豆腐', '水豆腐'],
  无糖豆浆: ['豆浆', '豆奶'],
  '米线（煮）': ['米线', '米粉'],
  原味酸奶: ['酸奶', '酸乳'],
  可乐: ['汽水', '肥宅快乐水'],
  珍珠奶茶: ['奶茶', '珍奶'],
  瓜子: ['葵花籽'],
  核桃: ['胡桃'],
}

/** 别名 → 正名（构建一次） */
const ALIAS_INDEX: Map<string, string> = (() => {
  const map = new Map<string, string>()
  for (const [canonical, list] of Object.entries(ALIASES)) {
    map.set(canonical.toLowerCase(), canonical)
    for (const alias of list) {
      const key = alias.toLowerCase()
      // 冲突检测交给单测；运行时以先登记的为准，避免崩
      if (!map.has(key)) map.set(key, canonical)
    }
  }
  return map
})()

/** 查询词是不是某个食材的别名/正名，返回正名 */
export function canonicalOf(query: string): string | null {
  const q = query.trim().toLowerCase()
  if (!q) return null
  return ALIAS_INDEX.get(q) ?? null
}

/** 该正名下所有叫法（含自身），用于把查询词扩成一组关键词 */
export function aliasWords(canonical: string): string[] {
  const list = ALIASES[canonical] ?? []
  return [canonical, ...list]
}

/** 冲突检测用：返回被登记多次的别名/正名 */
export function findAliasConflicts(): string[] {
  const seen = new Map<string, number>()
  const bump = (k: string) => seen.set(k.toLowerCase(), (seen.get(k.toLowerCase()) ?? 0) + 1)
  for (const [canonical, list] of Object.entries(ALIASES)) {
    bump(canonical)
    for (const alias of list) bump(alias)
  }
  return [...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k)
}
