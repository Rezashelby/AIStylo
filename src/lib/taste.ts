import type { Product, StyleProfile } from '@/types'
import { byId } from '@/data/catalog'

/**
 * Taste learned from Style Shuffle.
 *
 * A love or a pass on one garment says something about every garment that
 * shares its traits — brand, material, descriptors, register. Each rating
 * spreads a small weight across those traits; a candidate then scores by the
 * traits it carries. Directly rated pieces get a stronger, explicit signal.
 */

/** The traits a rating is spread across. */
function features(p: Product): string[] {
  const register = p.formality >= 4 ? 'dressed' : p.formality <= 2 ? 'casual' : 'smart'
  return [
    ...p.tags.map((t) => `tag:${t}`),
    `brand:${p.brand}`,
    `material:${p.material.toLowerCase().split(' ').pop()}`,
    `register:${register}`,
  ]
}

// Profiles are replaced, never mutated, so the object itself is a safe key.
const cache = new WeakMap<StyleProfile, Map<string, number>>()

/** Trait → net weight. Positive traits recur in loves, negative in passes. */
export function tasteWeights(profile?: StyleProfile): Map<string, number> {
  const hit = profile && cache.get(profile)
  if (hit) return hit
  const w = new Map<string, number>()
  const add = (ids: string[] | undefined, sign: number) => {
    for (const id of ids ?? []) {
      const p = byId(id)
      if (!p) continue
      for (const f of features(p)) w.set(f, (w.get(f) ?? 0) + sign)
    }
  }
  add(profile?.liked, 1)
  add(profile?.passed, -1)
  if (profile) cache.set(profile, w)
  return w
}

/** Taste affinity for one garment, roughly -0.4..0.3. */
export function affinity(p: Product, profile?: StyleProfile): number {
  if (profile?.liked?.includes(p.id)) return 0.3
  if (profile?.passed?.includes(p.id)) return -0.4
  const weights = tasteWeights(profile)
  if (!weights.size) return 0
  const fs = features(p)
  const net = fs.reduce((a, f) => a + (weights.get(f) ?? 0), 0) / fs.length
  return Math.max(-0.2, Math.min(0.2, net * 0.12))
}

const LABEL: Record<string, string> = {
  'register:dressed': 'dressed-up pieces',
  'register:casual': 'easy, casual pieces',
  'register:smart': 'smart-casual pieces',
}

/**
 * A short, readable summary of what the ratings point to. Traits need to
 * recur across at least two loves to count — one rating is not a pattern.
 */
export function styleRead(profile?: StyleProfile): { drawnTo: string[]; avoid: string[] } {
  const w = tasteWeights(profile)
  const name = (f: string) => LABEL[f] ?? f.slice(f.indexOf(':') + 1)
  const ranked = [...w.entries()].sort((a, b) => b[1] - a[1])
  return {
    drawnTo: ranked.filter(([, v]) => v >= 2).slice(0, 6).map(([f]) => name(f)),
    avoid: ranked.reverse().filter(([, v]) => v <= -2).slice(0, 4).map(([f]) => name(f)),
  }
}
