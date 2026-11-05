import { describe, expect, it } from 'vitest'
import { parseAmount, sanitizeAmount } from './amount'

describe('记账算式', () => {
  it('加减乘除', () => {
    expect(parseAmount('12+8')).toBe(20)
    expect(parseAmount('30-12')).toBe(18)
    expect(parseAmount('3*5')).toBe(15)
    expect(parseAmount('100/4')).toBe(25)
  })

  it('认全角乘除号', () => {
    expect(parseAmount('3×5')).toBe(15)
    expect(parseAmount('100÷4')).toBe(25)
  })

  it('小数和括号', () => {
    expect(parseAmount('1.5+2.25')).toBe(3.75)
    expect(parseAmount('(3+5)*2')).toBe(16)
    expect(parseAmount('12 + 8')).toBe(20)
  })

  it('半截算式和脏字符返回 null', () => {
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('12+')).toBeNull()
    expect(parseAmount('abc')).toBeNull()
    expect(parseAmount('1/0')).toBeNull()
    expect(parseAmount('(3+5')).toBeNull()
  })

  it('负结果按 0 处理', () => {
    expect(parseAmount('5-8')).toBe(0)
  })

  it('输入过滤只留算式字符', () => {
    expect(sanitizeAmount('12a+8元')).toBe('12+8')
    expect(sanitizeAmount('3 × 5')).toBe('3×5')
  })
})
