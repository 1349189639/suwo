import { describe, expect, it } from 'vitest'
import { filterFoods, splitPickerResults } from './foods'

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

  it('停在自定义分类时，搜索仍能搜到内置食物', () => {
    const r = filterFoods('玉米', [], 'custom')
    expect(r.some((f) => f.name.includes('玉米'))).toBe(true)
  })

  it('空关键词按分类过滤', () => {
    const r = filterFoods('', [], 'fruit')
    expect(r.every((f) => f.category === 'fruit')).toBe(true)
  })
})

describe('选择器结果拆分', () => {
  it('命中项恰好在最近使用里时，搜索仍要显示它', () => {
    const list = filterFoods('玉米', [], 'all')
    expect(list.length).toBeGreaterThan(0)
    const first = list[0]
    const split = splitPickerResults(list, [first.id], '玉米')
    expect(split.total).toBeGreaterThan(0)
    expect(split.rest.some((f) => f.id === first.id)).toBe(true)
  })

  it('无关键词时才拆出「最近使用」', () => {
    const list = filterFoods('', [], 'all')
    const split = splitPickerResults(list, [list[0].id], '')
    expect(split.recent.length).toBe(1)
    expect(split.rest.some((f) => f.id === list[0].id)).toBe(false)
  })
})