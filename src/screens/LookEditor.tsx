import { useState } from 'react'
import { Avatar } from '../components/Avatar'
import { useStore } from '../data/store'
import { buildFromBmi, muscleFromBuild } from '../domain/avatar'
import { nearestBodyTier } from '../domain/avatar-assets'
import { latestWeight } from '../domain/day'
import { bmiBand, calcBmi } from '../domain/nutrition'
import {
  HAIR_COLORS,
  HAIR_STYLES,
  OUTFITS,
  OUTFIT_STYLES,
  SKIN_TONES,
  defaultLook,
  styleDef,
  styleSupportsColor,
  type HairColor,
  type HairStyle,
  type Look,
  type OutfitColor,
  type OutfitStyle,
  type SkinTone,
} from '../domain/look'

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
            <div className="mb-2 flex items-baseline gap-2 px-1">
        <span className="text-[12px] text-muted">{title}</span>
        {hint && <span className="text-[10px] text-muted/50">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function Swatch({
  active,
  onClick,
  color,
  label,
}: {
  active: boolean
  onClick: () => void
  color: string
  label: string
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1">
      <span
        className={`grid h-11 w-11 place-items-center rounded-full border-2 transition ${
          active ? 'border-accent ring-2 ring-accent/30' : 'border-white/15'
        }`}
        style={{ background: color }}
      >
        {active && (
          <span className="text-[13px] text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
            ✓
          </span>
        )}
      </span>
      <span className={`text-[10px] ${active ? 'text-accent' : 'text-muted/70'}`}>{label}</span>
    </button>
  )
}

export function LookEditor() {
  const data = useStore((s) => s.data)
  const setLook = useStore((s) => s.setLook)
  const gender = data.profile?.gender ?? 'male'
  const look = data.look ?? defaultLook(gender)
  const update = (patch: Partial<Look>) => setLook({ ...look, ...patch })

  const heightCm = data.profile?.heightCm ?? 170
  const realKg = latestWeight(data) ?? 70
  const [previewKg, setPreviewKg] = useState(realKg)

  const bmi = calcBmi(previewKg, heightCm)
  const build = buildFromBmi(bmi)
  const muscle = muscleFromBuild(build)
  const band = bmiBand(bmi)
  const diff = Math.round((previewKg - realKg) * 10) / 10
  const style = look.outfitStyle ?? 'sport'
  const tier = nearestBodyTier(build)
  const def = styleDef(style)
  // 发型/发色/肤色只有「有面部素材」的形象吃：手绘版全档位可用，运动装只在标准档+薄荷配色有素材
  const appearanceBlockedByAsset = style === 'sport' && (look.outfit !== 'mint' || tier !== 4)
  const appearanceDisabled = !def.appearance || appearanceBlockedByAsset
  const appearanceHint = !def.appearance
    ? '这套固定穿搭只展示整体轮廓，发型、发色、肤色暂不参与变化'
    : !appearanceBlockedByAsset
      ? undefined
      : look.outfit !== 'mint'
        ? '这个颜色目前只有标准档全身图，发型、发色、肤色暂不生效'
        : '当前档位只有全身站姿图，发型、发色、肤色到标准档再试'

  return (
    <div className="anim-rise pb-2">
      {/* 预览常驻顶部，滚选项时也能看到 */}
      <div className="sticky top-0 z-10 -mx-5 mb-3 bg-surface/95 px-5 pb-2.5 pt-0.5 backdrop-blur">
        <div
          className="flex items-center gap-3 rounded-3xl border border-line/60 p-2.5"
          style={{
            background: 'radial-gradient(120% 90% at 50% 0%, #2a4753 0%, #16242e 55%, #0c141b 100%)',
          }}
        >
          <div className="shrink-0">
            <Avatar build={build} muscle={muscle} gender={gender} spirit={82} action="idle" look={look} size={92} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] text-white/70">
                {previewKg.toFixed(1)} kg · BMI {bmi.toFixed(1)} · {band.label}
              </span>
              <span className="text-[10px] text-accent">
                {diff === 0 ? '当前' : `${diff > 0 ? '+' : ''}${diff}kg`}
              </span>
            </div>
            <input
              type="range"
              min={40}
              max={130}
              step={0.5}
              value={previewKg}
              onChange={(e) => setPreviewKg(Number(e.target.value))}
              className="mt-2 w-full accent-[#3ddc97]"
            />
            <div className="mt-0.5 flex justify-between text-[9px] text-white/35">
              <span>40</span>
              <span>拖一下看胖瘦，不会保存</span>
              <span>130</span>
            </div>
          </div>
        </div>
        <div className="mt-1.5 px-1 text-[10.5px] text-muted/70">
          当前：{HAIR_COLORS[look.hairColor].label}发 ·{' '}
          {HAIR_STYLES.find((h) => h.id === look.hair)?.label} · {SKIN_TONES[look.skin].label}肤 ·{' '}
          {OUTFITS[look.outfit].label}色短裤
        </div>
      </div>

      <div className="space-y-4">
        <Section title="肤色">
          <div className={`flex gap-5 px-1 ${appearanceDisabled ? 'pointer-events-none opacity-30' : ''}`}>
            {(Object.keys(SKIN_TONES) as SkinTone[]).map((k) => (
              <Swatch
                key={k}
                active={look.skin === k}
                onClick={() => update({ skin: k })}
                color={SKIN_TONES[k].base}
                label={SKIN_TONES[k].label}
              />
            ))}
          </div>
        </Section>

        <Section title="发型">
          <div className={`grid grid-cols-4 gap-1.5 ${appearanceDisabled ? 'pointer-events-none opacity-30' : ''}`}>
            {HAIR_STYLES.map((h) => (
              <button
                key={h.id}
                disabled={appearanceDisabled}
                onClick={() => update({ hair: h.id as HairStyle })}
                className={`rounded-2xl border px-1 py-2 text-center ${
                  look.hair === h.id ? 'border-accent/60 bg-accent/10' : 'border-line bg-surface2/40'
                }`}
              >
                <div className={`text-[12px] ${look.hair === h.id ? 'text-accent' : ''}`}>{h.label}</div>
              </button>
            ))}
          </div>
        </Section>

        <Section title="发色">
          <div className={`flex gap-5 px-1 ${appearanceDisabled ? 'pointer-events-none opacity-30' : ''}`}>
            {(Object.keys(HAIR_COLORS) as HairColor[]).map((k) => (
              <Swatch
                key={k}
                active={look.hairColor === k}
                onClick={() => update({ hairColor: k })}
                color={HAIR_COLORS[k].base}
                label={HAIR_COLORS[k].label}
              />
            ))}
          </div>
        </Section>

        {appearanceHint && (
          <p className="px-1 text-[10.5px] leading-4 text-muted/50">{appearanceHint}</p>
        )}

        <Section title="款式">
          <div className="grid grid-cols-2 gap-2 px-1">
            {OUTFIT_STYLES.map((s) => {
              const active = (look.outfitStyle ?? 'sport') === s.id
              return (
                <button
                  key={s.id}
                  onClick={() => update({ outfitStyle: s.id as OutfitStyle })}
                  className={
                    'rounded-2xl border px-3 py-2 text-left transition active:scale-[0.98] ' +
                    (active
                      ? 'border-accent/60 bg-accent/15'
                      : 'border-line/60 bg-surface2/40')
                  }
                >
                  <div className={'text-[13px] font-medium ' + (active ? 'text-accent' : '')}>
                    {s.label}
                  </div>
                  <div className="mt-0.5 text-[10px] leading-4 text-muted/60">{s.hint}</div>
                </button>
              )
            })}
          </div>
        </Section>

        <Section
          title="服装颜色"
          hint={styleSupportsColor(style) ? undefined : '这套是固定配色'}
        >
          <div
            className={
              'flex gap-5 px-1 ' + (styleSupportsColor(style) ? '' : 'pointer-events-none opacity-30')
            }
          >
            {(Object.keys(OUTFITS) as OutfitColor[]).map((k) => (
              <Swatch
                key={k}
                active={look.outfit === k}
                onClick={() => update({ outfit: k })}
                color={OUTFITS[k].color}
                label={OUTFITS[k].label}
              />
            ))}
          </div>
        </Section>

        <p className="px-1 text-[10.5px] leading-4 text-muted/50">
          体型由体重驱动，不在这里改——上面那根滑杆只是试穿。真的想变，去「称体重」。
        </p>
      </div>
    </div>
  )
}
