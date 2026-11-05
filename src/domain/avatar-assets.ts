import { styleDef } from './look'
import type { Look } from './look'
import type { AvatarAction, Gender } from './types'

export interface AvatarShot {
  src: string
  opacity: 1
  zoom: 0
}

const BODY_TIERS = 9

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v))
}

/** 连续 build 映射到现有 9 档里最近的一档；不做两档交叉淡入。 */
export function nearestBodyTier(build: number): number {
  const pos = clamp01(build) * (BODY_TIERS - 1)
  return Math.round(pos)
}

function tierSrc(gender: Gender, idx: number, outfit: Look['outfit']): string {
  if (idx === 4 && outfit !== 'mint') return `/avatar/${gender}-body-4-${outfit}.png`
  // 其他档位只有 mint 全身图；缺色时回退到现有 mint 档，不请求不存在的 PNG。
  return `/avatar/${gender}-body-${idx}.png`
}

/** 现有单维度小样只覆盖标准档 sport；没有可用素材时返回 null。 */
function sampleSrc(gender: Gender, look: Look): string | null {
  if (gender === 'male' && look.hair === 'buzz') return '/avatar/male-buzz.png'
  if (gender === 'female' && look.hair === 'bob') return '/avatar/female-bob.png'
  if (look.hair === 'bob' || look.hair === 'buzz') return null
  if (look.hairColor === 'brown') return `/avatar/${gender}-brown.png`
  if (gender === 'male' && look.skin === 'light') return '/avatar/male-light.png'
  if (gender === 'female' && look.skin === 'tan') return '/avatar/female-tan.png'
  return null
}

/**
 * 路线 A 止血规则：只有 idle 站姿、非 classic 的 PNG 皮肤才显示静态全身图。
 * 跑步、卧推、羽毛球等动作继续走参数化 SVG，避免静态 PNG 传了动作却不变。
 */
export function resolveIdlePngShot(
  build: number,
  gender: Gender,
  look: Look,
  action: AvatarAction = 'idle',
): AvatarShot | null {
  const def = styleDef(look.outfitStyle ?? 'sport')

  if (def.kind === 'vector' || action !== 'idle') return null

  // 固定配色的形象：一张整体图，不随体型/配色变化
  if (def.singleAsset) {
    return { src: def.singleAsset.replace('{gender}', gender), opacity: 1, zoom: 0 }
  }

  // 有配色的形象（目前只有运动装）：9 档全身图，标准档另有一套配色图
  const idx = nearestBodyTier(build)

  if (idx === 4 && look.outfit === 'mint') {
    const sample = sampleSrc(gender, look)
    if (sample) return { src: sample, opacity: 1, zoom: 0 }
  }

  return { src: tierSrc(gender, idx, look.outfit), opacity: 1, zoom: 0 }
}
