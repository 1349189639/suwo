import { useEffect, useState } from 'react'
import { HAIR_COLORS, OUTFITS, SKIN_TONES, defaultLook, type Look } from '../domain/look'
import { resolveIdlePngShot } from '../domain/avatar-assets'
import { cx } from './ui'
import type { AvatarAction, Gender } from '../domain/types'

interface Props {
  /** 0 = 精瘦，1 = 肥胖；由 BMI 连续映射 */
  build: number
  /** 0–1，肌肉线条显现度 */
  muscle: number
  gender: Gender
  /** 0–100，影响表情 */
  spirit: number
  action?: AvatarAction
  look?: Look
  size?: number
  className?: string
  pulse?: boolean
}

const OUTLINE = '#33261e'
const INK = '#1a1410'
const SHOE = '#f2f6fa'
const SOLE = '#2b3947'

interface PoseSpec {
  rot: number
  dx: number
  dy: number
  scale: number
  armL: [number, number]
  armR: [number, number]
  legL: [number, number]
  legR: [number, number]
}

const POSES: Record<AvatarAction, PoseSpec> = {
  idle: { rot: 0, dx: 0, dy: 0, scale: 1, armL: [12, 8], armR: [-12, -8], legL: [3, 1], legR: [-3, -1] },
  run: { rot: -3, dx: 0, dy: -2, scale: 1, armL: [-28, -100], armR: [34, -100], legL: [-34, 62], legR: [26, 14] },
  flex: { rot: 0, dx: 0, dy: 0, scale: 1, armL: [148, 34], armR: [-148, -34], legL: [5, 0], legR: [-5, 0] },
  badminton: { rot: 0, dx: 0, dy: -2, scale: 1, armL: [38, 28], armR: [-152, -26], legL: [-24, 36], legR: [20, 6] },
  sleep: { rot: -5, dx: 0, dy: 5, scale: 1, armL: [6, 4], armR: [-6, -4], legL: [5, 2], legR: [-3, -2] },
  pushup: { rot: 74, dx: -10, dy: 66, scale: 0.76, armL: [-74, 0], armR: [-74, 0], legL: [0, 0], legR: [0, 0] },
  bench: { rot: -88, dx: 30, dy: 50, scale: 0.7, armL: [-92, -4], armR: [-92, 4], legL: [102, -12], legR: [102, -12] },
}

function limbEnd(x: number, y: number, a1: number, len1: number, a2: number, len2: number) {
  const r1 = (a1 * Math.PI) / 180
  const ex = x - Math.sin(r1) * len1
  const ey = y + Math.cos(r1) * len1
  const r2 = ((a1 + a2) * Math.PI) / 180
  return { ex, ey, hx: ex - Math.sin(r2) * len2, hy: ey + Math.cos(r2) * len2 }
}

export function Avatar({
  build,
  muscle,
  gender,
  spirit,
  action = 'idle',
  look,
  size = 260,
  className,
  pulse,
}: Props) {
  // ---- 静态全身 PNG 只用于 idle 站姿；classic 和其他动作走参数化 SVG ----
  const [imgFailed, setImgFailed] = useState(false)
  const activeLook = look ?? defaultLook(gender)
  const shot = resolveIdlePngShot(build, gender, activeLook, action)
  const shots = shot ? [shot] : []

  useEffect(() => {
    setImgFailed(false)
  }, [shot?.src, action])

  if (!imgFailed && shots.length > 0) {
    return (
      <div
        className={cx('relative select-none', className)}
        style={{ width: size, height: size * 1.5 }}
        aria-hidden
      >
        {shots.map((s) => (
          <img
            key={s.src}
            src={s.src}
            alt=""
            draggable={false}
            onError={() => setImgFailed(true)}
            style={{
              position: 'absolute',
              left: 0,
              bottom: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              opacity: 1,
            }}
          />
        ))}
      </div>
    )
  }
  const CX = 100
  const HEAD_R = 33
  const HEAD_CY = 64
  const SHOULDER_Y = 106
  const HIP_Y = 182

  const skin = SKIN_TONES[(look ?? defaultLook(gender)).skin]
  const hairTone = HAIR_COLORS[(look ?? defaultLook(gender)).hairColor]
  const outfit = OUTFITS[(look ?? defaultLook(gender)).outfit]
  const hairStyle = (look ?? defaultLook(gender)).hair

  const SKIN = skin.base
  const SKIN_SHADE = skin.shade
  const SKIN_LINE = skin.line
  const HAIR = hairTone.base
  const HAIR_HI = hairTone.light
  const OUTFIT = outfit.color

  const halfShoulder = 25 + 12 * build + (gender === 'male' ? 8 : 0)
  const halfWaist = 14 + 34 * build + (gender === 'male' ? 2 : 0)
  const halfHip = 20 + 24 * build + (gender === 'female' ? 4 : 0)

  const pose = POSES[action] ?? POSES.idle

  const UPPER_ARM = 33
  const FORE_ARM = 30
  const THIGH = 34
  const CALF = 30
  const ARM_W = 13
  const FORE_W = 11
  const THIGH_W = 19
  const CALF_W = 16

  const shoulderL = { x: CX - halfShoulder + 5, y: SHOULDER_Y + 4 }
  const shoulderR = { x: CX + halfShoulder - 5, y: SHOULDER_Y + 4 }
  const hipL = { x: CX - halfHip * 0.42, y: HIP_Y - 4 }
  const hipR = { x: CX + halfHip * 0.42, y: HIP_Y - 4 }

  const rightHand = limbEnd(shoulderR.x, shoulderR.y, pose.armR[0], UPPER_ARM, pose.armR[1], FORE_ARM)

  const toWorld = (p: { x: number; y: number }) => {
    const c = { x: CX, y: 150 }
    let x = (p.x - c.x) * pose.scale + c.x
    let y = (p.y - c.y) * pose.scale + c.y
    const rad = (pose.rot * Math.PI) / 180
    const ddx = x - CX
    const ddy = y - HIP_Y
    x = CX + ddx * Math.cos(rad) - ddy * Math.sin(rad)
    y = HIP_Y + ddx * Math.sin(rad) + ddy * Math.cos(rad)
    return { x: x + pose.dx, y: y + pose.dy }
  }

  const torso = [
    `M ${CX - halfShoulder} ${SHOULDER_Y + 2}`,
    `C ${CX - halfShoulder - 3} ${SHOULDER_Y + 18} ${CX - halfWaist - 4} ${SHOULDER_Y + 34} ${CX - halfWaist} ${SHOULDER_Y + 46}`,
    `C ${CX - halfWaist} ${SHOULDER_Y + 60} ${CX - halfHip - 1} ${SHOULDER_Y + 74} ${CX - halfHip} ${HIP_Y}`,
    `L ${CX + halfHip} ${HIP_Y}`,
    `C ${CX + halfHip + 1} ${SHOULDER_Y + 74} ${CX + halfWaist} ${SHOULDER_Y + 60} ${CX + halfWaist} ${SHOULDER_Y + 46}`,
    `C ${CX + halfWaist + 4} ${SHOULDER_Y + 34} ${CX + halfShoulder + 3} ${SHOULDER_Y + 18} ${CX + halfShoulder} ${SHOULDER_Y + 2}`,
    `Q ${CX} ${SHOULDER_Y - 12} ${CX - halfShoulder} ${SHOULDER_Y + 2}`,
    'Z',
  ].join(' ')

  const eyeY = HEAD_CY + 4
  const eyeDX = 13
  const mouthY = HEAD_CY + 21
  const eyesClosed = action === 'sleep'
  const happy = !eyesClosed && spirit >= 62
  const absOpacity = Math.max(0, Math.min(1, (muscle - 0.28) / 0.45))
  const bellyOpacity = Math.max(0, (build - 0.28) / 0.72)

  const mouth = eyesClosed
    ? `M ${CX - 5} ${mouthY} Q ${CX} ${mouthY + 2} ${CX + 5} ${mouthY}`
    : happy
      ? `M ${CX - 6.5} ${mouthY - 1} Q ${CX} ${mouthY + 5.5} ${CX + 6.5} ${mouthY - 1}`
      : spirit >= 35
        ? `M ${CX - 4.5} ${mouthY} L ${CX + 4.5} ${mouthY}`
        : `M ${CX - 6} ${mouthY + 2} Q ${CX} ${mouthY - 3} ${CX + 6} ${mouthY + 2}`

  const o = { stroke: OUTLINE, strokeWidth: 2, strokeLinejoin: 'round' as const }

  const Arm = ({ side }: { side: -1 | 1 }) => {
    const isLeft = side === -1
    const sh = isLeft ? shoulderL : shoulderR
    const [a1, a2] = isLeft ? pose.armL : pose.armR
    return (
      <g transform={`translate(${sh.x} ${sh.y}) rotate(${a1})`}>
        <rect x={-ARM_W / 2} y={4} width={ARM_W} height={UPPER_ARM + 2} rx={ARM_W / 2} fill={SKIN} {...o} />
        <g transform={`translate(0 ${UPPER_ARM}) rotate(${a2})`}>
          <rect x={-FORE_W / 2} y={-5} width={FORE_W} height={FORE_ARM + 5} rx={FORE_W / 2} fill={SKIN} {...o} />
          <circle cx={0} cy={FORE_ARM} r={6.5} fill={SKIN} {...o} />
        </g>
      </g>
    )
  }

  const Leg = ({ side }: { side: -1 | 1 }) => {
    const isLeft = side === -1
    const hp = isLeft ? hipL : hipR
    const [a1, a2] = isLeft ? pose.legL : pose.legR
    return (
      <g transform={`translate(${hp.x} ${hp.y}) rotate(${a1})`}>
        <rect x={-THIGH_W / 2} y={-10} width={THIGH_W} height={THIGH + 10} rx={THIGH_W / 2} fill={SKIN} {...o} />
        <g transform={`translate(0 ${THIGH}) rotate(${a2})`}>
          <rect x={-CALF_W / 2} y={-5} width={CALF_W} height={CALF + 5} rx={CALF_W / 2} fill={SKIN} {...o} />
          <g transform={`translate(0 ${CALF})`}>
            <path
              d="M -9 -5 L 9 -5 Q 12 -5 12 0 L 12 3 Q 12 7 8 7 L -9 7 Q -12 7 -12 3 L -12 -1 Q -12 -5 -9 -5 Z"
              fill={SHOE}
              {...o}
            />
            <rect x={-11} y={2} width={23} height={4} rx={2} fill={SOLE} opacity={0.9} />
          </g>
        </g>
      </g>
    )
  }

  /* ------------------------------ 头发 ------------------------------ */
  const HairTop = () => (
    <path
      d={`M ${CX - HEAD_R - 1} ${HEAD_CY - 4}
          A ${HEAD_R + 1} ${HEAD_R + 1} 0 0 1 ${CX + HEAD_R + 1} ${HEAD_CY - 4}
          C ${CX + HEAD_R + 1} ${HEAD_CY - 12} ${CX + 12} ${HEAD_CY - 21} ${CX + 1} ${HEAD_CY - 20}
          C ${CX - 12} ${HEAD_CY - 19} ${CX - 22} ${HEAD_CY - 13} ${CX - HEAD_R - 1} ${HEAD_CY - 4} Z`}
      fill={HAIR}
      {...o}
    />
  )

  const renderHair = () => {
    if (hairStyle === 'buzz') {
      return (
        <g>
          <path
            d={`M ${CX - HEAD_R} ${HEAD_CY - 7} A ${HEAD_R} ${HEAD_R} 0 0 1 ${CX + HEAD_R} ${HEAD_CY - 7} Z`}
            fill={HAIR}
            {...o}
          />
          <path
            d={`M ${CX - 20} ${HEAD_CY - 18} Q ${CX - 4} ${HEAD_CY - 26} ${CX + 12} ${HEAD_CY - 18}`}
            stroke={HAIR_HI}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            opacity={0.8}
          />
        </g>
      )
    }

    if (hairStyle === 'bob') {
      return (
        <g>
          <rect x={CX - HEAD_R - 5} y={HEAD_CY - 12} width={13} height={34} rx={6.5} fill={HAIR} {...o} />
          <rect x={CX + HEAD_R - 8} y={HEAD_CY - 12} width={13} height={34} rx={6.5} fill={HAIR} {...o} />
          <HairTop />
          <path
            d={`M ${CX - 21} ${HEAD_CY - 15} Q ${CX - 3} ${HEAD_CY - 25} ${CX + 14} ${HEAD_CY - 15}`}
            stroke={HAIR_HI}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            opacity={0.75}
          />
        </g>
      )
    }

    if (hairStyle === 'long') {
      return (
        <g>
          <path
            d={`M ${CX - HEAD_R + 4} ${HEAD_CY - 12} C ${CX - HEAD_R - 11} ${HEAD_CY + 26} ${CX - HEAD_R - 8} ${HEAD_CY + 60} ${CX - HEAD_R + 6} ${HEAD_CY + 76} L ${CX - 8} ${HEAD_CY + 76} C ${CX - HEAD_R + 11} ${HEAD_CY + 48} ${CX - HEAD_R + 11} ${HEAD_CY + 14} ${CX - HEAD_R + 13} ${HEAD_CY - 12} Z`}
            fill={HAIR}
            {...o}
          />
          <path
            d={`M ${CX + HEAD_R - 4} ${HEAD_CY - 12} C ${CX + HEAD_R + 11} ${HEAD_CY + 26} ${CX + HEAD_R + 8} ${HEAD_CY + 60} ${CX + HEAD_R - 6} ${HEAD_CY + 76} L ${CX + 8} ${HEAD_CY + 76} C ${CX + HEAD_R - 11} ${HEAD_CY + 48} ${CX + HEAD_R - 11} ${HEAD_CY + 14} ${CX + HEAD_R - 13} ${HEAD_CY - 12} Z`}
            fill={HAIR}
            {...o}
          />
          <HairTop />
          <path
            d={`M ${CX - 21} ${HEAD_CY - 15} Q ${CX - 3} ${HEAD_CY - 26} ${CX + 14} ${HEAD_CY - 15}`}
            stroke={HAIR_HI}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            opacity={0.7}
          />
        </g>
      )
    }

    return (
      <g>
        <HairTop />
        <path
          d={`M ${CX - HEAD_R - 1} ${HEAD_CY - 4} L ${CX - HEAD_R + 2} ${HEAD_CY + 9} L ${CX - HEAD_R + 9} ${HEAD_CY - 2} Z`}
          fill={HAIR}
          {...o}
        />
        <path
          d={`M ${CX + HEAD_R + 1} ${HEAD_CY - 4} L ${CX + HEAD_R - 2} ${HEAD_CY + 9} L ${CX + HEAD_R - 9} ${HEAD_CY - 2} Z`}
          fill={HAIR}
          {...o}
        />
        <path
          d={`M ${CX - 19} ${HEAD_CY - 16} Q ${CX - 3} ${HEAD_CY - 25} ${CX + 13} ${HEAD_CY - 16}`}
          stroke={HAIR_HI}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          opacity={0.75}
        />
      </g>
    )
  }

  const Eye = ({ side }: { side: -1 | 1 }) => (
    <g className={!eyesClosed ? 'avatar-blink' : undefined}>
      <ellipse cx={CX + side * eyeDX} cy={eyeY} rx={6.2} ry={7.4} fill="#ffffff" stroke={OUTLINE} strokeWidth={1.5} />
      <circle cx={CX + side * eyeDX} cy={eyeY + 1} r={5} fill="#4c7d63" />
      <circle cx={CX + side * eyeDX} cy={eyeY + 1.2} r={3.4} fill="#2f5a48" />
      <circle cx={CX + side * eyeDX} cy={eyeY + 1.2} r={2.3} fill={INK} />
      <circle cx={CX + side * eyeDX - 1.6} cy={eyeY - 1.8} r={1.8} fill="#fff" />
      <circle cx={CX + side * eyeDX + 1.4} cy={eyeY + 3} r={0.9} fill="#fff" opacity={0.85} />
      <path
        d={`M ${CX + side * eyeDX - 6.4} ${eyeY - 5.4} Q ${CX + side * eyeDX} ${eyeY - 9} ${CX + side * eyeDX + 6.4} ${eyeY - 5.4}`}
        stroke={OUTLINE}
        strokeWidth={2.2}
        fill="none"
        strokeLinecap="round"
      />
      {gender === 'female' && (
        <path
          d={`M ${CX + side * eyeDX - 7} ${eyeY - 6.4} l -2.6 -2.2`}
          stroke={OUTLINE}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      )}
    </g>
  )

  return (
    <svg
      viewBox="0 0 200 300"
      width={size}
      height={size * 1.5}
      className={className}
      aria-hidden
      style={{ overflow: 'visible', display: 'block' }}
    >
      <defs>
        <radialGradient id="glow4" cx="50%" cy="46%" r="50%">
          <stop offset="0%" stopColor={OUTFIT} stopOpacity="0.24" />
          <stop offset="70%" stopColor={OUTFIT} stopOpacity="0.05" />
          <stop offset="100%" stopColor={OUTFIT} stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx={CX} cy={150} r={108} fill="url(#glow4)" />
      <ellipse cx={CX} cy={252} rx={44} ry={7} fill="#000" opacity="0.28" />

      {action === 'bench' && (
        <g>
          <rect x={24} y={224} width={152} height={13} rx={6} fill="#465a6d" />
          <rect x={36} y={237} width={9} height={30} rx={3} fill="#31414f" />
          <rect x={155} y={237} width={9} height={30} rx={3} fill="#31414f" />
        </g>
      )}

      <g transform={`translate(${pose.dx} ${pose.dy})`}>
        <g transform={`rotate(${pose.rot} ${CX} ${HIP_Y})`}>
          <g transform={`translate(${CX} 150) scale(${pose.scale}) translate(${-CX} -150)`}>
            <g className={action === 'run' ? 'avatar-bob' : undefined}>
              <Leg side={-1} />
              <Leg side={1} />
              <Arm side={-1} />
              <Arm side={1} />

              <path d={torso} fill={SKIN} {...o} />

              {bellyOpacity > 0.02 && (
                <ellipse
                  cx={CX}
                  cy={HIP_Y - 28}
                  rx={halfWaist * 1.0}
                  ry={10 + 18 * bellyOpacity}
                  fill={SKIN_SHADE}
                  opacity={0.5 * bellyOpacity}
                />
              )}

              {gender === 'female' && (
                <path
                  d={`M ${CX - halfShoulder * 0.94} ${SHOULDER_Y + 12} Q ${CX} ${SHOULDER_Y + 30} ${CX + halfShoulder * 0.94} ${SHOULDER_Y + 12} L ${CX + halfShoulder * 0.9} ${SHOULDER_Y + 30} Q ${CX} ${SHOULDER_Y + 46} ${CX - halfShoulder * 0.9} ${SHOULDER_Y + 30} Z`}
                  fill={OUTFIT}
                  {...o}
                />
              )}

              {gender === 'male' && (
                <path
                  d={`M ${CX - halfShoulder * 0.6} ${SHOULDER_Y + 22} Q ${CX} ${SHOULDER_Y + 33} ${CX + halfShoulder * 0.6} ${SHOULDER_Y + 22}`}
                  stroke={SKIN_LINE}
                  strokeWidth={1.6}
                  fill="none"
                  opacity={0.5}
                />
              )}

              {absOpacity > 0.02 &&
                (gender === 'male' ? (
                  <g opacity={absOpacity * 0.75}>
                    <line
                      x1={CX}
                      y1={SHOULDER_Y + 48}
                      x2={CX}
                      y2={HIP_Y - 18}
                      stroke={SKIN_LINE}
                      strokeWidth={1.5}
                      opacity={0.5}
                    />
                    {[0, 1, 2].map((row) =>
                      [-1, 1].map((s) => (
                        <rect
                          key={`${row}${s}`}
                          x={CX + s * 7 - 6}
                          y={SHOULDER_Y + 52 + row * 12}
                          width={12}
                          height={5.8}
                          rx={2.9}
                          fill={SKIN_SHADE}
                          opacity={0.55}
                        />
                      )),
                    )}
                  </g>
                ) : (
                  <g opacity={absOpacity * 0.85} stroke={SKIN_LINE} strokeWidth={1.8} fill="none" strokeLinecap="round">
                    <path d={`M ${CX - 6} ${SHOULDER_Y + 50} Q ${CX - 9} ${SHOULDER_Y + 74} ${CX - 5} ${HIP_Y - 20}`} />
                    <path d={`M ${CX + 6} ${SHOULDER_Y + 50} Q ${CX + 9} ${SHOULDER_Y + 74} ${CX + 5} ${HIP_Y - 20}`} />
                  </g>
                ))}

              <path
                d={`M ${CX - halfHip - 2} ${HIP_Y - 20} L ${CX + halfHip + 2} ${HIP_Y - 20} L ${CX + halfHip + 3} ${HIP_Y + 14} L ${CX + 3} ${HIP_Y + 14} L ${CX} ${HIP_Y - 2} L ${CX - 3} ${HIP_Y + 14} L ${CX - halfHip - 3} ${HIP_Y + 14} Z`}
                fill={OUTFIT}
                {...o}
              />
              <rect x={CX - 2} y={HIP_Y - 20} width={4} height={30} fill="#ffffff" opacity={0.7} />

              <rect x={CX - 7.5} y={HEAD_CY + 16} width={15} height={28} rx={7} fill={SKIN_SHADE} {...o} />

              <circle cx={CX} cy={HEAD_CY} r={HEAD_R} fill={SKIN} {...o} />
              <circle cx={CX - HEAD_R + 1} cy={HEAD_CY + 5} r={4.5} fill={SKIN_SHADE} {...o} />
              <circle cx={CX + HEAD_R - 1} cy={HEAD_CY + 5} r={4.5} fill={SKIN_SHADE} {...o} />

              {renderHair()}

              {!eyesClosed && (
                <>
                  <path
                    d={`M ${CX - eyeDX - 7} ${eyeY - 13} Q ${CX - eyeDX} ${eyeY - 16} ${CX - eyeDX + 6} ${eyeY - 13}`}
                    stroke={INK}
                    strokeWidth={2.2}
                    fill="none"
                    strokeLinecap="round"
                  />
                  <path
                    d={`M ${CX + eyeDX - 6} ${eyeY - 13} Q ${CX + eyeDX} ${eyeY - 16} ${CX + eyeDX + 7} ${eyeY - 13}`}
                    stroke={INK}
                    strokeWidth={2.2}
                    fill="none"
                    strokeLinecap="round"
                  />
                </>
              )}

              {eyesClosed ? (
                <>
                  <path d={`M ${CX - eyeDX - 6} ${eyeY} q 6 5 12 0`} stroke={INK} strokeWidth={2.6} fill="none" strokeLinecap="round" />
                  <path d={`M ${CX + eyeDX - 6} ${eyeY} q 6 5 12 0`} stroke={INK} strokeWidth={2.6} fill="none" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <Eye side={-1} />
                  <Eye side={1} />
                </>
              )}

              <path
                d={`M ${CX - 1.5} ${eyeY + 9} Q ${CX + 1.5} ${eyeY + 11.5} ${CX - 1} ${eyeY + 12}`}
                stroke={SKIN_LINE}
                strokeWidth={1.8}
                fill="none"
                strokeLinecap="round"
              />

              {!eyesClosed && (
                <>
                  <ellipse cx={CX - 23} cy={eyeY + 10} rx={6.5} ry={3.6} fill="#ef8a80" opacity={0.24} />
                  <ellipse cx={CX + 23} cy={eyeY + 10} rx={6.5} ry={3.6} fill="#ef8a80" opacity={0.24} />
                </>
              )}

              <path d={mouth} stroke={INK} strokeWidth={2.4} fill="none" strokeLinecap="round" />
            </g>
          </g>
        </g>
      </g>

      {action === 'run' && (
        <g stroke={OUTFIT} strokeWidth={2.5} strokeLinecap="round" opacity={0.5}>
          <path d="M 24 152 L 8 152" />
          <path d="M 28 170 L 14 170" />
          <path d="M 24 188 L 10 188" />
        </g>
      )}

      {action === 'pushup' && (
        <line x1={8} y1={236} x2={192} y2={236} stroke="rgba(255,255,255,0.16)" strokeWidth={2} strokeDasharray="6 6" />
      )}

      {action === 'badminton' && (
        <g transform={`translate(${rightHand.hx + pose.dx} ${rightHand.hy + pose.dy})`}>
          <rect
            x={-2.5}
            y={-6}
            width={5}
            height={26}
            rx={2.5}
            fill="#8b6b4a"
            stroke={OUTLINE}
            strokeWidth={1.6}
            transform="rotate(-28)"
          />
          <g transform="translate(-14 -32) rotate(-28)">
            <ellipse cx={0} cy={0} rx={11} ry={13} fill="none" stroke="#c9d5e2" strokeWidth={2.5} />
            <ellipse cx={0} cy={0} rx={8} ry={10} fill="rgba(255,255,255,0.1)" />
          </g>
        </g>
      )}

      {action === 'bench' &&
        (() => {
          const hand = toWorld({ x: rightHand.hx, y: rightHand.hy })
          return (
            <g>
              <rect x={hand.x - 46} y={hand.y - 5} width={92} height={6} rx={3} fill="#9aa8b8" />
              <circle cx={hand.x - 48} cy={hand.y - 2} r={12} fill="#5c6b7c" />
              <circle cx={hand.x + 48} cy={hand.y - 2} r={12} fill="#5c6b7c" />
            </g>
          )
        })()}

      {action === 'sleep' && (
        <g fill={OUTFIT} fontWeight={700}>
          <text x={CX + 38} y={HEAD_CY - 26} fontSize={14} style={{ animation: 'zzz 2.4s ease-out infinite' }}>
            z
          </text>
          <text
            x={CX + 46}
            y={HEAD_CY - 38}
            fontSize={10}
            style={{ animation: 'zzz 2.4s ease-out infinite', animationDelay: '0.8s' }}
          >
            z
          </text>
        </g>
      )}

      {pulse && <circle cx={CX} cy={150} r={92} fill="none" stroke={OUTFIT} strokeWidth={2} opacity={0.4} />}
    </svg>
  )
}
