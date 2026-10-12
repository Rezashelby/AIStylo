/** Garment slot. Drives outfit assembly: one item per slot, except LAYER. */
export type Slot = 'top' | 'bottom' | 'dress' | 'outerwear' | 'shoes' | 'bag' | 'accessory'

/** Formality on a 1-5 scale, used to keep an outfit internally coherent. */
export type Formality = 1 | 2 | 3 | 4 | 5

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

export type Occasion =
  | 'work' | 'evening' | 'weekend' | 'travel' | 'formal' | 'active'

export interface Product {
  id: string
  name: string
  brand: string
  price: number
  slot: Slot
  formality: Formality
  seasons: Season[]
  occasions: Occasion[]
  /** Dominant colour as hex, used for palette harmony scoring. */
  color: string
  colorName: string
  /** Free-text descriptors; the vector layer embeds these. */
  tags: string[]
  material: string
  image: string
  description: string
}

/** One assembled look. */
export interface Outfit {
  id: string
  title: string
  rationale: string
  items: Product[]
  score: number
  occasion: Occasion
  /** Per-garment size guidance, present only when the profile supports it. */
  sizes?: { productId: string; size: string; confidence: string; basis: string }[]
  /** The request this look answered; lets a single piece be swapped coherently. */
  intent?: StyleIntent
}

/** Conditions where the shopper is, resolved from their location on request. */
export interface Weather {
  tempC: number
  /** Rain, drizzle, snow or showers expected now. */
  wet: boolean
  /** Short human description, e.g. "light rain". */
  summary: string
}

/** Structured intent parsed out of a natural-language styling request. */
export interface StyleIntent {
  occasion?: Occasion
  season?: Season
  formality?: Formality
  /** True when the shopper named the register; false when inferred from occasion. */
  formalityStated?: boolean
  colors?: string[]
  keywords: string[]
  budget?: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  outfits?: Outfit[]
  pending?: boolean
  /** What the stylist understood; scopes which profile questions to ask. */
  intent?: StyleIntent
}

export interface CartLine {
  product: Product
  qty: number
  /** Absent for one-size products, and until the shopper picks one. */
  size?: string
  /** True when the size came from the profile rather than the shopper. */
  suggested?: boolean
}

// ── Style profile ─────────────────────────────────────────────────────────

export type Units = 'metric' | 'imperial'

export type FitPreference = 'fitted' | 'true' | 'relaxed' | 'oversized'

export type BodyShape =
  | 'straight' | 'hourglass' | 'pear' | 'apple' | 'inverted-triangle' | 'unspecified'

export type SizeLabel = 'XXS' | 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | '3XL'

/**
 * What the stylist knows about the shopper.
 *
 * Every field is optional: the stylist works without any of it and asks only
 * for what would change its answer. See `lib/profileGaps.ts`.
 */
export interface StyleProfile {
  units: Units
  /** cm when units==='metric', inches when 'imperial'. */
  height?: number
  /** kg when units==='metric', lbs when 'imperial'. */
  weight?: number
  chest?: number
  waist?: number
  hips?: number
  inseam?: number
  shoeSize?: number
  bodyShape?: BodyShape
  fit?: FitPreference
  /** Colours to avoid, as family names matching COLOR_FAMILIES. */
  avoidColors?: string[]
  lovedColors?: string[]
  /** Slots the shopper does not want suggested (e.g. never dresses). */
  avoidSlots?: Slot[]
  budgetPerItem?: number
  /** Product ids loved in Style Shuffle. */
  liked?: string[]
  /** Product ids passed on in Style Shuffle, or in a look marked "not my style". */
  passed?: string[]
  /**
   * Learned from look feedback: negative when looks have read too formal,
   * positive when too casual. Clamped to -2..2.
   */
  formalityBias?: number
  /** Free-text notes the shopper added, shown back to them. */
  notes?: string
  updatedAt?: string
}

/** A question the stylist wants answered before it can do better work. */
export interface ProfileQuestion {
  id: string
  /** The profile field this fills in. */
  field: keyof StyleProfile
  question: string
  /** Why answering helps — shown to the shopper, never guessed at. */
  because: string
  kind: 'choice' | 'number' | 'multi'
  options?: { value: string; label: string; hint?: string }[]
  unit?: string
  min?: number
  max?: number
  /** Higher runs first. */
  weight: number
}
