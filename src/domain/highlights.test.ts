import { describe, expect, it } from 'vitest'
import { foodHighlights } from './highlights'

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
})
