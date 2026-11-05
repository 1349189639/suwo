import { describe, expect, it } from 'vitest'
import { VisionError, parseVisionItems, sanitizeItem } from './vision'

const wrap = (items: unknown) => JSON.stringify({ items })

describe('拍照识别结果解析', () => {
  it('解析出膳食纤维和水分', () => {
    const items = parseVisionItems(
      wrap([
        { name: '西兰花', grams: 55, kcal: 19, protein: 1.5, carbs: 3.9, fat: 0.2, fiber: 1.4, water: 91 },
      ]),
    )
    expect(items).toHaveLength(1)
    expect(items[0].fiber).toBe(1.4)
    expect(items[0].water).toBe(91)
  })

  it('模型没给纤维/水分时按名字兜底，不留下 0', () => {
    const items = parseVisionItems(
      wrap([{ name: '西兰花', grams: 100, kcal: 34, protein: 2.8, carbs: 7, fat: 0.4 }]),
    )
    expect(items[0].fiber).toBeGreaterThan(0)
    expect(items[0].water).toBeGreaterThan(85)
  })

  it('脂肪不可能比整份食物还重', () => {
    const items = parseVisionItems(
      wrap([{ name: '烤香肠', grams: 90, kcal: 270, protein: 10, carbs: 6, fat: 200 }]),
    )
    expect(items[0].f).toBeLessThanOrEqual(90)
  })

  it('热量和 4/4/9 差太多时以宏量为准', () => {
    const items = parseVisionItems(
      wrap([{ name: '鸡胸肉', grams: 100, kcal: 50, protein: 31, carbs: 0, fat: 3.6 }]),
    )
    // 4×31 + 4×0 + 9×3.6 = 156.4
    expect(items[0].kcal).toBe(156)
  })

  it('前后一致的数值不会被改动', () => {
    const items = parseVisionItems(
      wrap([{ name: '米饭', grams: 200, kcal: 232, protein: 5.2, carbs: 51.8, fat: 0.6 }]),
    )
    expect(items[0].kcal).toBe(232)
    expect(items[0].f).toBe(0.6)
  })

  it('没有名字或算不出热量的条目丢掉', () => {
    const items = parseVisionItems(wrap([{ name: '', grams: 100, kcal: 100 }, { name: '空', kcal: 0, protein: 0, carbs: 0, fat: 0 }]))
    expect(items).toHaveLength(0)
  })

  it('返回的不是 JSON 时抛 VisionError', () => {
    expect(() => parseVisionItems('抱歉，我看不清这张图')).toThrow(VisionError)
  })

  it('单条也能单独收口（供重算/手动修改复用）', () => {
    const fixed = sanitizeItem({ name: '苹果', grams: 200, kcal: 104, p: 0.6, c: 28, f: 0.4 })
    expect(fixed.grams).toBe(200)
    expect(fixed.fiber).toBeGreaterThan(0)
    expect(fixed.water).toBeGreaterThan(80)
  })
})
