/**
 * 本机账号系统：账号和密码只存在这台设备上，不联网。
 * 它不是服务端认证（换设备不会同步），但足够做"多个人共用一台手机"和"打开要解锁"。
 */

export interface Account {
  id: string
  name: string
  salt: string
  hash: string
  createdAt: number
}

const ACC_KEY = 'suwo:accounts'
const SESSION_KEY = 'suwo:session'
const LEGACY_DATA_KEY = 'fitpal:v1'

function readAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(ACC_KEY)
    const list = raw ? (JSON.parse(raw) as unknown) : []
    if (!Array.isArray(list)) return []
    return list
      .filter((a): a is Account => !!a && typeof (a as Account).id === 'string')
      .map((a) => ({ ...a }))
  } catch {
    return []
  }
}

function writeAccounts(list: Account[]): void {
  localStorage.setItem(ACC_KEY, JSON.stringify(list))
}

function randomSalt(): string {
  const buf = new Uint8Array(8)
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(buf)
  else for (let i = 0; i < buf.length; i += 1) buf[i] = Math.floor(Math.random() * 256)
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** http 局域网下没有 crypto.subtle，退化成简单哈希（本机锁，不是安全认证） */
function weakHash(text: string): string {
  let h = 5381
  for (let i = 0; i < text.length; i += 1) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0
  let h2 = 52711
  for (let i = text.length - 1; i >= 0; i -= 1) h2 = ((h2 << 5) + h2 + text.charCodeAt(i)) >>> 0
  return h.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')
}

async function digest(text: string): Promise<string> {
  try {
    if (globalThis.crypto?.subtle) {
      const buf = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    }
  } catch {
    /* 落到弱哈希 */
  }
  return weakHash(text)
}

export function listAccounts(): Account[] {
  return readAccounts()
}

export function currentAccountId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

export function currentAccount(): Account | null {
  const id = currentAccountId()
  if (!id) return null
  return readAccounts().find((a) => a.id === id) ?? null
}

export function setSession(id: string | null): void {
  if (id) localStorage.setItem(SESSION_KEY, id)
  else localStorage.removeItem(SESSION_KEY)
}

function validate(name: string, password: string, confirm?: string): string | null {
  if (name.trim().length < 2) return '账号至少 2 个字符'
  if (name.trim().length > 20) return '账号最多 20 个字符'
  if (/\s/.test(name.trim())) return '账号里不要有空格'
  if (password.length < 6) return '密码至少 6 位'
  if (confirm !== undefined && confirm !== password) return '两次输入的密码不一样'
  return null
}

/** 注册成功后自动登录，并把旧版单机数据搬到这个账号名下 */
export async function register(name: string, password: string, confirm: string) {
  const err = validate(name, password, confirm)
  if (err) return { ok: false as const, error: err }

  const accounts = readAccounts()
  const key = name.trim().toLowerCase()
  if (accounts.some((a) => a.name.toLowerCase() === key)) {
    return { ok: false as const, error: '这个账号已经注册过了' }
  }

  const salt = randomSalt()
  const hash = await digest(`${salt}:${password}`)
  const account: Account = {
    id: `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim(),
    salt,
    hash,
    createdAt: Date.now(),
  }
  writeAccounts([...accounts, account])
  setSession(account.id)

  // 老数据迁移：只有一个账号且旧数据存在时，搬一次
  try {
    const legacy = localStorage.getItem(LEGACY_DATA_KEY)
    const target = `${LEGACY_DATA_KEY}:${account.id}`
    if (legacy && !localStorage.getItem(target)) localStorage.setItem(target, legacy)
  } catch {
    /* 忽略 */
  }

  return { ok: true as const, id: account.id }
}

export async function login(name: string, password: string) {
  const accounts = readAccounts()
  const key = name.trim().toLowerCase()
  const account = accounts.find((a) => a.name.toLowerCase() === key)
  if (!account) return { ok: false as const, error: '没有这个账号' }
  const hash = await digest(`${account.salt}:${password}`)
  if (hash !== account.hash) return { ok: false as const, error: '密码不对' }
  setSession(account.id)
  return { ok: true as const, id: account.id }
}

export function logout(): void {
  setSession(null)
}

export function removeAccount(id: string): void {
  writeAccounts(readAccounts().filter((a) => a.id !== id))
  try {
    localStorage.removeItem(`${LEGACY_DATA_KEY}:${id}`)
  } catch {
    /* 忽略 */
  }
  if (currentAccountId() === id) setSession(null)
}
