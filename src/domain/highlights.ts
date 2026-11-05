/**
 * 食物的「记忆点」：普通用户记不住一串营养素，但记得住「菠菜补钾」「牛奶补钙」。
 * 命中即显示，不在库里的食物就不显示——宁缺毋滥，不要瞎编。
 */
const RULES: { match: RegExp; tags: string[] }[] = [
  // 蔬菜
  { match: /菠菜|苋菜|空心菜|芥蓝/, tags: ['钾', '叶酸'] },
  { match: /西兰花|菜花|花菜/, tags: ['维生素C', '膳食纤维'] },
  { match: /胡萝卜|南瓜|红薯|紫薯/, tags: ['β-胡萝卜素'] },
  { match: /番茄|西红柿/, tags: ['番茄红素'] },
  { match: /紫甘蓝|蓝莓|桑葚|黑莓|紫薯/, tags: ['花青素'] },
  { match: /海带|紫菜|海藻|裙带菜/, tags: ['碘'] },
  { match: /香菇|蘑菇|木耳|银耳/, tags: ['膳食纤维', '多糖'] },
  { match: /青椒|彩椒|辣椒/, tags: ['维生素C'] },
  { match: /生菜|油麦菜|白菜|娃娃菜/, tags: ['膳食纤维'] },
  { match: /韭菜|芹菜|豆角|豇豆/, tags: ['膳食纤维'] },

  // 水果
  { match: /猕猴桃|橙子|柑橘|柠檬|柚子/, tags: ['维生素C'] },
  { match: /香蕉/, tags: ['钾', '维生素B6'] },
  { match: /草莓|蓝莓|树莓|樱桃/, tags: ['花青素', '维生素C'] },
  { match: /苹果|梨/, tags: ['果胶'] },
  { match: /西瓜/, tags: ['水分足'] },

  // 蛋白
  { match: /三文鱼|沙丁鱼|秋刀鱼|青花鱼/, tags: ['Omega-3'] },
  { match: /牡蛎|生蚝|蛤|扇贝/, tags: ['锌'] },
  { match: /猪肝|鸡肝|鸭肝|鹅肝/, tags: ['铁', '维生素A'] },
  { match: /牛肉|羊肉|驴肉/, tags: ['铁', '锌'] },
  { match: /鸡胸|鸡腿|鸡里脊/, tags: ['优质蛋白'] },
  { match: /鸡蛋|鸭蛋|鹌鹑蛋/, tags: ['卵磷脂'] },
  { match: /虾|蟹|鱿鱼|墨鱼/, tags: ['优质蛋白'] },
  { match: /豆腐|豆浆|豆干|腐竹|千张/, tags: ['植物蛋白', '钙'] },
  { match: /牛奶|酸奶|奶酪|奶粉/, tags: ['钙'] },

  // 主食 / 坚果
  { match: /燕麦|荞麦|糙米|全麦|藜麦/, tags: ['膳食纤维', 'B族维生素'] },
  { match: /玉米/, tags: ['叶黄素'] },
  { match: /土豆|红薯|山药/, tags: ['钾'] },
  { match: /坚果|核桃|杏仁|腰果|开心果|碧根果|瓜子|花生|芝麻/, tags: ['镁', '维生素E'] },
  { match: /黑巧克力|可可/, tags: ['黄烷醇'] },
  { match: /绿茶|红茶|乌龙|普洱/, tags: ['茶多酚'] },
  { match: /咖啡/, tags: ['咖啡因'] },
]

/** 按名字（和标签）给出一两个记忆点 */
export function foodHighlights(name: string, tags: string[] = []): string[] {
  const haystack = `${name} ${tags.join(' ')}`
  const out: string[] = []
  for (const rule of RULES) {
    if (!rule.match.test(haystack)) continue
    for (const t of rule.tags) if (!out.includes(t)) out.push(t)
    if (out.length >= 3) break
  }
  return out.slice(0, 3)
}
