import type { FoodCategory, FoodItem, MacroSet } from '../domain/types'

export interface BarcodeProduct {
  code: string
  name: string
  brand?: string
  per100: MacroSet
}

function round1(v: number): number {
  return Math.round(v * 10) / 10
}

/**
 * 通过 Open Food Facts 公开库查条码（无需 API Key）。
 * 覆盖率：进口/国际品牌较好，国产零食偏弱，查不到时引导手动录入。
 */
export async function lookupBarcode(code: string): Promise<BarcodeProduct | null> {
  const fields = 'product_name,product_name_zh,brands,nutriments'
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${fields}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal })
    if (!res.ok) return null
    const json = (await res.json()) as {
      status?: number
      product?: {
        product_name?: string
        product_name_zh?: string
        brands?: string
        nutriments?: Record<string, number | string>
      }
    }
    if (json.status !== 1 || !json.product) return null

    const n = json.product.nutriments ?? {}
    const rawKcal = n['energy-kcal_100g'] ?? (n['energy_100g'] ? Number(n['energy_100g']) / 4.184 : 0)
    const kcal = Number(rawKcal)
    if (!Number.isFinite(kcal) || kcal <= 0) return null

    return {
      code,
      name: (json.product.product_name_zh || json.product.product_name || `条码 ${code}`).trim(),
      brand: json.product.brands?.trim() || undefined,
      per100: {
        kcal: Math.round(kcal),
        p: round1(Number(n['proteins_100g'] ?? 0)),
        c: round1(Number(n['carbohydrates_100g'] ?? 0)),
        f: round1(Number(n['fat_100g'] ?? 0)),
      },
    }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** 扫码结果转成可复用的自定义食物 */
export function toFoodItem(p: BarcodeProduct, category: FoodCategory = 'snack'): FoodItem {
  return {
    id: `bc_${p.code}`,
    name: p.brand ? `${p.name}（${p.brand}）` : p.name,
    category,
    tags: ['扫码', ...(p.brand ? [p.brand] : [])],
    per100: p.per100,
    defaultGrams: 100,
    custom: true,
  }
}
