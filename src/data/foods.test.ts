import { describe, expect, it } from 'vitest'
import { filterFoods } from './foods'

describe('食物搜索', () => {
  it('搜「包子」能搜到名字里没有"包子"的面点', () => {
    const r = filterFoods('包子', [], 'all')
    expect(r.length).toBeGreaterThan(0)
    expect(r.some((f) => /包|馒|小笼|烧麦|生煎|锅贴/.test(f.name))).toBe(true)
  })

  it('搜「玉米」能直接命中', () => {
    const r = filterFoods('玉米', [], 'all')
    expect(r.some((f) => f.name.includes('玉米'))).toBe(true)
  })

  it('直接命中排在扩展命中之前', () => {
    const r = filterFoods('苹果', [], 'all')
    expect(r.length).toBeGreaterThan(0)
    expect(r[0].name.includes('苹果')).toBe(true)
  })

  it('搜索时不受当前分类限制', () => {
    const all = filterFoods('包子', [], 'fruit')
    expect(all.length).toBeGreaterThan(0)
  })

  it('空关键词按分类过滤', () => {
    const r = filterFoods('', [], 'fruit')
    expect(r.every((f) => f.category === 'fruit')).toBe(true)
  })
})
