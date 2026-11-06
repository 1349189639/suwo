import { describe, expect, it } from 'vitest'
import { needsManualReinstall } from './updater'
import { hasValidConsent } from './privacy'
import { PRIVACY_POLICY } from './privacy'

describe('签名换代迁移判断', () => {
  it('debug 时代旧包（code<=3）升级到 code4 必须手动重装', () => {
    expect(needsManualReinstall(3, 4)).toBe(true)
    expect(needsManualReinstall(2, 4)).toBe(true)
    expect(needsManualReinstall(1, 5)).toBe(true)
  })

  it('已经在新签名上（code>=4）走应用内更新', () => {
    expect(needsManualReinstall(4, 5)).toBe(false)
    expect(needsManualReinstall(5, 6)).toBe(false)
  })

  it('网页版（code=0）不需要迁移提示', () => {
    expect(needsManualReinstall(0, 4)).toBe(false)
  })
})

describe('隐私同意闸口', () => {
  it('没有记录、版本不符都算未同意', () => {
    expect(hasValidConsent(undefined)).toBe(false)
    expect(hasValidConsent({ policyVersion: '2020-01-01', agreedAt: 1 })).toBe(false)
  })

  it('同意过当前版本才放行', () => {
    expect(
      hasValidConsent({ policyVersion: PRIVACY_POLICY.updatedAt, agreedAt: Date.now() }),
    ).toBe(true)
  })
})
