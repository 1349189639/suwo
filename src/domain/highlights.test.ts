import { describe, expect, it } from 'vitest'
import { HIGHLIGHT_INFO, foodHighlights, highlightInfo } from './highlights'

describe('食物记忆点', () => {
  it('菠菜显示钾', () => {
    expect(foodHighlights('菠菜')).toContain('钾')
  })

  it('牛奶显示钙、三文鱼显示 Omega-3', () => {
    expect(foodHighlights('全脂牛奶')).toContain('钙')
    expect(foodHighlights('三文鱼')).toContain('Omega-3')
  })

  it('标签也参与匹配（扫码商品常把品牌放标签里）', () => {
    expect(foodHighlights('某品牌饮品', ['酸奶'])).toContain('钙')
  })

  it('认不出来的食物不硬编，返回空', () => {
    expect(foodHighlights('神秘料理')).toEqual([])
  })

  it('最多给三个，避免糊一整屏', () => {
    expect(foodHighlights('菠菜').length).toBeLessThanOrEqual(3)
  })

  it('每个记忆点都写全了是什么与含量参考', () => {
    for (const [key, info] of Object.entries(HIGHLIGHT_INFO)) {
      expect(info.what.length, key).toBeGreaterThan(4)
      expect(info.amount.length, key).toBeGreaterThan(4)
      // v3.1：中性知识点（碳水 / 钠 / 添加糖等）不带目标绑定说明，有则必须写全四类
      if (!info.benefit) continue
      for (const g of ['lose', 'cut', 'bulk', 'maintain'] as const) {
        expect(info.benefit[g].length, `${key}/${g}`).toBeGreaterThan(2)
      }
    }
  })

  it('标签只返回有说明的记忆点，点开不会空弹窗', () => {
    for (const n of ['菠菜', '全脂牛奶', '三文鱼', '咖啡', '海带', '核桃', '鸡蛋']) {
      for (const k of foodHighlights(n)) expect(highlightInfo(k), `${n}/${k}`).not.toBeNull()
    }
  })
})
