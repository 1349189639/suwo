import { Sheet } from './ui'
import { PRIVACY_POLICY } from '../data/privacy'

/** 隐私政策弹层：注册页勾选前可点开阅读 */
export function PrivacyPolicySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const doc = PRIVACY_POLICY
  return (
    <Sheet open={open} title={doc.title} subtitle={`更新于 ${doc.updatedAt}`} onClose={onClose}>
      <div className="space-y-3 pb-2 text-[12px] leading-5 text-muted">
        <p className="text-[12.5px] text-ink">{doc.intro}</p>
        {doc.sections.map((s) => (
          <div key={s.h}>
            <div className="text-[12.5px] font-semibold text-ink">{s.h}</div>
            <p className="mt-1">{s.p}</p>
          </div>
        ))}
        <div className="rounded-2xl bg-surface2/60 p-3 text-[11px] leading-4">
          <div className="text-muted">联系方式</div>
          <div className="mt-0.5 text-ink">{doc.contact}</div>
        </div>
      </div>
    </Sheet>
  )
}
