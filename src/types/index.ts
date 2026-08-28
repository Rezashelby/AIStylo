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
}

/** Structured intent parsed out of a natural-language styling request. */
export interface StyleIntent {
  occasion?: Occasion
  season?: Season
  formality?: Formality
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
}

export interface CartLine {
  product: Product
  qty: number
}
