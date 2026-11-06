import { ADVICE_TEMPLATES, filterByBudget, type AdviceTemplate } from '../data/adviceCopy'
import type { DietGroup, EatingContext, EatingProfile } from './types'

export interface ActionOption {
  id: string
  text: string
  context: EatingContext
  extraCost: 'none' | 'low' | 'normal'
  source: string
}

function toOption(t: AdviceTemplate, context: EatingContext): ActionOption {
  return {
    id: t.id,
    text: t.text,
    context: t.context === 'any' ? context : t.context,
    extraCost: t.extraCost,
    source: t.source,
  }
}

/**
 * 挑一条「当下做得到」的建议。
 * 规则：场景优先 → 预算过滤（紧时只留零成本）→ 零成本优先 → 同 gap 只出一条。
 */
export function pickOption(
  gap: DietGroup | 'general',
  profile: EatingProfile,
  override?: EatingContext,
): ActionOption | null {
  const context = override ?? profile.mainContext
  const byBudget = filterByBudget(ADVICE_TEMPLATES, profile.budgetLevel)
  const exact = byBudget.filter((t) => t.gap === gap && (t.context === context || t.context === 'any'))
  const general = byBudget.filter((t) => t.gap === 'general' && (t.context === context || t.context === 'any'))
  const pool = [...exact, ...general].sort((a, b) => costRank(a) - costRank(b))
  const hit = pool[0]
  return hit ? toOption(hit, context) : null
}

/** 最多 N 条，去重，成本低者优先 */
export function pickOptions(
  gaps: (DietGroup | 'general')[],
  profile: EatingProfile,
  max = 2,
  override?: EatingContext,
): ActionOption[] {
  const out: ActionOption[] = []
  for (const gap of gaps) {
    const opt = pickOption(gap, profile, override)
    if (opt && !out.some((o) => o.id === opt.id)) out.push(opt)
    if (out.length >= max) break
  }
  return out
}

function costRank(t: AdviceTemplate): number {
  return t.extraCost === 'none' ? 0 : t.extraCost === 'low' ? 1 : 2
}
