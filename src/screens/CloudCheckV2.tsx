import { useState } from 'react'
import { Button, Card, TextField } from '../components/ui'
import {
  CLOUD_ENV,
  explainError,
  selfCheck,
  signIn,
  signOut,
  currentUser,
  loadDoc,
  saveDoc,
  sessionDebug,
  type CheckResult,
} from '../data/cloud.v2'

/**
 * 云连接自检 v2（2026-10-29）
 * 入口：浏览器地址栏加 #cloud-v2 直接打开；不改动旧版 CloudCheck 页面。
 */
export function CloudCheckV2({ onClose }: { onClose: () => void }) {
  const [results, setResults] = useState<CheckResult[]>([])
  const [busy, setBusy] = useState(false)
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [debug, setDebug] = useState('')

  const showDebug = async () => {
    setBusy(true)
    setDebug('')
    try {
      setDebug(await sessionDebug())
    } catch (e) {
      setMsg(explainError(e))
    } finally {
      setBusy(false)
    }
  }

  const run = async () => {
    setBusy(true)
    setResults([])
    setMsg('')
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
      const u = await signIn(account.trim(), password)
      setMsg(`登录成功：${u.email || u.username || u.uid}`)
    } catch (e) {
      setMsg(explainError(e))
    } finally {
      setBusy(false)
    }
  }

  const doRoundTrip = async () => {
    setBusy(true)
    setMsg('')
    try {
      const u = await currentUser()
      if (!u) {
        setMsg('请先登录再测试读写')
        return
      }
      const stamp = { probe: true, at: Date.now() }
      await saveDoc(u.uid, stamp)
      const back = await loadDoc(u.uid)
      setMsg(back ? `云端读写成功，已回读：${JSON.stringify(back)}` : '写入成功但回读为空')
    } catch (e) {
      setMsg(explainError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-canvas px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[16px] font-semibold">云连接自检 v2</span>
        <button onClick={onClose} className="text-[12px] text-muted">
          关闭
        </button>
      </div>

      <Card>
        <div className="text-[11px] text-muted">环境 ID</div>
        <div className="tabular break-all text-[13px]">{CLOUD_ENV}</div>
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
        <div className="mb-2 text-[12px] text-muted">测试登录（不影响本机账号）</div>
        <div className="space-y-2">
          <TextField value={account} onChange={setAccount} placeholder="用户名 / 邮箱" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="密码"
            className="w-full rounded-xl border border-line bg-surface2/50 px-3 py-2.5 text-[14px] outline-none"
          />
        </div>
        <div className="mt-3 flex gap-2">
          <Button variant="soft" className="flex-1" disabled={busy || !account || !password} onClick={() => void doLogin()}>
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
        <Button variant="outline" className="mt-2 w-full" disabled={busy} onClick={() => void doRoundTrip()}>
          登录后：试写再读回
        </Button>
        <Button variant="soft" className="mt-2 w-full" disabled={busy} onClick={() => void showDebug()}>
          查看会话原始结构（诊断）
        </Button>
        {msg && <div className="mt-2 text-[11px] leading-5 text-accent">{msg}</div>}
        {debug && (
          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-line/60 bg-surface2/50 p-2 text-[10px] leading-4 text-muted">
            {debug}
          </pre>
        )}
      </Card>
    </div>
  )
}
