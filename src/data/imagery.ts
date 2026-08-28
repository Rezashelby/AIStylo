/**
 * Garment imagery is generated as inline SVG rather than fetched, so the
 * catalogue renders identically offline and nothing depends on a CDN.
 * Each silhouette is drawn once and tinted per product.
 */
import type { Slot } from '@/types'

const shade = (hex: string, amount: number) => {
  const n = parseInt(hex.slice(1), 16)
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  const r = clamp(((n >> 16) & 255) * (1 + amount))
  const g = clamp(((n >> 8) & 255) * (1 + amount))
  const b = clamp((n & 255) * (1 + amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

const silhouettes: Record<Slot, (c: string, d: string, l: string) => string> = {
  top: (c, d) => `
    <path d="M100 78 L150 96 L166 150 L142 158 L138 250 Q160 262 100 262 Q40 262 62 250 L58 158 L34 150 L50 96 Z" fill="${c}"/>
    <path d="M100 78 L150 96 L166 150 L142 158 L138 200 L100 200 Z" fill="${d}" opacity=".28"/>
    <path d="M84 80 Q100 100 116 80 L108 76 Q100 86 92 76 Z" fill="${d}"/>`,
  bottom: (c, d) => `
    <path d="M62 96 L138 96 L146 150 L136 268 L110 268 L100 176 L90 268 L64 268 L54 150 Z" fill="${c}"/>
    <path d="M100 96 L138 96 L146 150 L136 268 L110 268 L100 176 Z" fill="${d}" opacity=".24"/>
    <rect x="62" y="96" width="76" height="13" rx="3" fill="${d}" opacity=".5"/>`,
  dress: (c, d) => `
    <path d="M100 76 L146 94 L136 146 L150 268 Q100 282 50 268 L64 146 L54 94 Z" fill="${c}"/>
    <path d="M100 76 L146 94 L136 146 L150 268 Q125 275 100 276 Z" fill="${d}" opacity=".26"/>
    <path d="M84 78 Q100 98 116 78 L108 74 Q100 84 92 74 Z" fill="${d}"/>`,
  outerwear: (c, d) => `
    <path d="M100 74 L154 94 L172 158 L146 168 L142 268 L58 268 L54 168 L28 158 L46 94 Z" fill="${c}"/>
    <path d="M100 74 L100 268 L142 268 L146 168 L172 158 L154 94 Z" fill="${d}" opacity=".22"/>
    <path d="M100 74 L118 268 M100 74 L82 268" stroke="${d}" stroke-width="3" fill="none" opacity=".55"/>
    <circle cx="100" cy="150" r="4" fill="${d}"/><circle cx="100" cy="186" r="4" fill="${d}"/>`,
  shoes: (c, d) => `
    <path d="M36 208 Q34 176 54 174 Q76 174 96 194 L146 216 Q166 224 166 238 L166 246 Q166 252 158 252 L46 252 Q36 252 36 240 Z" fill="${c}"/>
    <path d="M36 240 L166 240 L166 246 Q166 252 158 252 L46 252 Q36 252 36 240 Z" fill="${d}"/>
    <path d="M54 174 Q76 174 96 194 L96 214 L54 200 Z" fill="${d}" opacity=".3"/>`,
  bag: (c, d) => `
    <path d="M52 148 L148 148 L158 258 Q100 268 42 258 Z" fill="${c}"/>
    <path d="M100 148 L148 148 L158 258 Q129 263 100 264 Z" fill="${d}" opacity=".24"/>
    <path d="M74 148 Q74 106 100 106 Q126 106 126 148" stroke="${d}" stroke-width="7" fill="none"/>
    <rect x="88" y="184" width="24" height="16" rx="3" fill="${d}" opacity=".7"/>`,
  accessory: (c, d) => `
    <circle cx="100" cy="180" r="56" fill="none" stroke="${c}" stroke-width="15"/>
    <circle cx="100" cy="180" r="56" fill="none" stroke="${d}" stroke-width="15"
      stroke-dasharray="70 282" opacity=".5"/>
    <circle cx="100" cy="124" r="12" fill="${d}"/>`,
}

/** Build a data-URI product shot for a garment. */
export function productImage(slot: Slot, color: string, seed = 0): string {
  const dark = shade(color, -0.32)
  const light = shade(color, 0.14)
  const bgA = ['#F4F1EC', '#EFE9E2', '#F2EEE9', '#EDE8E1'][seed % 4]
  const bgB = ['#E7E0D6', '#E3DACF', '#E6DFD6', '#E0D8CC'][seed % 4]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300" width="200" height="300">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${bgA}"/><stop offset="1" stop-color="${bgB}"/>
      </linearGradient>
      <radialGradient id="vig" cx=".5" cy=".42" r=".72">
        <stop offset=".55" stop-color="#000" stop-opacity="0"/>
        <stop offset="1" stop-color="#000" stop-opacity=".07"/>
      </radialGradient>
    </defs>
    <rect width="200" height="300" fill="url(#bg)"/>
    <ellipse cx="100" cy="272" rx="62" ry="9" fill="#000" opacity=".07"/>
    ${silhouettes[slot](color, dark, light)}
    <rect width="200" height="300" fill="url(#vig)"/>
  </svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
