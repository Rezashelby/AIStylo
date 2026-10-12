import type {
  Formality, Occasion, Outfit, Product, Season, Slot, StyleIntent, StyleProfile, Weather,
} from '@/types'
import { catalog } from '@/data/catalog'
import { currentSeason, parseIntent } from './intent'
import { suggestFor } from './sizing'
import { affinity } from './taste'
import { needsLayer, seasonFor, tooWarmForLayer } from './weather'

/**
 * Outfit engine: hybrid retrieval + structured scoring.
 *
 * Retrieval ranks each garment against the parsed intent (a stand-in for a
 * vector similarity search). Assembly then fills one slot at a time under hard
 * constraints — formality coherence, palette harmony, no duplicate slots —
 * which relevance scoring alone cannot guarantee.
 */

// ── Colour helpers ────────────────────────────────────────────────────────

const hexToRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

/** HSL saturation/lightness, used to tell neutrals from statement colours. */
function hsl(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  const [rn, gn, bn] = [r / 255, g / 255, b / 255]
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  const d = max - min
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  let h = 0
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
  }
  return { h: (h * 60 + 360) % 360, s, l }
}

const isNeutral = (hex: string) => {
  const { s, l } = hsl(hex)
  return s < 0.22 || l < 0.14 || l > 0.9
}

/**
 * Palette harmony in 0..1. Neutrals go with anything; two saturated colours
 * must be close in hue (analogous) or near-opposite (complementary).
 */
function harmony(a: string, b: string): number {
  if (isNeutral(a) || isNeutral(b)) return 1
  const diff = Math.abs(hsl(a).h - hsl(b).h)
  const dist = Math.min(diff, 360 - diff)
  if (dist < 45) return 0.95
  if (dist > 145) return 0.8
  return 0.35
}

const COLOR_FAMILIES: Record<string, (hex: string) => boolean> = {
  black: (h) => hsl(h).l < 0.2,
  white: (h) => hsl(h).l > 0.85,
  grey: (h) => hsl(h).s < 0.12 && hsl(h).l >= 0.2 && hsl(h).l <= 0.85,
  neutral: (h) => hsl(h).s < 0.3 && hsl(h).h >= 20 && hsl(h).h <= 60,
  brown: (h) => hsl(h).h >= 15 && hsl(h).h <= 45 && hsl(h).l < 0.55,
  navy: (h) => hsl(h).h >= 190 && hsl(h).h <= 260,
  green: (h) => hsl(h).h > 70 && hsl(h).h < 165,
  red: (h) => hsl(h).h < 20 || hsl(h).h > 330,
}

/** Most specific first: a hue says more about a colour than its lightness. */
const SPECIFICITY = ['red', 'green', 'navy', 'brown', 'neutral', 'grey', 'white', 'black']

// ── Retrieval ─────────────────────────────────────────────────────────────

/** Relevance of one garment to the request, roughly 0..1. */
export function relevance(
  p: Product, intent: StyleIntent, season: Season, profile?: StyleProfile,
): number {
  let score = 0

  if (intent.occasion) score += p.occasions.includes(intent.occasion) ? 0.34 : -0.22
  score += p.seasons.includes(intent.season ?? season) ? 0.18 : -0.14

  if (intent.formality) {
    // Within one step reads as coherent; beyond that it fights the look.
    score += Math.max(0, 1 - Math.abs(p.formality - intent.formality) / 2) * 0.24
  }

  if (intent.colors?.length) {
    const hit = intent.colors.some((c) => COLOR_FAMILIES[c]?.(p.color))
    if (hit) score += 0.2
  }

  const haystack = `${p.name} ${p.tags.join(' ')} ${p.material} ${p.description}`.toLowerCase()
  const hits = intent.keywords.filter((k) => haystack.includes(k)).length
  score += Math.min(hits * 0.09, 0.27)

  if (intent.budget && p.price > intent.budget) score -= 0.3

  // ── Profile preferences ────────────────────────────────────────────────
  if (profile) {
    // A stated per-item ceiling behaves like a soft budget.
    if (profile.budgetPerItem && p.price > profile.budgetPerItem) score -= 0.26

    // avoidColors is a strong preference, not an absolute — see `excluded()`
    // for the hard exclusions, which are filtered out of the pool entirely.
    if (profile.avoidColors?.some((c) => COLOR_FAMILIES[c]?.(p.color))) score -= 0.55
    if (profile.lovedColors?.some((c) => COLOR_FAMILIES[c]?.(p.color))) score += 0.16

    // Fit preference nudges toward garments cut that way.
    if (profile.fit) {
      const cues: Record<string, string[]> = {
        fitted:    ['fitted', 'slim', 'tailored', 'close', 'rib'],
        true:      ['classic', 'straight', 'essential'],
        relaxed:   ['relaxed', 'easy', 'drape', 'fluid', 'soft'],
        oversized: ['oversized', 'cocoon', 'generous', 'slouch', 'wide'],
      }
      const hay = `${p.name} ${p.tags.join(' ')} ${p.description}`.toLowerCase()
      if (cues[profile.fit]?.some((c) => hay.includes(c))) score += 0.14
    }

    // What Style Shuffle has learned about taste.
    score += affinity(p, profile)
  }

  return score
}

/**
 * Garments the shopper has ruled out.
 *
 * These are removed from the pool rather than ranked down: a low score still
 * wins when it is the only candidate for a slot.
 */
function excluded(p: Product, profile?: StyleProfile): boolean {
  return Boolean(profile?.avoidSlots?.includes(p.slot))
}

// ── Assembly ──────────────────────────────────────────────────────────────

/** Slot plans in priority order. Each look uses exactly one plan. */
const PLANS: { slots: Slot[]; needsCold?: boolean }[] = [
  { slots: ['top', 'bottom', 'shoes', 'bag', 'accessory'] },
  { slots: ['dress', 'shoes', 'bag', 'accessory'] },
  { slots: ['top', 'bottom', 'outerwear', 'shoes', 'bag'] },
  { slots: ['dress', 'outerwear', 'shoes', 'bag'] },
  { slots: ['top', 'bottom', 'outerwear', 'shoes', 'accessory'] },
]

/** How well a candidate fits the items already chosen. */
function cohesion(candidate: Product, chosen: Product[]): number {
  if (!chosen.length) return 1
  const pal = chosen.reduce((acc, c) => acc + harmony(candidate.color, c.color), 0) / chosen.length
  const avgFormality = chosen.reduce((a, c) => a + c.formality, 0) / chosen.length
  const formalityFit = Math.max(0, 1 - Math.abs(candidate.formality - avgFormality) / 2.5)
  // A look needs at least one anchor colour; penalise all-statement palettes.
  const statements = chosen.filter((c) => !isNeutral(c.color)).length
  const crowding = !isNeutral(candidate.color) && statements >= 2 ? 0.55 : 1
  return pal * 0.5 + formalityFit * 0.5 * crowding
}

function buildOutfit(
  plan: Slot[], pool: Product[], intent: StyleIntent, season: Season, used: Set<string>,
  profile?: StyleProfile,
): Product[] | null {
  const items: Product[] = []
  for (const slot of plan) {
    const candidates = pool
      .filter((p) => p.slot === slot && !items.some((i) => i.id === p.id))
      .map((p) => {
        const base = relevance(p, intent, season, profile) + cohesion(p, items) * 0.6
        // Nudge away from garments already used in an earlier look so the
        // five results read as genuinely different options.
        return { p, s: used.has(p.id) ? base - 0.45 : base }
      })
      .sort((a, b) => b.s - a.s)

    if (!candidates.length) {
      // Accessories and bags are optional; core slots are not.
      if (slot === 'accessory' || slot === 'bag') continue
      return null
    }
    items.push(candidates[0].p)
  }
  return items.length >= 3 ? items : null
}

function scoreOutfit(
  items: Product[], intent: StyleIntent, season: Season, profile?: StyleProfile,
): number {
  const rel = items.reduce((a, p) => a + relevance(p, intent, season, profile), 0) / items.length
  let pal = 0, pairs = 0
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++) { pal += harmony(items[i].color, items[j].color); pairs++ }
  const palette = pairs ? pal / pairs : 1
  const spread = Math.max(...items.map((i) => i.formality)) - Math.min(...items.map((i) => i.formality))
  const coherence = Math.max(0, 1 - spread / 4)
  return Math.round((rel * 0.42 + palette * 0.33 + coherence * 0.25) * 100)
}

const TITLES: Record<Occasion, string[]> = {
  work: ['The Monday Anchor', 'Quiet Authority', 'Desk to Dinner', 'The Standing Meeting', 'Studio Hours'],
  evening: ['After Eight', 'The Long Table', 'Low Light', 'Something Poured', 'The Late Reservation'],
  weekend: ['Slow Saturday', 'The Long Walk', 'Off Duty', 'Market Morning', 'No Fixed Plans'],
  travel: ['Departure Lounge', 'The Aisle Seat', 'Two Time Zones', 'Carry-On Only', 'Arrivals'],
  formal: ['The Occasion', 'Full Dress', 'The Invitation', 'Black Tie Adjacent', 'Ceremony'],
  active: ['Morning Miles', 'The Warm-Up', 'Open Air', 'Easy Effort', 'Ground Pace'],
}

function rationale(items: Product[], intent: StyleIntent, season: Season): string {
  const hero = [...items].sort((a, b) => b.price - a.price)[0]
  const neutrals = items.filter((i) => isNeutral(i.color))
  const accent = items.find((i) => !isNeutral(i.color))
  const occasion = intent.occasion ?? 'weekend'

  const parts: string[] = []
  parts.push(`Built around the ${hero.name.toLowerCase()} — the piece doing the most work here.`)

  if (accent && neutrals.length >= 2) {
    parts.push(`${accent.colorName} carries the colour while the rest stays neutral, so nothing competes.`)
  } else if (neutrals.length === items.length) {
    parts.push(`An entirely neutral palette; the interest comes from ${hero.material.toLowerCase()} and cut rather than colour.`)
  } else {
    parts.push(`The palette stays within one family, which keeps a busy silhouette calm.`)
  }

  const avg = items.reduce((a, i) => a + i.formality, 0) / items.length
  const register = avg >= 4.3 ? 'genuinely formal' : avg >= 3.4 ? 'polished without trying'
    : avg >= 2.4 ? 'smart-casual' : 'relaxed'
  parts.push(`Reads ${register} — right for ${occasion}, and appropriate to ${intent.season ?? season}.`)

  return parts.join(' ')
}

// ── Public API ────────────────────────────────────────────────────────────

export interface StyleResult { intent: StyleIntent; outfits: Outfit[]; reply: string }

/** Size guidance for one garment in a look. */
export interface SizedItem { productId: string; size: string; confidence: string; basis: string }

/**
 * Produce styled looks for a natural-language request.
 *
 * Async by design: this is the seam where a hosted model replaces the local
 * engine. See `src/lib/ai/provider.ts`.
 */
export function styleRequest(
  query: string, count = 4, profile?: StyleProfile, weather?: Weather,
): StyleResult {
  const intent = parseIntent(query)

  // Feedback that looks read too formal or too casual shifts the register the
  // occasion implies. A register the shopper named outright is left alone.
  if (intent.formality && !intent.formalityStated && profile?.formalityBias) {
    intent.formality = clampFormality(intent.formality + Math.round(profile.formalityBias))
  }

  // A season named in the request wins; otherwise dress for the actual
  // temperature rather than the calendar.
  const season = intent.season ?? (weather ? seasonFor(weather) : currentSeason())
  if (weather?.wet) intent.keywords.push('wool', 'leather', 'boot', 'trench', 'coat')
  const pool = catalog
    .filter((p) => !excluded(p, profile))
    .sort((a, b) => relevance(b, intent, season, profile) - relevance(a, intent, season, profile))

  const outfits: Outfit[] = []
  const used = new Set<string>()
  const occasion = intent.occasion ?? 'weekend'
  const titles = TITLES[occasion]

  // A plan whose required slots are excluded can never be satisfied.
  const viable = PLANS.filter(
    (plan) => !plan.slots.some((slot) => profile?.avoidSlots?.includes(slot)),
  )
  let plans = viable.length ? viable : PLANS
  if (weather) {
    // Cold or wet: only plans that carry a layer. Warm: none that do.
    const layered = (p: (typeof PLANS)[number]) => p.slots.includes('outerwear')
    const fitting = needsLayer(weather) ? plans.filter(layered)
      : tooWarmForLayer(weather) ? plans.filter((p) => !layered(p)) : plans
    if (fitting.length) plans = fitting
  }

  for (let i = 0; outfits.length < count && i < plans.length * 2; i++) {
    const plan = plans[i % plans.length]
    const items = buildOutfit(plan.slots, pool, intent, season, used, profile)
    if (!items) continue
    const signature = items.map((x) => x.id).sort().join('|')
    if (outfits.some((o) => o.items.map((x) => x.id).sort().join('|') === signature)) continue

    items.forEach((it) => used.add(it.id))
    outfits.push({
      id: `look-${outfits.length + 1}`,
      title: titles[outfits.length % titles.length],
      rationale: rationale(items, intent, season),
      items,
      score: scoreOutfit(items, intent, season, profile),
      occasion,
      sizes: profile ? sizesFor(items, profile) : undefined,
      intent: { ...intent, season },
    })
  }

  outfits.sort((a, b) => b.score - a.score)
  return { intent, outfits, reply: composeReply(intent, outfits, season, profile, weather) }
}

const clampFormality = (n: number) => Math.max(1, Math.min(5, n)) as Formality

// ── Editing a look ────────────────────────────────────────────────────────

/**
 * Replace one piece of a look with the next-best garment for that slot,
 * judged against the rest of the look rather than in isolation.
 *
 * `tried` holds ids already shown in this position, so repeated swaps walk
 * down the list instead of bouncing between two pieces. Returns null when
 * nothing else in the catalogue fits the slot.
 */
export function swapPiece(
  look: Outfit, productId: string, tried: string[], profile?: StyleProfile,
): Outfit | null {
  const current = look.items.find((p) => p.id === productId)
  if (!current) return null
  const intent: StyleIntent = look.intent ?? { occasion: look.occasion, keywords: [] }
  const season = intent.season ?? currentSeason()
  const rest = look.items.filter((p) => p.id !== productId)

  const next = catalog
    .filter((p) => p.slot === current.slot && !excluded(p, profile))
    .filter((p) => !look.items.some((i) => i.id === p.id) && !tried.includes(p.id))
    .map((p) => ({ p, s: relevance(p, intent, season, profile) + cohesion(p, rest) * 0.6 }))
    .sort((a, b) => b.s - a.s)[0]?.p
  if (!next) return null

  const items = look.items.map((p) => (p.id === productId ? next : p))
  return {
    ...look,
    items,
    score: scoreOutfit(items, intent, season, profile),
    rationale: rationale(items, intent, season),
    sizes: profile ? sizesFor(items, profile) : look.sizes,
  }
}

export type LookFeedback = 'too-formal' | 'too-casual' | 'colours' | 'price' | 'style'

/** Which reasons make sense for this look. Colour only applies when it has some. */
export function feedbackOptions(look: Outfit): { value: LookFeedback; label: string }[] {
  const opts: { value: LookFeedback; label: string }[] = [
    { value: 'too-formal', label: 'Too dressed up' },
    { value: 'too-casual', label: 'Too casual' },
    { value: 'price', label: 'Too pricey' },
    { value: 'style', label: 'Just not my style' },
  ]
  if (look.items.some((p) => !isNeutral(p.color))) {
    opts.splice(2, 0, { value: 'colours', label: 'Not my colours' })
  }
  return opts
}

/**
 * Turn a "not for me" into a concrete profile change, so the next request is
 * actually different. Returns the patch and a sentence saying what changed.
 */
export function feedbackPatch(
  look: Outfit, reason: LookFeedback, profile: StyleProfile,
): { patch: Partial<StyleProfile>; note: string } {
  switch (reason) {
    case 'too-formal':
    case 'too-casual': {
      const step = reason === 'too-formal' ? -1 : 1
      const bias = Math.max(-2, Math.min(2, (profile.formalityBias ?? 0) + step))
      return {
        patch: { formalityBias: bias },
        note: `I'll pitch looks a notch ${step < 0 ? 'more relaxed' : 'more polished'} from now on.`,
      }
    }
    case 'colours': {
      // Blame the loudest colour, not every non-neutral: soft tones like bone
      // or camel would otherwise rule out whole families of basics.
      const loudest = look.items
        .filter((p) => !isNeutral(p.color))
        .sort((a, b) => hsl(b.color).s - hsl(a.color).s)[0]
      // Families overlap (a dark walnut also reads as black), so take the
      // most specific one rather than all of them.
      const family = SPECIFICITY.find((f) => COLOR_FAMILIES[f](loudest.color))
      const name = loudest.colorName.toLowerCase()
      if (!family) {
        // No family describes it (gold, say): rule out the piece itself.
        return {
          patch: { passed: [...new Set([...(profile.passed ?? []), loudest.id])] },
          note: `Noted — I'll leave out the ${loudest.name.toLowerCase()} and pieces like it.`,
        }
      }
      return {
        patch: {
          avoidColors: [...new Set([...(profile.avoidColors ?? []), family])],
          ...(profile.lovedColors && {
            lovedColors: profile.lovedColors.filter((c) => c !== family),
          }),
        },
        note: `Steering away from ${family === name ? name : `${name} and other ${family}s`} — you can undo this in your profile.`,
      }
    }
    case 'price': {
      const avg = look.items.reduce((a, p) => a + p.price, 0) / look.items.length
      const ceiling = Math.max(50, Math.round((avg * 0.75) / 5) * 5)
      const next = profile.budgetPerItem ? Math.min(profile.budgetPerItem, ceiling) : ceiling
      return {
        patch: { budgetPerItem: next },
        note: `I'll keep pieces nearer $${next} each.`,
      }
    }
    case 'style': {
      const ids = look.items.map((p) => p.id)
      return {
        patch: {
          passed: [...new Set([...(profile.passed ?? []), ...ids])],
          ...(profile.liked && { liked: profile.liked.filter((id) => !ids.includes(id)) }),
        },
        note: 'Noted — these pieces, and ones like them, will come up less.',
      }
    }
  }
}

/** Size guidance per garment, omitting slots where sizing is not meaningful. */
function sizesFor(items: Product[], profile: StyleProfile): SizedItem[] {
  return items.flatMap((p) => {
    const s = suggestFor(profile, p)
    return s ? [{ productId: p.id, size: s.size, confidence: s.confidence, basis: s.basis }] : []
  })
}

function composeReply(
  intent: StyleIntent, outfits: Outfit[], season: Season, profile?: StyleProfile, weather?: Weather,
): string {
  if (!outfits.length) {
    return "I couldn't assemble a full look from the current catalogue for that. Try naming an occasion — work, evening, weekend, travel, or formal — and I'll build from there."
  }
  const occasion = intent.occasion ?? 'something versatile'
  const bits = [`Here are ${outfits.length} looks for ${occasion}, styled for ${intent.season ?? season}.`]
  if (weather && !intent.season) {
    const layers = outfits.filter((o) => o.items.some((p) => p.slot === 'outerwear')).length
    const plan = needsLayer(weather)
      ? (layers === outfits.length ? 'so each one carries a layer' : 'so bring a layer you already own')
      : !layers ? 'so I left the outer layers out' : 'so the layers are optional'
    bits.push(`It's ${weather.tempC}° and ${weather.summary} where you are, ${plan}.`)
  }
  if (intent.formality && intent.formality >= 4) bits.push('I kept things dressed up.')
  if (intent.colors?.length) bits.push(`Leaning into ${intent.colors.join(' and ')} as you asked.`)
  if (intent.budget) bits.push(`Filtered to pieces under $${intent.budget}.`)
  if (profile?.fit) bits.push(`Cut the way you like things to sit — ${profile.fit}.`)
  if (profile?.liked?.length) bits.push('Weighted toward what you loved in Style Shuffle.')
  bits.push('Each one explains itself below — swap any piece and the rest still holds.')
  return bits.join(' ')
}

/** Items that finish a look the user already started. */
export function completeLook(seed: Product, count = 3): Product[] {
  const season = currentSeason()
  const intent: StyleIntent = {
    occasion: seed.occasions[0], formality: seed.formality, keywords: seed.tags,
  }
  const wanted: Slot[] = seed.slot === 'dress'
    ? ['shoes', 'bag', 'outerwear', 'accessory']
    : (['top', 'bottom', 'shoes', 'bag', 'outerwear'] as Slot[]).filter((s) => s !== seed.slot)

  const picks: Product[] = []
  for (const slot of wanted) {
    if (picks.length >= count) break
    const best = catalog
      .filter((p) => p.slot === slot && p.id !== seed.id)
      .map((p) => ({ p, s: relevance(p, intent, season) + cohesion(p, [seed, ...picks]) * 0.8 }))
      .sort((a, b) => b.s - a.s)[0]
    if (best) picks.push(best.p)
  }
  return picks
}
