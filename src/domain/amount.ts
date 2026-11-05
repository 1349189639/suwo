/**
 * 记账金额算式：支持 + - * / × ÷ 和括号，例如 "12+8"、"3×5"、"100/4 - 2"。
 * 只做四则运算，不执行任意代码（不用 eval）。
 * 解析失败（空、半截算式、除以 0）返回 null。
 */
export function parseAmount(input: string): number | null {
  const src = input.replace(/×/g, '*').replace(/÷/g, '/').replace(/\s+/g, '')
  if (!src) return null

  let i = 0

  const peek = () => src[i]
  const eat = (c: string) => {
    if (src[i] !== c) return false
    i += 1
    return true
  }

  function number(): number | null {
    const start = i
    if (peek() === '+' || peek() === '-') i += 1
    while (i < src.length && /[\d.]/.test(src[i])) i += 1
    if (i === start) return null
    const v = Number(src.slice(start, i))
    return Number.isFinite(v) ? v : null
  }

  function factor(): number | null {
    if (eat('(')) {
      const v = expr()
      if (v === null || !eat(')')) return null
      return v
    }
    return number()
  }

  function term(): number | null {
    let left = factor()
    if (left === null) return null
    while (i < src.length) {
      const op = peek()
      if (op !== '*' && op !== '/') break
      i += 1
      const right = factor()
      if (right === null) return null
      if (op === '/' && right === 0) return null
      left = op === '*' ? left * right : left / right
    }
    return left
  }

  function expr(): number | null {
    let left = term()
    if (left === null) return null
    while (i < src.length) {
      const op = peek()
      if (op !== '+' && op !== '-') break
      i += 1
      const right = term()
      if (right === null) return null
      left = op === '+' ? left + right : left - right
    }
    return left
  }

  const result = expr()
  if (result === null || i !== src.length) return null
  if (!Number.isFinite(result)) return null
  return Math.round(Math.max(0, result) * 100) / 100
}

/** 算式的输入过滤：只保留数字、小数点、四则运算符和括号 */
export function sanitizeAmount(raw: string): string {
  return raw.replace(/[^\d.+\-*/×÷()]/g, '')
}
