import { useState } from 'react'
import { Button, Field, inputClass } from '../components/ui'
import { explainError } from '../data/cloud.v2'
import { useStore } from '../data/store'

/**
 * 云端账号密码登录（2026-10-29 v2）。
 * - 全量走 CloudBase 账号，本地多账号锁已停用（旧 data/auth.ts 文件保留不删）；
 * - 前端自助注册 / 忘记密码：当前云端未开通邮件短信验证码通道，本轮不开放，账号由管理员创建；
 * - 登录成功后 store.cloudLogin 完成云端拉取、旧本地数据迁移与合并，cloudUser 更新自动进入主页。
 */
export function Auth() {
  const cloudLogin = useStore((s) => s.cloudLogin)

  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!account.trim() || !password) {
      setError('请输入账号和密码')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await cloudLogin(account.trim(), password)
    } catch (e) {
      setError(explainError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-center px-6 py-10">
      <div className="mb-8">
        <div className="text-[34px] font-bold leading-tight">塑我</div>
        <div className="mt-1 text-[14px] text-muted">登录后，你的记录会自动保存到云端，换手机也不会丢。</div>
      </div>

      <div className="flex flex-col gap-4">
        <Field label="账号">
          <input
            className={inputClass}
            placeholder="用户名"
            autoComplete="username"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
          />
        </Field>

        <Field label="密码">
          <input
            className={inputClass}
            type="password"
            autoComplete="current-password"
            placeholder="输入密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submit()
            }}
          />
        </Field>

        {error && <div className="rounded-2xl bg-danger/10 px-4 py-3 text-[13px] text-danger">{error}</div>}

        <Button className="mt-2" disabled={busy} onClick={() => void submit()}>
          {busy ? '登录中…' : '登录'}
        </Button>

        <div className="mt-2 text-center text-[12px] leading-relaxed text-muted/80">
          自助注册、忘记密码暂未开放；新账号请联系管理员开通。
        </div>
      </div>
    </div>
  )
}
