import type { Occasion, Season, StyleIntent, Formality } from '@/types'

/**
 * Entity extraction over a free-text styling request.
 *
 * This is the deterministic stand-in for the LLM extraction step. It resolves
 * the same StyleIntent shape the model layer will return, so swapping in a
 * real backend does not touch the scorer downstream.
 */

const OCCASION_CUES: Record<Occasion, string[]> = {
  work: ['work', 'office', 'meeting', 'interview', 'presentation', 'client', 'desk', 'professional', 'business'],
  evening: ['evening', 'dinner', 'date', 'drinks', 'party', 'night', 'cocktail', 'birthday'],
  weekend: ['weekend', 'casual', 'brunch', 'errand', 'coffee', 'relaxed', 'day off', 'saturday', 'sunday'],
  travel: ['travel', 'flight', 'plane', 'airport', 'trip', 'vacation', 'holiday', 'packing', 'commute'],
  formal: ['formal', 'wedding', 'gala', 'black tie', 'ceremony', 'funeral', 'graduation'],
  active: ['gym', 'workout', 'run', 'active', 'sport', 'training', 'walk'],
}

const SEASON_CUES: Record<Season, string[]> = {
  spring: ['spring', 'mild', 'breezy'],
  summer: ['summer', 'hot', 'heat', 'warm', 'beach', 'humid'],
  autumn: ['autumn', 'fall', 'crisp', 'cool'],
  winter: ['winter', 'cold', 'snow', 'freezing', 'chilly'],
}

const COLOR_CUES: Record<string, string[]> = {
  black: ['black', 'noir'], white: ['white', 'ivory', 'cream', 'chalk', 'bone'],
  navy: ['navy', 'indigo', 'blue'], brown: ['brown', 'tan', 'camel', 'chocolate', 'walnut', 'cognac'],
  neutral: ['neutral', 'beige', 'sand', 'stone', 'taupe', 'oatmeal'],
  green: ['green', 'sage', 'olive'], red: ['red', 'burgundy', 'oxblood', 'wine'],
  grey: ['grey', 'gray', 'charcoal', 'slate'],
}

const FORMALITY_CUES: [RegExp, Formality][] = [
  [/\b(black tie|gala|very formal|black-tie)\b/, 5],
  [/\b(formal|smart|polished|elevated|dressy|sharp)\b/, 4],
  [/\b(business casual|smart casual|put together|presentable)\b/, 3],
  [/\b(casual|relaxed|easy|comfortable|laid.?back)\b/, 2],
  [/\b(lounge|athleisure|very casual)\b/, 1],
]

const STOPWORDS = new Set([
  'i', 'need', 'a', 'an', 'the', 'for', 'to', 'my', 'me', 'want', 'looking',
  'something', 'outfit', 'wear', 'and', 'with', 'that', 'is', 'am', 'in', 'on',
  'of', 'it', 'this', 'some', 'what', 'should', 'can', 'you', 'help', 'be',
])

const matchAny = (text: string, cues: string[]) => cues.some((c) => text.includes(c))

export function parseIntent(raw: string): StyleIntent {
  const text = raw.toLowerCase()

  let occasion: Occasion | undefined
  for (const [key, cues] of Object.entries(OCCASION_CUES)) {
    if (matchAny(text, cues)) { occasion = key as Occasion; break }
  }

  let season: Season | undefined
  for (const [key, cues] of Object.entries(SEASON_CUES)) {
    if (matchAny(text, cues)) { season = key as Season; break }
  }

  let formality: Formality | undefined
  for (const [re, level] of FORMALITY_CUES) {
    if (re.test(text)) { formality = level; break }
  }
  const formalityStated = formality !== undefined
  // Occasion implies a formality floor when the user did not state one.
  if (!formality && occasion) {
    formality = ({ formal: 5, work: 4, evening: 4, travel: 2, weekend: 2, active: 1 } as const)[occasion]
  }

  const colors = Object.entries(COLOR_CUES)
    .filter(([, cues]) => matchAny(text, cues))
    .map(([name]) => name)

  const budgetMatch = text.match(/(?:under|below|less than|max|budget of)\s*\$?\s*(\d[\d,]*)/)
  const budget = budgetMatch ? Number(budgetMatch[1].replace(/,/g, '')) : undefined

  const keywords = text
    .replace(/[^a-z\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w))

  return {
    occasion, season, formality, formalityStated,
    colors: colors.length ? colors : undefined, keywords, budget,
  }
}

/** Current season, used as a fallback when the request does not name one. */
export function currentSeason(d = new Date()): Season {
  const m = d.getMonth()
  if (m <= 1 || m === 11) return 'winter'
  if (m <= 4) return 'spring'
  if (m <= 7) return 'summer'
  return 'autumn'
}
