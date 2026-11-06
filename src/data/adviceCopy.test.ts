import { describe, expect, it } from 'vitest'
import {
  ADVICE_TEMPLATES,
  BANNED_WORDS,
  ESTIMATE_NOTE,
  NORMALIZING_LINES,
  WEEK_DISCLAIMER,
  filterByBudget,
} from './adviceCopy'

const ALL_TEXT = [
  ...ADVICE_TEMPLATES.map((t) => t.text),
  ...NORMALIZING_LINES,
  ESTIMATE_NOTE,
  WEEK_DISCLAIMER,
]

describe('文案准入：禁用词', () => {
  it('所有文案都不含禁用词', () => {
    for (const text of ALL_TEXT) {
      for (const word of BANNED_WORDS) {
        expect(text.includes(word), `${word} ← ${text}`).toBe(false)
      }
    }
  })

  it('禁用词表本身不为空（防止被清空后测试假通过）', () => {
    expect(BANNED_WORDS.length).toBeGreaterThan(10)
  })
})

describe('文案准入：每条建议的五道关', () => {
  it('有依据编号、有成本标注、文案不为空', () => {
    for (const t of ADVICE_TEMPLATES) {
      expect(t.source.length).toBeGreaterThan(1)
      expect(['none', 'low', 'normal']).toContain(t.extraCost)
      expect(t.text.length).toBeGreaterThan(8)
    }
  })

  it('不要求做饭、称重、过水、或买特定贵价食材', () => {
    const forbidden = ['下厨', '自己做饭', '称重', '过水', '三文鱼', '牛油果', '鸡胸', '藜麦', '羽衣甘蓝']
    for (const t of ADVICE_TEMPLATES) {
      for (const w of forbidden) expect(t.text.includes(w), `${w} ← ${t.text}`).toBe(false)
    }
  })

  it('预算紧时只剩零成本选项', () => {
    const tight = filterByBudget(ADVICE_TEMPLATES, 'tight')
    expect(tight.length).toBeGreaterThan(0)
    for (const t of tight) expect(t.extraCost).toBe('none')
  })

  it('每条模板的 id 唯一', () => {
    const ids = ADVICE_TEMPLATES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
