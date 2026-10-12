import type { FitPreference, Product, SizeLabel, StyleProfile, Slot } from '@/types'

/**
 * Size derivation.
 *
 * Maps measurements to a garment size, adjusted for stated fit preference.
 * Bands are approximate industry ranges — real sizing is per-brand, so this
 * always returns a confidence alongside the size and says what it used.
 */

const ORDER: SizeLabel[] = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']

const toCm = (v: number, units: StyleProfile['units']) => (units === 'imperial' ? v * 2.54 : v)
const toKg = (v: number, units: StyleProfile['units']) => (units === 'imperial' ? v * 0.4536 : v)

/** Upper-body bands by chest circumference in cm. */
const CHEST_BANDS: [number, SizeLabel][] = [
  [80, 'XXS'], [86, 'XS'], [92, 'S'], [98, 'M'], [106, 'L'], [114, 'XL'], [124, 'XXL'], [Infinity, '3XL'],
]

/** Lower-body bands by waist circumference in cm. */
const WAIST_BANDS: [number, SizeLabel][] = [
  [62, 'XXS'], [68, 'XS'], [74, 'S'], [80, 'M'], [88, 'L'], [98, 'XL'], [108, 'XXL'], [Infinity, '3XL'],
]

/** Fallback bands by BMI, used only when no measurements exist. */
const BMI_BANDS: [number, SizeLabel][] = [
  [17.5, 'XS'], [20, 'S'], [23.5, 'M'], [27, 'L'], [31, 'XL'], [35, 'XXL'], [Infinity, '3XL'],
]

const band = (value: number, bands: [number, SizeLabel][]): SizeLabel =>
  bands.find(([limit]) => value < limit)?.[1] ?? '3XL'

const shift = (size: SizeLabel, steps: number): SizeLabel =>
  ORDER[Math.max(0, Math.min(ORDER.length - 1, ORDER.indexOf(size) + steps))]

/** How a fit preference moves the recommended size. */
const FIT_SHIFT: Record<FitPreference, number> = {
  fitted: -1, true: 0, relaxed: 1, oversized: 2,
}

export interface SizeSuggestion {
  size: SizeLabel
  /** 'high' when derived from a direct measurement, 'low' from BMI alone. */
  confidence: 'high' | 'medium' | 'low'
  /** Plain-language account of what produced this. */
  basis: string
}

/**
 * Recommend a size for a garment slot.
 * Returns null when the profile holds nothing usable.
 */
export function suggestSize(profile: StyleProfile, slot: Slot): SizeSuggestion | null {
  const { units } = profile
  const lower = slot === 'bottom'
  const fitShift = profile.fit ? FIT_SHIFT[profile.fit] : 0

  // Direct measurement is always preferred.
  const direct = lower ? profile.waist : profile.chest
  if (direct) {
    const cm = toCm(direct, units)
    const base = band(cm, lower ? WAIST_BANDS : CHEST_BANDS)
    return {
      size: shift(base, fitShift),
      confidence: 'high',
      basis: `${lower ? 'waist' : 'chest'} ${Math.round(cm)}cm${profile.fit ? `, ${profile.fit} fit` : ''}`,
    }
  }

  // Hips can stand in for waist on bottoms.
  if (lower && profile.hips) {
    const cm = toCm(profile.hips, units)
    const base = band(cm - 8, WAIST_BANDS)
    return {
      size: shift(base, fitShift),
      confidence: 'medium',
      basis: `estimated from hips ${Math.round(cm)}cm`,
    }
  }

  // Height and weight give a rough BMI-based estimate — better than nothing,
  // but flagged clearly as an estimate so it is never presented as certain.
  if (profile.height && profile.weight) {
    const m = toCm(profile.height, units) / 100
    const kg = toKg(profile.weight, units)
    const bmi = kg / (m * m)
    const base = band(bmi, BMI_BANDS)
    return {
      size: shift(base, fitShift),
      confidence: 'low',
      basis: `estimated from height and weight (BMI ${bmi.toFixed(1)})`,
    }
  }

  return null
}

/**
 * Size-guide rows for a slot, built from the same bands the suggestion uses,
 * so the guide and the suggestion can never disagree. Ranges are in cm.
 */
export function sizeChart(slot: Slot): { measure: 'chest' | 'waist'; rows: { size: SizeLabel; from: number; to: number }[] } | null {
  if (!needsSize(slot) || slot === 'shoes') return null
  const lower = slot === 'bottom'
  const bands = lower ? WAIST_BANDS : CHEST_BANDS
  const rows = bands.flatMap(([to, size], i) => {
    const from = i ? bands[i - 1][0] : to - 6
    return GARMENT_SIZES.includes(size) ? [{ size, from, to: Number.isFinite(to) ? to : from + 10 }] : []
  })
  return { measure: lower ? 'waist' : 'chest', rows }
}

/** Approximate foot length for an EU size (Paris point), in cm. */
export const footLengthCm = (eu: number) => Math.round((eu / 1.5 - 1.5) * 10) / 10

// ── What a product is sold in ────────────────────────────────────────────

const GARMENT_SIZES: SizeLabel[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const EU_SHOES = [36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46]
const US_SHOES = [5, 6, 7, 8, 9, 10, 11, 12, 13]

/** A suggestion for a specific product: a garment size or a shoe size. */
export type ProductSize = Omit<SizeSuggestion, 'size'> & { size: string }

/** Bags and accessories are one size. */
export const needsSize = (slot: Slot) => slot !== 'bag' && slot !== 'accessory'

/**
 * The sizes a product is offered in, as the labels stored on a cart line.
 * Shoes follow the profile's unit system; null means one size.
 */
export function sizeOptions(slot: Slot, units: StyleProfile['units'] = 'metric'): string[] | null {
  if (!needsSize(slot)) return null
  if (slot === 'shoes') {
    return units === 'imperial' ? US_SHOES.map((n) => `US ${n}`) : EU_SHOES.map((n) => `EU ${n}`)
  }
  return GARMENT_SIZES
}

/**
 * The size to suggest for one product, or null when the profile cannot say.
 * The one place this is decided: product pages, looks and the bag all use it.
 */
export function suggestFor(profile: StyleProfile, p: Product): ProductSize | null {
  if (!needsSize(p.slot)) return null
  if (p.slot === 'shoes') {
    const s = shoeSize(profile)
    return s ? { size: s, confidence: 'high', basis: 'your shoe size' } : null
  }
  return suggestSize(profile, p.slot)
}

/** Shoe size passthrough — no derivation is honest here. */
export function shoeSize(profile: StyleProfile): string | null {
  if (!profile.shoeSize) return null
  return profile.units === 'imperial' ? `US ${profile.shoeSize}` : `EU ${profile.shoeSize}`
}

/** True when the profile carries enough to size confidently. */
export function hasSizing(p: StyleProfile): boolean {
  return Boolean(p.chest || p.waist || p.hips || (p.height && p.weight))
}

/** Rough completeness, for the profile UI's progress meter. */
export function completeness(p: StyleProfile): number {
  const fields: (keyof StyleProfile)[] = [
    'height', 'weight', 'chest', 'waist', 'hips', 'shoeSize', 'fit', 'bodyShape', 'budgetPerItem',
  ]
  const filled = fields.filter((f) => p[f] !== undefined && p[f] !== null).length
  return Math.round((filled / fields.length) * 100)
}
