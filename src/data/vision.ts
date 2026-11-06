import { guessFiberByName, guessWater } from '../domain/water'
import type { MacroSet } from '../domain/types'

export interface VisionItem extends MacroSet {
  name: string
  grams: number
  /** 模型自评的把握程度，仅用于提示 */
  confidence?: number
}

export interface VisionConfig {
  baseUrl: string
  apiKey: string
  model: string
}

const KEY = 'fitpal:vision'

/**
 * 用户自己的 AI Key 只保存在内存里，不写 localStorage。
 * 原因：localStorage 是明文，能被导出/备份拿走；插件式加密存储要新增原生依赖，
 * 权衡后采用「仅本次运行有效、重启重新输入」的方案（设置页有说明）。
 */
let runtimeApiKey = ''

/** 一次性迁移：老版本把 Key 明文存过 localStorage，读到就搬进内存并立刻抹掉明文。 */
function migrateLegacyKey(): void {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return
    const p = JSON.parse(raw) as Partial<VisionConfig>
    if (typeof p.apiKey === 'string' && p.apiKey) runtimeApiKey = p.apiKey
    localStorage.setItem(
      KEY,
      JSON.stringify({
        baseUrl: typeof p.baseUrl === 'string' ? p.baseUrl : '',
        model: typeof p.model === 'string' ? p.model : '',
        apiKey: '',
      }),
    )
  } catch {
    /* 读不到就当没有旧数据 */
  }
}

if (typeof localStorage !== 'undefined') migrateLegacyKey()

export const VISION_PRESETS: { label: string; baseUrl: string; model: string; note?: string }[] = [
  {
    label: 'DeepSeek（deepseek-flash）',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-flash',
    note: '有图的模型，直接用自己的 key',
  },
  { label: '智谱 GLM-4V', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4v-flash', note: '有免费额度' },
  { label: '阿里百炼（通义）', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-vl-max' },
  { label: '火山方舟（豆包）', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', model: 'doubao-vision-pro-32k' },
  { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
]

/** 拍照后先压到 1024px，省流量也省钱（DeepSeek 单图最多按 1024 token 计） */
export async function shrinkImage(dataUrl: string, maxSide = 1024, quality = 0.82): Promise<string> {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('load failed'))
      i.src = dataUrl
    })
    const longest = Math.max(img.width, img.height)
    if (longest <= maxSide) return dataUrl
    const scale = maxSide / longest
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return dataUrl
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', quality)
  } catch {
    return dataUrl
  }
}

/** 默认就是 DeepSeek 的视觉模型，用户只需要填 Key */
export const DEFAULT_VISION: VisionConfig = {
  baseUrl: 'https://api.deepseek.com',
  apiKey: '',
  model: 'deepseek-flash',
}

export function loadVisionConfig(): VisionConfig {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_VISION, apiKey: runtimeApiKey }
    const p = JSON.parse(raw) as Partial<VisionConfig>
    return {
      baseUrl: typeof p.baseUrl === 'string' && p.baseUrl ? p.baseUrl : DEFAULT_VISION.baseUrl,
      apiKey: runtimeApiKey,
      model: typeof p.model === 'string' && p.model ? p.model : DEFAULT_VISION.model,
    }
  } catch {
    return { ...DEFAULT_VISION, apiKey: runtimeApiKey }
  }
}

export function saveVisionConfig(c: VisionConfig): void {
  // 只落盘非敏感配置；Key 只进内存
  runtimeApiKey = c.apiKey.trim()
  try {
    localStorage.setItem(KEY, JSON.stringify({ baseUrl: c.baseUrl, model: c.model, apiKey: '' }))
  } catch {
    /* 存不下不影响本次运行 */
  }
}

export function hasVisionConfig(): boolean {
  const c = loadVisionConfig()
  return Boolean(c.baseUrl && c.apiKey && c.model)
}

const PROMPT = `你是中国营养师。请识别这张照片里所有能吃的东西（包括主食、菜、饮料、零食），逐项估算重量并给出营养。

要求：
1. 只输出 JSON，不要解释、不要 markdown 代码块。
2. 格式：{"items":[{"name":"米饭","grams":150,"kcal":174,"protein":3.9,"carbs":38.9,"fat":0.5,"fiber":0.5,"water":65,"confidence":0.8}]}
3. grams 是中国家庭常见份量的估计值，只按照片里看得到的量估，不要往大了猜。
4. kcal 是这一份的总热量；protein/carbs/fat/fiber 是这一份的克数；water 是每 100g 的含水量（0–100 的整数）。
5. 算法：先取《中国食物成分表》每 100g 的数值，再乘 grams/100；最后必须满足 kcal ≈ 4×protein + 4×carbs + 9×fat（误差 10% 以内）。
6. 烹调油按实际做法只加一次：
   - 清蒸 / 水煮 / 白灼 / 凉拌 / 不刷油的烤：不额外加油；
   - 家常炒 / 爆炒：每份 5–8g 油；
   - 红烧 / 干煸 / 糖醋 / 油炸：每份 10–15g 油；
   - 同一锅油不要重复算到几个菜上，盘底汤汁也别全当成油。
7. 脂肪不要凭印象高估，参考每 100g：白米饭 0.3g、馒头 1g、蔬菜 <1g、瘦肉 3–6g、鸡胸 3.6g、鸡蛋 9.5g、豆腐 5–7g、火腿肠/香肠 15–25g、五花肉 55–60g、坚果 50–60g。
8. 水分参考（每 100g）：蔬菜水果 85–95，汤粥 90 上下，主食 60–70，肉类 55–70，油炸食品、坚果、饼干低于 10。
9. 混合菜（如宫保鸡丁）按整份估算，拆到主要食材没有意义。
10. 认不出来或照片里没有食物时输出 {"items":[]}。
11. confidence 用 0–1 表示你对份量估计的把握。`

function stripFence(s: string): string {
  return s
    .replace(/^\s*```(?:json)?/i, '')
    .replace(/```\s*$/i, '')
    .trim()
}

export class VisionError extends Error {}

function num(v: unknown): number {
  const n = typeof v === 'string' ? Number(v) : v
  return typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.round(n * 10) / 10) : 0
}

/** 允许缺省的数字：缺省返回 undefined，好让下游分清「模型没说」和「模型说是 0」 */
function optNum(v: unknown): number | undefined {
  const n = typeof v === 'string' ? Number(v) : v
  return typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.round(n * 10) / 10) : undefined
}

const round1 = (n: number) => Math.round(n * 10) / 10
const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi)

/**
 * 收口模型返回的一项：
 * - 克数和宏量都有物理上限（脂肪不可能比整份食物还重）；
 * - 热量和 4/4/9 对不上时以宏量为准（模型经常前后不一致，脂肪就是这么被算高的）。
 */
export function sanitizeItem(it: VisionItem): VisionItem {
  const grams = Math.round(clamp(it.grams, 1, 3000))
  const p = clamp(it.p, 0, grams)
  const c = clamp(it.c, 0, grams)
  const f = clamp(it.f, 0, grams)
  const fiber = it.fiber === undefined ? undefined : clamp(it.fiber, 0, grams)
  const water = it.water === undefined ? undefined : Math.round(clamp(it.water, 0, 100))

  const atwater = 4 * p + 4 * c + 9 * f
  let kcal = it.kcal
  if (kcal <= 0) kcal = atwater
  else if (atwater > 0 && Math.abs(kcal - atwater) > Math.max(30, kcal * 0.2)) kcal = atwater

  return {
    name: it.name,
    grams,
    kcal: Math.round(kcal),
    p: round1(p),
    c: round1(c),
    f: round1(f),
    fiber: fiber === undefined ? guessFiberByName(it.name) : round1(fiber),
    water: water ?? guessWater(it.name),
    confidence: it.confidence,
  }
}

export function parseVisionItems(text: string): VisionItem[] {
  let parsed: { items?: unknown }
  try {
    parsed = JSON.parse(stripFence(text)) as { items?: unknown }
  } catch {
    throw new VisionError('返回的不是标准 JSON，可能模型没按格式输出，重试一次试试')
  }
  const raw = Array.isArray(parsed.items) ? parsed.items : []
  return raw
    .map((it) => {
      const o = (it && typeof it === 'object' ? it : {}) as Record<string, unknown>
      return {
        name: typeof o.name === 'string' ? o.name.trim() : '',
        grams: num(o.grams),
        kcal: num(o.kcal),
        p: num(o.protein),
        c: num(o.carbs),
        f: num(o.fat),
        fiber: optNum(o.fiber),
        water: optNum(o.water),
        confidence: typeof o.confidence === 'number' ? o.confidence : undefined,
      }
    })
    .map(sanitizeItem)
    .filter((it) => it.name !== '' && it.kcal > 0)
}

export async function chat(messages: unknown[], temperature = 0.1): Promise<string> {
  const cfg = loadVisionConfig()
  if (!cfg.baseUrl || !cfg.apiKey || !cfg.model) {
    throw new VisionError('还没配置识别服务，去「我的 → AI 识图」填一下')
  }
  const url = `${cfg.baseUrl.replace(/\/+$/, '')}/chat/completions`
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({ model: cfg.model, temperature, messages }),
    })
  } catch {
    throw new VisionError('连不上识别服务。可能是网络问题，或服务商不允许浏览器直连（CORS）')
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new VisionError(`识别服务返回 ${res.status}：${body.slice(0, 120)}`)
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string | { type: string; text?: string }[] } }[]
  }
  const content = json.choices?.[0]?.message?.content
  const out =
    typeof content === 'string'
      ? content
      : Array.isArray(content)
        ? content.map((c) => c.text ?? '').join('')
        : ''
  if (!out) throw new VisionError('识别服务没有返回内容')
  return out
}

/** 调用 OpenAI 兼容的视觉接口识别一张照片 */
export async function recognizeImage(dataUrl: string): Promise<VisionItem[]> {
  const image = await shrinkImage(dataUrl)
  const text = await chat([
    {
      role: 'user',
      content: [
        { type: 'text', text: PROMPT },
        { type: 'image_url', image_url: { url: image } },
      ],
    },
  ])
  return parseVisionItems(text)
}

const RECALC_PROMPT = `你是中国营养师。下面是用户确认/修改过的食物和重量（单位克），请按中国食物成分表重新计算每一项的营养。

只输出 JSON，不要解释、不要 markdown：
{"items":[{"name":"牛肉（瘦）","grams":120,"kcal":300,"protein":31.2,"carbs":0,"fat":18,"fiber":0,"water":65}]}

要求：
1. name 用规范叫法（用户写「牛肉」就输出「牛肉（瘦）」）。
2. grams 原样返回，不要改重量。
3. kcal 是这一份的总热量，protein/carbs/fat/fiber 是这一份的克数，water 是每 100g 的含水量（0–100 的整数）。
4. 必须满足 kcal ≈ 4×protein + 4×carbs + 9×fat（误差 10% 以内）。
5. 项目数量与顺序必须和输入完全一致。`

/** 用户手改了菜名/克数后，让模型按新内容重算营养 */
export async function recalcItems(list: { name: string; grams: number }[]): Promise<VisionItem[]> {
  if (list.length === 0) return []
  const text = await chat([
    {
      role: 'user',
      content: [
        { type: 'text', text: RECALC_PROMPT },
        { type: 'text', text: JSON.stringify({ items: list }) },
      ],
    },
  ])
  return parseVisionItems(text)
}

const ESTIMATE_PROMPT = `你是中国营养师。用户想吃/吃了「{{Q}}」，请估算它的营养。

只输出 JSON，不要解释、不要 markdown：
{"items":[{"name":"牛肉面","grams":500,"kcal":600,"protein":28,"carbs":75,"fat":18,"fiber":2,"water":70,"confidence":0.6}]}

要求：
1. 按中国常见做法和一份的量估算，grams 写估重。
2. name 用规范叫法。
3. 最多 3 项（比如"汉堡+可乐"可以拆成两项）。
4. protein/carbs/fat/fiber 是这一份的克数，water 是每 100g 的含水量（0–100 的整数）。
5. 必须满足 kcal ≈ 4×protein + 4×carbs + 9×fat（误差 10% 以内）。`

/** 食物库里没有时，让 AI 估一个 */
export async function estimateFood(query: string): Promise<VisionItem[]> {
  const q = query.trim()
  if (!q) return []
  const text = await chat([
    { role: 'user', content: [{ type: 'text', text: ESTIMATE_PROMPT.replace('{{Q}}', q) }] },
  ])
  return parseVisionItems(text)
}