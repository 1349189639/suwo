import { describe, expect, it } from 'vitest'
import {
  defaultLook,
  normalizeLook,
  OUTFIT_STYLES,
  styleDef,
  styleSupportsColor,
  type Look,
  type OutfitStyle,
} from './look'
import { nearestBodyTier, resolveIdlePngShot } from './avatar-assets'

function maleLook(patch: Partial<Look> = {}): Look {
  return { ...defaultLook('male'), ...patch }
}

function femaleLook(patch: Partial<Look> = {}): Look {
  return { ...defaultLook('female'), ...patch }
}

describe('Avatar 最近档单图选择', () => {
  it('把连续 build 映射到最近一档，不产生两档叠加', () => {
    expect(nearestBodyTier(0)).toBe(0)
    expect(nearestBodyTier(0.1)).toBe(1)
    expect(nearestBodyTier(0.5)).toBe(4)
    expect(nearestBodyTier(0.9)).toBe(7)
    expect(nearestBodyTier(1)).toBe(8)
  })

  it('运动装每个状态只返回一张不透明 PNG', () => {
    const shot = resolveIdlePngShot(0.4, 'male', maleLook())
    expect(shot).not.toBeNull()
    expect(shot?.opacity).toBe(1)
    expect(shot?.zoom).toBe(0)
    expect(shot?.src).toBe('/avatar/male-body-3.png')
  })

  it('非 idle 动作和经典手绘都回退 SVG，不显示静态 PNG', () => {
    expect(resolveIdlePngShot(0.5, 'male', maleLook(), 'run')).toBeNull()
    expect(resolveIdlePngShot(0.5, 'male', maleLook({ outfitStyle: 'classic' }))).toBeNull()
  })

  it('西装和日常休闲固定使用标准档全身穿搭', () => {
    expect(resolveIdlePngShot(0.2, 'male', maleLook({ outfitStyle: 'suit' }))?.src).toBe(
      '/avatar/male-outfit-suit-4.png',
    )
    expect(resolveIdlePngShot(0.8, 'female', femaleLook({ outfitStyle: 'casual' }))?.src).toBe(
      '/avatar/female-outfit-casual-4.png',
    )
  })

  it('标准档非薄荷色使用对应换色素材，其他档位缺失颜色时回退薄荷全身图', () => {
    expect(
      resolveIdlePngShot(0.5, 'male', maleLook({ outfit: 'coral' }))?.src,
    ).toBe('/avatar/male-body-4-coral.png')
    expect(
      resolveIdlePngShot(0, 'male', maleLook({ outfit: 'sky' }))?.src,
    ).toBe('/avatar/male-body-0.png')
  })

  it('标准档可用发型 / 发色 / 肤色小样优先命中', () => {
    expect(
      resolveIdlePngShot(0.5, 'male', maleLook({ hair: 'buzz' }))?.src,
    ).toBe('/avatar/male-buzz.png')
    expect(
      resolveIdlePngShot(0.5, 'female', femaleLook({ hair: 'bob' }))?.src,
    ).toBe('/avatar/female-bob.png')
    expect(
      resolveIdlePngShot(0.5, 'female', femaleLook({ hairColor: 'brown' }))?.src,
    ).toBe('/avatar/female-brown.png')
    expect(
      resolveIdlePngShot(0.5, 'male', maleLook({ skin: 'light' }))?.src,
    ).toBe('/avatar/male-light.png')
    expect(
      resolveIdlePngShot(0.5, 'female', femaleLook({ skin: 'tan' }))?.src,
    ).toBe('/avatar/female-tan.png')
  })

  it('未覆盖的默认发型回退标准档全身图', () => {
    expect(resolveIdlePngShot(0.5, 'male', maleLook())?.src).toBe('/avatar/male-body-4.png')
    expect(resolveIdlePngShot(0.5, 'female', femaleLook())?.src).toBe('/avatar/female-body-4.png')
  })
})

describe('形象注册表（加新形象只需要加一条记录）', () => {
  it('每个形象的 id 唯一，且能被 normalizeLook 接受', () => {
    const ids = OUTFIT_STYLES.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const s of OUTFIT_STYLES) {
      expect(normalizeLook({ outfitStyle: s.id }, 'male').outfitStyle).toBe(s.id)
      expect(normalizeLook({ outfitStyle: s.id }, 'female').outfitStyle).toBe(s.id)
    }
  })

  it('未知 id 回退到第一项，不会崩', () => {
    expect(styleDef('nope' as OutfitStyle).id).toBe(OUTFIT_STYLES[0].id)
  })

  it('只有标了配色的形象能换色', () => {
    expect(styleSupportsColor('sport')).toBe(true)
    expect(styleSupportsColor('classic')).toBe(true)
    expect(styleSupportsColor('suit')).toBe(false)
    expect(styleSupportsColor('casual')).toBe(false)
  })

  it('所有 png 固定素材形象都能取到按性别命名的图（模板不留占位符）', () => {
    for (const s of OUTFIT_STYLES) {
      if (s.kind !== 'png' || !s.singleAsset) continue
      const shot = resolveIdlePngShot(0.5, 'female', { ...defaultLook('female'), outfitStyle: s.id })
      expect(shot?.src).toContain('female')
      expect(shot?.src).not.toContain('{gender}')
    }
  })
})
