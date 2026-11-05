import type { Gender } from './types'

export type SkinTone = 'light' | 'warm' | 'tan'
export type HairStyle = 'short' | 'buzz' | 'bob' | 'long'
export type HairColor = 'black' | 'brown' | 'chestnut' | 'ash'
export type OutfitColor = 'mint' | 'coral' | 'graphite' | 'sky'
/** 服装款式：sport 运动装（默认主皮肤，露躯干可见体型）；suit 西装；casual 日常长袖长裤 */
export type OutfitStyle = 'sport' | 'suit' | 'casual' | 'classic'

export interface Look {
  skin: SkinTone
  hair: HairStyle
  hairColor: HairColor
  outfit: OutfitColor
  outfitStyle: OutfitStyle
}

export const SKIN_TONES: Record<SkinTone, { label: string; base: string; shade: string; line: string }> = {
  light: { label: '白', base: '#fbdcbe', shade: '#eebf95', line: '#d99c6d' },
  warm: { label: '暖', base: '#f7cda4', shade: '#e6ae7e', line: '#cf9066' },
  tan: { label: '小麦', base: '#e0ab7c', shade: '#c98c5e', line: '#a86f45' },
}

export const HAIR_COLORS: Record<HairColor, { label: string; base: string; light: string }> = {
  black: { label: '黑', base: '#241c17', light: '#3a2c23' },
  brown: { label: '棕', base: '#4a3225', light: '#63432f' },
  chestnut: { label: '栗', base: '#6b3f26', light: '#8a5533' },
  ash: { label: '灰', base: '#4a423d', light: '#69605a' },
}

export const OUTFITS: Record<OutfitColor, { label: string; color: string }> = {
  mint: { label: '薄荷', color: '#3ddc97' },
  coral: { label: '珊瑚', color: '#ff7d5c' },
  sky: { label: '天空', color: '#5aa9e6' },
  graphite: { label: '石墨', color: '#7b8ea3' },
}

/** 形象来源：png = 素材图；vector = 参数化 SVG（手绘风，会呼吸会眨眼） */
export type StyleKind = 'png' | 'vector'

/**
 * 形象（穿搭风格）注册表。
 * 以后要加新形象：往 OUTFIT_STYLES 里加一条，素材按 asset 模板放进 public/avatar 即可，
 * 引导页、形象编辑页、头像渲染都会自动多出这一项，不用改界面代码。
 */
export interface OutfitStyleDef {
  id: OutfitStyle
  label: string
  hint: string
  kind: StyleKind
  /** 可以换的配色；null = 固定配色 */
  colors: OutfitColor[] | null
  /** 是否参与 肤色 / 发型 / 发色 */
  appearance: boolean
  /** kind=png 且只有一个固定素材时，这里是文件名模板（{gender} 会被替换） */
  singleAsset?: string
  /** 引导页是否作为可选项 */
  selectable: boolean
}

export const OUTFIT_STYLES: OutfitStyleDef[] = [
  {
    id: 'sport',
    label: '运动装',
    hint: '默认，露躯干可见体型变化',
    kind: 'png',
    colors: ['mint', 'coral', 'sky', 'graphite'],
    appearance: true,
    selectable: true,
  },
  {
    id: 'suit',
    label: '西装',
    hint: '遮体穿搭，仅展示整体轮廓',
    kind: 'png',
    colors: null,
    appearance: false,
    singleAsset: '/avatar/{gender}-outfit-suit-4.png',
    selectable: true,
  },
  {
    id: 'casual',
    label: '日常休闲',
    hint: '卫衣 / 长袖长裤',
    kind: 'png',
    colors: null,
    appearance: false,
    singleAsset: '/avatar/{gender}-outfit-casual-4.png',
    selectable: true,
  },
  {
    id: 'classic',
    label: '经典手绘',
    hint: '最初那版小人物，会呼吸会眨眼',
    kind: 'vector',
    colors: ['mint', 'coral', 'sky', 'graphite'],
    appearance: true,
    selectable: true,
  },
]

export function styleDef(id: OutfitStyle): OutfitStyleDef {
  return OUTFIT_STYLES.find((s) => s.id === id) ?? OUTFIT_STYLES[0]
}

/** 这套形象能不能换配色 */
export function styleSupportsColor(id: OutfitStyle): boolean {
  return styleDef(id).colors !== null
}

/** 这套形象吃不吃 肤色/发型/发色 */
export function styleSupportsAppearance(id: OutfitStyle): boolean {
  return styleDef(id).appearance
}

export const HAIR_STYLES: { id: HairStyle; label: string; hint: string }[] = [
  { id: 'short', label: '短发', hint: '利落，适合运动' },
  { id: 'buzz', label: '寸头', hint: '最省事' },
  { id: 'bob', label: '波波头', hint: '到下颌' },
  { id: 'long', label: '长发', hint: '到肩' },
]

export function defaultLook(gender: Gender): Look {
  return {
    skin: 'warm',
    hair: gender === 'male' ? 'short' : 'long',
    hairColor: 'black',
    outfit: 'mint',
    outfitStyle: 'sport',
  }
}

export function normalizeLook(input: unknown, gender: Gender): Look {
  const src = (input && typeof input === 'object' ? input : {}) as Partial<Look>
  const base = defaultLook(gender)
  return {
    skin: src.skin && src.skin in SKIN_TONES ? src.skin : base.skin,
    hair: src.hair && HAIR_STYLES.some((h) => h.id === src.hair) ? src.hair : base.hair,
    hairColor: src.hairColor && src.hairColor in HAIR_COLORS ? src.hairColor : base.hairColor,
    outfit: src.outfit && src.outfit in OUTFITS ? src.outfit : base.outfit,
    outfitStyle:
      src.outfitStyle && OUTFIT_STYLES.some((s) => s.id === src.outfitStyle)
        ? src.outfitStyle
        : base.outfitStyle,
  }
}
