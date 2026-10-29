import { useState } from 'react'
import { Avatar } from '../components/Avatar'
import { Button, Field } from '../components/ui'
import { login, register } from '../data/auth'
import { defaultLook } from '../domain/look'
import type { AvatarAction } from '../domain/types'

export function Auth({ onDone }: { onDone: (id: string) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('register')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [agree, setAgree] = useState(false)

  const submit = async () => {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const res =
        mode === 'register'
          ? await register(name, password, confirm)
          : await login(name, password)
      if (res.ok) onDone(res.id)
      else setError(res.error)
    } catch {
      setError('出了点问题，再试一次')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-6 pb-10 pt-12">
      <div className="flex flex-col items-center">
        <Avatar build={0.36} muscle={0.75} gender="male" spirit={80} action={'idle' as AvatarAction} look={defaultLook('male')} size={112} />
        <h1 className="mt-2 text-[26px] font-bold tracking-wide">塑我</h1>
        <p className="mt-1 text-[12px] text-muted">记录吃进去的，看见练出来的</p>
      </div>

      <div className="mt-8 flex gap-1 rounded-2xl bg-surface2/80 p-1">
        {([
          { v: 'register', t: '注册' },
          { v: 'login', t: '登录' },
        ] as const).map((o) => (
          <button
            key={o.v}
            onClick={() => {
              setMode(o.v)
              setError('')
            }}
            className={`flex-1 rounded-xl py-2.5 text-[14px] font-medium transition ${
              mode === o.v ? 'bg-accent/15 text-accent' : 'text-muted'
            }`}
          >
            {o.t}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        <Field label="账号">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={mode === 'register' ? '给自己起个名字，2-20 个字符' : '请输入你的账号'}
            autoCapitalize="none"
            autoCorrect="off"
            className="w-full rounded-2xl border border-line bg-surface2/70 px-4 py-3.5 text-[16px] outline-none focus:border-accent/60"
          />
        </Field>
        <Field label="密码">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'register' ? '设置密码，至少 6 位' : '请输入你的密码'}
            className="w-full rounded-2xl border border-line bg-surface2/70 px-4 py-3.5 text-[16px] outline-none focus:border-accent/60"
          />
        </Field>
        {mode === 'register' && (
          <Field label="再输一次密码">
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="确认密码"
              className="w-full rounded-2xl border border-line bg-surface2/70 px-4 py-3.5 text-[16px] outline-none focus:border-accent/60"
            />
          </Field>
        )}
      </div>

      {error && <p className="mt-3 px-1 text-[12px] text-danger">{error}</p>}

      {mode === 'register' && (
        <>
          <label className="mt-4 flex items-start gap-2 text-[12px] leading-5 text-muted">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#3ddc97]"
            />
            <span>
              我已阅读并同意下面的《隐私说明》，知道我的数据会保存在云端
            </span>
          </label>

          <details className="mt-2 rounded-xl border border-line/60 bg-surface2/30 px-3 py-2 text-[11px] leading-5 text-muted/80">
            <summary className="cursor-pointer text-[12px] text-accent/80">隐私说明</summary>
            <div className="mt-2 space-y-1.5">
              <p><b>我们收集：</b>邮箱、身高体重年龄性别，以及你自己记录的饮食、运动、饮水、花费。</p>
              <p><b>存在哪：</b>腾讯云（中国境内机房），只有你的账号能读写自己的数据。</p>
              <p><b>用来做什么：</b>只用于给你算热量、出统计和建议。不做广告定向，不卖给任何第三方。</p>
              <p><b>你的权利：</b>随时可以在「我的 → 数据」导出全部记录；随时可以删除账号，删除后数据一并清除。</p>
              <p><b>不会收集：</b>通讯录、短信、位置、相册原图（拍照识图只在识别时上传，不长期保存）。</p>
            </div>
          </details>
        </>
      )}

      <Button className="mt-5 w-full" disabled={busy || !name || !password || (mode === 'register' && !agree)} onClick={() => void submit()}>
        {busy ? '处理中…' : mode === 'register' ? '注册并开始' : '登录'}
      </Button>

      <p className="mt-4 px-1 text-[10.5px] leading-4 text-muted/45">
        账号只存在这台设备上，不联网、不上传。换手机不会同步，数据可以用「我的 → 导出」带走。
      </p>
    </div>
  )
}
