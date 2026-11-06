import { useState } from 'react'
import { Button } from './ui'
import { PrivacyPolicySheet } from './PrivacyPolicySheet'
import { PRIVACY_POLICY } from '../data/privacy'
import { useStore } from '../data/store'

/**
 * 隐私同意闸口。
 * 任何进入主界面的路径（密码登录 / 验证码登录 / 注册 / 老账号）都必须先过这一关；
 * 同意后写进 appdata.consent，跟数据一起同步到云端，换设备不用重复同意。
 */
export function ConsentGate() {
  const agreeConsent = useStore((s) => s.agreeConsent)
  const prevConsent = useStore((s) => s.data.consent)
  const [checked, setChecked] = useState(false)
  const [showPolicy, setShowPolicy] = useState(false)
  const [busy, setBusy] = useState(false)

  // 之前同意过、但政策版本变了：老用户重新同意一次，给一句说明免得困惑
  const reprompt = Boolean(prevConsent && prevConsent.policyVersion !== PRIVACY_POLICY.updatedAt)

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-center px-6 py-10">
      <div className="mb-6">
        <div className="text-[12px] tracking-[0.2em] text-accent">塑我</div>
        <h1 className="mt-2 text-[24px] font-bold leading-tight">开始之前，先确认一下</h1>
        <p className="mt-2 text-[13px] leading-6 text-muted">
          这个 App 会保存你的体重、饮食和运动记录，用来算热量和生成报表。先看一眼《隐私政策》，同意后就能用了。
        </p>
        {reprompt && (
          <p className="mt-2 rounded-xl bg-accent/10 px-3 py-2 text-[12px] leading-5 text-accent">
            隐私政策已更新（{PRIVACY_POLICY.updatedAt}），请重新阅读并确认；你的记录不受影响。
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-line bg-surface2/50 p-4 text-[12px] leading-6 text-muted">
        <div className="text-[12.5px] font-semibold text-ink">{PRIVACY_POLICY.title}</div>
        <p className="mt-1">{PRIVACY_POLICY.intro}</p>
        <button
          onClick={() => setShowPolicy(true)}
          className="mt-2 text-[12px] text-accent underline decoration-accent/40"
        >
          查看全文
        </button>
      </div>

      <label className="mt-4 flex items-start gap-2 px-1 text-[12px] leading-5 text-muted">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-line accent-[#3ddc97]"
        />
        <span>
          我已阅读并同意
          <button
            type="button"
            onClick={() => setShowPolicy(true)}
            className="mx-0.5 text-accent underline decoration-accent/40"
          >
            《隐私政策》
          </button>
          与《用户协议》
        </span>
      </label>

      <Button
        className="mt-5 w-full"
        disabled={!checked || busy}
        onClick={() => {
          setBusy(true)
          agreeConsent()
        }}
      >
        {busy ? '保存中…' : '同意并继续'}
      </Button>

      <p className="mt-3 px-1 text-[10.5px] leading-4 text-muted/50">
        不同意就无法使用记录功能；你随时可以在「我的」里导出数据或删除账号。
      </p>

      <PrivacyPolicySheet open={showPolicy} onClose={() => setShowPolicy(false)} />
    </div>
  )
}
