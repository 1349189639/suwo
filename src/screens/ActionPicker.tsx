import { useStore } from '../data/store'
import type { AvatarAction } from '../domain/types'

const OPTIONS: { id: AvatarAction; icon: string; label: string; desc: string }[] = [
  { id: 'run', icon: '🏃', label: '跑步', desc: '有氧，心率 130–150' },
  { id: 'badminton', icon: '🏸', label: '羽毛球', desc: '单打 7 MET' },
  { id: 'pushup', icon: '💪', label: '俯卧撑', desc: '自重，胸和三头' },
  { id: 'bench', icon: '🏋️', label: '卧推', desc: '杠铃，练胸' },
  { id: 'flex', icon: '✨', label: '秀一下', desc: '看看腹肌' },
  { id: 'idle', icon: '🧍', label: '站着', desc: '待机' },
  { id: 'sleep', icon: '😴', label: '歇着', desc: '休息也是训练的一部分' },
]

export function ActionPicker({ onClose }: { onClose: () => void }) {
  const current = useStore((s) => s.data.avatarAction ?? 'idle')
  const setAvatarAction = useStore((s) => s.setAvatarAction)

  return (
    <div className="anim-rise grid grid-cols-2 gap-2.5 pb-2">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          onClick={() => {
            setAvatarAction(o.id)
            onClose()
          }}
          className={`flex flex-col items-start gap-1 rounded-2xl border p-3.5 text-left transition active:scale-[0.97] ${
            current === o.id ? 'border-accent/60 bg-accent/10' : 'border-line bg-surface2/40'
          }`}
        >
          <span className="text-[22px] leading-none">{o.icon}</span>
          <span className="mt-1 text-[14px] font-semibold">{o.label}</span>
          <span className="text-[10.5px] leading-4 text-muted/70">{o.desc}</span>
        </button>
      ))}
      <p className="col-span-2 px-1 pt-1 text-[10.5px] leading-4 text-muted/50">
        换动作只是让小人演示，不会自动记一次运动。真练了，记得去「记运动」。
      </p>
    </div>
  )
}
