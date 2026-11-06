import { useEffect, useRef, useState } from 'react'
import { Button, Field, inputClass } from '../components/ui'
import { PrivacyPolicySheet } from '../components/PrivacyPolicySheet'
import {
  explainError,
  isValidPhone,
  normalizePhone,
  startPhoneLogin,
  startPhoneSignUp,
  type PhoneAuthFlow,
} from '../data/cloud.v2'
import { useStore } from '../data/store'

type Mode = 'password' | 'phone' | 'register' | 'forgot'

const COUNTDOWN = 30

/** 密码规则：8–32 位，必须同时含字母和数字（与云端口径一致） */
function checkPassword(pwd: string): string | null {
  if (pwd.length < 8 || pwd.length > 32) return '密码需 8–32 位'
  if (!/[A-Za-z]/.test(pwd) || !/\d/.test(pwd)) return '密码需同时包含字母和数字'
  return null
}

export function Auth() {
  const cloudLogin = useStore((s) => s.cloudLogin)
  const cloudCompleteLogin = useStore((s) => s.cloudCompleteLogin)
  const agreeConsent = useStore((s) => s.agreeConsent)

  const [mode, setMode] = useState<Mode>('password')

  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [pwd, setPwd] = useState('')
  const [pwd2, setPwd2] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [showPolicy, setShowPolicy] = useState(false)

  const [busy, setBusy] = useState(false)
  const [sending, setSending] = useState(false)
  const [left, setLeft] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  // SDK 返回的 verifyOtp 回调，必须复用同一个对象（里面带 messageId）
  const flowRef = useRef<PhoneAuthFlow | null>(null)

  useEffect(() => {
    if (left <= 0) return
    const t = setTimeout(() => setLeft((n) => n - 1), 1000)
    return () => clearTimeout(t)
  }, [left])

  const reset = (next: Mode) => {
    setMode(next)
    setError(null)
    setInfo(null)
    setCode('')
    flowRef.current = null
    setLeft(0)
  }

  const submitPassword = async () => {
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

  const sendCode = async (kind: 'login' | 'register') => {
    if (!isValidPhone(phone)) {
      setError('请输入 11 位手机号')
      return
    }
    if (kind === 'register') {
      const bad = checkPassword(pwd)
      if (bad) {
        setError(bad)
        return
      }
      if (pwd !== pwd2) {
        setError('两次输入的密码不一致')
        return
      }
    }
    setSending(true)
    setError(null)
    setInfo(null)
    try {
      const flow =
        kind === 'register'
          ? await startPhoneSignUp(phone, pwd)
          : await startPhoneLogin(phone)
      flowRef.current = flow
      setLeft(COUNTDOWN)
      setInfo(`验证码已发到 ${normalizePhone(phone)}，${COUNTDOWN} 秒内可重发`)
    } catch (e) {
      setError(explainError(e))
    } finally {
      setSending(false)
    }
  }

  const verifyAndEnter = async () => {
    if (!flowRef.current) {
      setError('请先获取验证码')
      return
    }
    if (!/^\d{4,8}$/.test(code.trim())) {
      setError('请输入短信里的验证码')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await flowRef.current.verify(code.trim())
      await cloudCompleteLogin()
      // 注册页已经勾过《隐私政策》，直接落一条同意记录，避免进来又弹一次
      if (mode === 'register' && agreed) agreeConsent()
    } catch (e) {
      setError(explainError(e))
    } finally {
      setBusy(false)
    }
  }

  const submitRegister = async () => {
    if (!agreed) {
      setError('请先阅读并同意《隐私政策》')
      return
    }
    await verifyAndEnter()
  }

  const phoneField = (
    <Field label="手机号" hint="中国大陆 +86">
      <input
        className={inputClass}
        inputMode="tel"
        placeholder="13800138000"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
    </Field>
  )

  const codeBlock = (kind: 'login' | 'register') => (
    <Field label="验证码">
      <div className="flex gap-2">
        <input
          className={inputClass}
          inputMode="numeric"
          placeholder="6 位数字"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <Button
          variant="soft"
          className="shrink-0 px-4 text-[12px]"
          disabled={sending || left > 0}
          onClick={() => void sendCode(kind)}
        >
          {left > 0 ? `${left}s` : sending ? '发送中…' : '获取验证码'}
        </Button>
      </div>
    </Field>
  )

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-center px-6 py-10">
      <div className="mb-6">
        <div className="text-[34px] font-bold leading-tight">塑我</div>
        <div className="mt-1 text-[14px] text-muted">登录后，你的记录会自动保存到云端，换手机也不会丢。</div>
      </div>

      {mode === 'password' && (
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
                if (e.key === 'Enter') void submitPassword()
              }}
            />
          </Field>
          {error && <div className="rounded-2xl bg-danger/10 px-4 py-3 text-[13px] text-danger">{error}</div>}
          <Button className="mt-1" disabled={busy} onClick={() => void submitPassword()}>
            {busy ? '登录中…' : '登录'}
          </Button>
        </div>
      )}

      {mode === 'phone' && (
        <div className="flex flex-col gap-4">
          {phoneField}
          {codeBlock('login')}
          {info && <div className="rounded-2xl bg-accent/10 px-4 py-3 text-[12px] text-accent">{info}</div>}
          {error && <div className="rounded-2xl bg-danger/10 px-4 py-3 text-[13px] text-danger">{error}</div>}
          <Button disabled={busy} onClick={() => void verifyAndEnter()}>
            {busy ? '登录中…' : '登录'}
          </Button>
        </div>
      )}

      {mode === 'register' && (
        <div className="flex flex-col gap-3.5">
          {phoneField}
          <Field label="设置密码" hint="8–32 位，含字母和数字">
            <input
              className={inputClass}
              type="password"
              autoComplete="new-password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
            />
          </Field>
          <Field label="确认密码">
            <input
              className={inputClass}
              type="password"
              autoComplete="new-password"
              value={pwd2}
              onChange={(e) => setPwd2(e.target.value)}
            />
          </Field>
          {codeBlock('register')}

          <label className="flex items-start gap-2 px-1 text-[11.5px] leading-5 text-muted">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
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
            </span>
          </label>

          {info && <div className="rounded-2xl bg-accent/10 px-4 py-3 text-[12px] text-accent">{info}</div>}
          {error && <div className="rounded-2xl bg-danger/10 px-4 py-3 text-[13px] text-danger">{error}</div>}

          <Button disabled={busy || !agreed} onClick={() => void submitRegister()}>
            {busy ? '注册中…' : '注册并登录'}
          </Button>
        </div>
      )}

      {mode === 'forgot' && (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-line bg-surface2/50 p-4 text-[12.5px] leading-6 text-muted">
            <div className="text-[13px] font-semibold text-ink">忘记密码怎么办</div>
            <p className="mt-1.5">
              当前环境只开放了两种登录方式：<span className="text-ink">用户名 + 密码</span> 和{' '}
              <span className="text-ink">手机号 + 验证码</span>。
              没有邮箱通道，所以做不了「邮件重置密码」。
            </p>
            <p className="mt-1.5">
              如果你的账号绑过手机号：用验证码登录进来，再到「我的 → 修改密码」设新密码就行。
            </p>
            <p className="mt-1.5">
              如果没绑手机号：用原密码登录后，同样在「我的 → 修改密码」里改。
            </p>
          </div>
          <Button onClick={() => reset('phone')}>用手机号验证码登录</Button>
          <Button variant="soft" onClick={() => reset('password')}>
            返回账号密码登录
          </Button>
        </div>
      )}

      {error && mode === 'forgot' && (
        <div className="mt-3 rounded-2xl bg-danger/10 px-4 py-3 text-[13px] text-danger">{error}</div>
      )}

      {/* 入口切换 */}
      <div className="mt-6 flex items-center justify-center gap-4 text-[12px] text-muted">
        {mode !== 'password' && (
          <button className="text-accent" onClick={() => reset('password')}>
            账号密码登录
          </button>
        )}
        {mode !== 'phone' && (
          <button className="text-accent" onClick={() => reset('phone')}>
            手机号验证码登录
          </button>
        )}
        {mode !== 'register' && (
          <button className="text-accent" onClick={() => reset('register')}>
            注册新账号
          </button>
        )}
        {mode !== 'forgot' && (
          <button onClick={() => reset('forgot')}>忘记密码</button>
        )}
      </div>

      <button
        onClick={() => setShowPolicy(true)}
        className="mt-4 text-center text-[10.5px] text-muted/50"
      >
        隐私政策
      </button>

      <PrivacyPolicySheet open={showPolicy} onClose={() => setShowPolicy(false)} />
    </div>
  )
}
