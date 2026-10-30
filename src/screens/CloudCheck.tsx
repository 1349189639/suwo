import { useBackToClose } from '../components/useBackToClose'
import { useState } from 'react'
import { Button, Card } from '../components/ui'
import { CLOUD_ENV, explainError, selfCheck, signIn, signOut, type CheckResult } from '../data/cloud'
import { TextField } from '../components/ui'

export function CloudCheck({ onClose }: { onClose: () => void }) {
  useBackToClose(onClose)
  const [results, setResults] = useState<CheckResult[]>([])
  const [busy, setBusy] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')

  const run = async () => {
    setBusy(true)
    setResults([])
    try {
      setResults(await selfCheck())
    } catch (e) {
      setMsg(explainError(e))
    } finally {
      setBusy(false)
    }
  }

  const doLogin = async () => {
    setBusy(true)
    setMsg('')
    try {
      const u = await signIn(email.trim(), password)
      setMsg(`登录成功：${u.email ?? u.uid}`)
    } catch (e) {
      setMsg(explainError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-canvas px-4 pb-4"
      style={{ paddingTop: 'max(44px, env(safe-area-inset-top))' }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[16px] font-semibold">云连接自检</span>
        <button onClick={onClose} className="text-[12px] text-muted">
          关闭
        </button>
      </div>

      <Card>
        <div className="text-[11px] text-muted">环境 ID</div>
        <div className="tabular text-[13px]">{CLOUD_ENV}</div>
        <Button className="mt-3 w-full" disabled={busy} onClick={() => void run()}>
          {busy ? '检测中…' : '开始检测'}
        </Button>
      </Card>

      {results.length > 0 && (
        <div className="mt-3 space-y-2">
          {results.map((r) => (
            <div key={r.name} className="rounded-2xl border border-line/60 bg-surface/70 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px]">{r.name}</span>
                <span className={r.ok ? 'text-[12px] text-accent' : 'text-[12px] text-[#ff6b81]'}>
                  {r.ok ? '正常' : '失败'}
                </span>
              </div>
              <div className="mt-1 text-[11px] leading-5 text-muted/70">{r.detail}</div>
            </div>
          ))}
        </div>
      )}

      <Card className="mt-3">
        <div className="mb-2 text-[12px] text-muted">测试登录（不会影响当前账号）</div>
        <div className="space-y-2">
          <TextField value={email} onChange={setEmail} placeholder="邮箱" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="密码"
            className="w-full rounded-xl border border-line bg-surface2/50 px-3 py-2.5 text-[14px] outline-none"
          />
        </div>
        <div className="mt-3 flex gap-2">
          <Button variant="soft" className="flex-1" disabled={busy || !email || !password} onClick={() => void doLogin()}>
            试登录
          </Button>
          <Button
            variant="soft"
            className="flex-1"
            onClick={async () => {
              await signOut()
              setMsg('已退出云账号')
            }}
          >
            退出云账号
          </Button>
        </div>
        {msg && <div className="mt-2 text-[11px] leading-5 text-accent">{msg}</div>}
      </Card>
    </div>
  )
}
