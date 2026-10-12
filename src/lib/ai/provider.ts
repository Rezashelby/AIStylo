import type { Outfit, StyleIntent, StyleProfile, Weather } from '@/types'
import { styleRequest } from '@/lib/stylist'

/**
 * The single seam between the UI and whatever produces styling advice.
 *
 * Everything above this interface — chat, outfit boards, product pages — is
 * written against `StylistProvider` and never against a concrete backend.
 * Swapping to a hosted model means implementing this interface and changing
 * the export at the bottom of this file. No component changes.
 */

export interface StylistRequest {
  /** The shopper's message, verbatim. */
  query: string
  /** Prior turns, oldest first, for multi-turn context. */
  history?: { role: 'user' | 'assistant'; content: string }[]
  /** How many looks to return. */
  count?: number
  /** What is known about the shopper; shapes sizing and preferences. */
  profile?: StyleProfile
  /** Local conditions, present only when the shopper opted in. */
  weather?: Weather
  signal?: AbortSignal
}

export interface StylistResponse {
  reply: string
  outfits: Outfit[]
  intent: StyleIntent
}

export interface StylistProvider {
  readonly name: string
  /** True when the provider can actually serve requests (keys present, etc). */
  readonly ready: boolean
  style(req: StylistRequest): Promise<StylistResponse>
}

// ── Local engine ──────────────────────────────────────────────────────────

/** Simulated latency, so the UI's loading states are exercised in dev. */
const THINKING_MS = [520, 900] as const
const wait = (signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const ms = THINKING_MS[0] + Math.random() * (THINKING_MS[1] - THINKING_MS[0])
    const t = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(t)
      reject(new DOMException('Aborted', 'AbortError'))
    })
  })

/**
 * Runs the deterministic engine in `lib/stylist.ts` entirely in the browser.
 * No network, no keys — the default until a real backend is wired up.
 */
export class LocalStylistProvider implements StylistProvider {
  readonly name = 'local-engine'
  readonly ready = true

  async style({ query, count = 4, profile, weather, signal }: StylistRequest): Promise<StylistResponse> {
    await wait(signal)
    const { intent, outfits, reply } = styleRequest(query, count, profile, weather)
    return { reply, outfits, intent }
  }
}

// ── Remote engine (wire up when the backend exists) ───────────────────────

/**
 * Talks to an HTTP endpoint that returns `StylistResponse`-shaped JSON.
 *
 * Intended for a Bedrock/Claude-backed service: the server does entity
 * extraction and outfit reasoning, then returns resolved product ids that this
 * client hydrates against the catalogue. Not active until `VITE_STYLIST_API`
 * is set.
 */
export class RemoteStylistProvider implements StylistProvider {
  readonly name = 'remote-api'
  constructor(private endpoint: string, private apiKey?: string) {}

  get ready() { return Boolean(this.endpoint) }

  async style({ query, history, count = 4, profile, weather, signal }: StylistRequest): Promise<StylistResponse> {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { 'x-api-key': this.apiKey } : {}),
      },
      body: JSON.stringify({ query, history, count, profile, weather }),
      signal,
    })
    if (!res.ok) throw new Error(`Stylist API ${res.status}: ${await res.text()}`)
    return (await res.json()) as StylistResponse
  }
}

// ── Active provider ───────────────────────────────────────────────────────

const endpoint = import.meta.env.VITE_STYLIST_API as string | undefined
const apiKey = import.meta.env.VITE_STYLIST_API_KEY as string | undefined

export const stylist: StylistProvider = endpoint
  ? new RemoteStylistProvider(endpoint, apiKey)
  : new LocalStylistProvider()
