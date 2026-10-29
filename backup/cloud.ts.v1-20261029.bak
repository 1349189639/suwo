import cloudbase from '@cloudbase/js-sdk'

/** 腾讯云开发环境 ID（可公开，不是密钥） */
export const CLOUD_ENV = 'LXEAuXDLGkC73q2Sayxykr'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cached: any = null

function app() {
  if (!cached) cached = cloudbase.init({ env: CLOUD_ENV })
  return cached
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function auth(): any {
  return app().auth({ persistence: 'local' })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): any {
  return app().database()
}

export interface CloudUser {
  uid: string
  email?: string
}

/** 把 SDK 报错翻译成人话 + 该去哪儿开 */
export function explainError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e)
  const s = raw.toLowerCase()
  if (s.includes('domain') || s.includes('origin') || s.includes('非法域名') || s.includes('安全域名')) {
    return `域名未加白名单：去「云开发控制台 → 环境 → 安全配置 → WEB 安全域名」加上当前访问域名。原始错误：${raw}`
  }
  if (s.includes('not enabled') || s.includes('未开启') || s.includes('method') || s.includes('不支持')) {
    return `邮箱登录未开启：去「云开发控制台 → 身份认证 → 登录方式」开启「邮箱密码登录」。原始错误：${raw}`
  }
  if (s.includes('password') || s.includes('密码')) return `邮箱或密码不正确。原始错误：${raw}`
  if (s.includes('permission') || s.includes('权限')) {
    return `数据库权限不足：去「数据库 → 权限设置」把 appdata 集合设成「仅创建者可读写」。原始错误：${raw}`
  }
  if (s.includes('network') || s.includes('timeout') || s.includes('fetch')) {
    return `网络不通：检查手机联网，或该域名被限制。原始错误：${raw}`
  }
  return raw
}

export async function signUp(email: string, password: string): Promise<CloudUser> {
  const a = auth()
  if (typeof a.signUpWithEmailAndPassword !== 'function') {
    throw new Error('当前 SDK 不支持邮箱注册，请检查云开发是否开启邮箱登录')
  }
  await a.signUpWithEmailAndPassword(email, password)
  const u = await currentUser()
  if (!u) throw new Error('注册成功但没有拿到登录态，请检查邮箱登录配置')
  return u
}

export async function signIn(email: string, password: string): Promise<CloudUser> {
  const a = auth()
  await a.signInWithEmailAndPassword(email, password)
  const u = await currentUser()
  if (!u) throw new Error('登录成功但没有拿到用户信息')
  return u
}

export async function signOut(): Promise<void> {
  await auth().signOut()
}

export async function currentUser(): Promise<CloudUser | null> {
  try {
    const a = auth()
    const state = a.hasLoginState?.() ?? (await a.getLoginState())
    const user = state?.user
    if (user?.uid) return { uid: user.uid as string, email: user.email as string | undefined }
    return null
  } catch {
    return null
  }
}

/** 读整档数据（当前阶段：一份文档，后续拆表） */
export async function loadDoc(uid: string): Promise<Record<string, unknown> | null> {
  const res = await db().collection('appdata').doc(uid).get()
  const d = res?.data
  const row = Array.isArray(d) ? d[0] : d
  const doc = row?.doc
  return doc && typeof doc === 'object' ? (doc as Record<string, unknown>) : null
}

export async function saveDoc(uid: string, doc: unknown): Promise<void> {
  await db()
    .collection('appdata')
    .doc(uid)
    .set({ doc, updated_at: Date.now() })
}

export interface CheckResult {
  name: string
  ok: boolean
  detail: string
}

/** 连接自检：逐项告诉用户卡在哪 */
export async function selfCheck(): Promise<CheckResult[]> {
  const out: CheckResult[] = []

  try {
    app()
    out.push({ name: 'SDK 初始化', ok: true, detail: `环境 ${CLOUD_ENV}` })
  } catch (e) {
    out.push({ name: 'SDK 初始化', ok: false, detail: explainError(e) })
    return out
  }

  const a = auth()
  out.push({
    name: '邮箱登录接口',
    ok: typeof a.signUpWithEmailAndPassword === 'function' && typeof a.signInWithEmailAndPassword === 'function',
    detail:
      typeof a.signInWithEmailAndPassword === 'function'
        ? '接口可用'
        : 'SDK 里没有邮箱登录方法，请确认云开发已开启「邮箱密码登录」',
  })

  try {
    const u = await currentUser()
    out.push({ name: '登录态', ok: true, detail: u ? `已登录 ${u.email ?? u.uid}` : '未登录（正常）' })
  } catch (e) {
    out.push({ name: '登录态', ok: false, detail: explainError(e) })
  }

  try {
    await db().collection('appdata').limit(1).get()
    out.push({ name: '数据库读取', ok: true, detail: 'appdata 集合可访问' })
  } catch (e) {
    out.push({ name: '数据库读取', ok: false, detail: explainError(e) })
  }

  return out
}
