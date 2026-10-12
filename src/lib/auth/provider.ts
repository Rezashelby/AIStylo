/**
 * The single seam between the sign-in UI and whatever verifies identity.
 *
 * Mirrors `lib/ai/provider.ts`: the page is written against `AuthProvider`,
 * never a concrete backend. Sign-in is passwordless — an emailed one-time
 * code, plus passkeys and social sign-in where the backend supports them.
 * The UI only offers a method when `methods` says it works.
 */

export interface User {
  id: string
  email: string
}

export type AuthMethod = 'email-code' | 'passkey' | 'google' | 'apple'

export interface CodeRequest {
  /** Seconds until another code may be sent. */
  resendIn: number
  /**
   * Local mode only: the code itself, because there is no mail server to
   * send it. A real backend never returns this.
   */
  devCode?: string
}

export interface AuthProvider {
  readonly name: string
  readonly methods: AuthMethod[]
  /** True when accounts live only in this browser. Shown to the shopper. */
  readonly local: boolean
  requestCode(email: string): Promise<CodeRequest>
  verifyCode(email: string, code: string): Promise<User>
  signOut(): Promise<void>
}

export class AuthError extends Error {}

const CODE_TTL_MS = 10 * 60_000
const RESEND_S = 30

// ── Local engine ──────────────────────────────────────────────────────────

/**
 * Device-only accounts, for development and demos.
 *
 * Keeps each email's data separate on this browser, which is enough to
 * build and test per-account profiles. It is not security: anyone at the
 * keyboard can read localStorage. Production sets `VITE_AUTH_API`.
 */
export class LocalAuthProvider implements AuthProvider {
  readonly name = 'local'
  readonly methods: AuthMethod[] = ['email-code']
  readonly local = true
  private pending = new Map<string, { code: string; expires: number }>()

  async requestCode(email: string): Promise<CodeRequest> {
    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0')
    this.pending.set(email, { code, expires: Date.now() + CODE_TTL_MS })
    return { resendIn: RESEND_S, devCode: code }
  }

  async verifyCode(email: string, code: string): Promise<User> {
    const p = this.pending.get(email)
    if (!p || Date.now() > p.expires) throw new AuthError('That code has expired. Send a new one.')
    if (p.code !== code) throw new AuthError("That code isn't right. Check it and try again.")
    this.pending.delete(email)
    return { id: await localId(email), email }
  }

  async signOut() {}
}

/** Stable id per email, so the same email always opens the same data. */
async function localId(email: string): Promise<string> {
  // crypto.subtle needs a secure context; plain-http LAN testing falls back
  // to a simple string hash, which is fine for a key that is not a secret.
  if (!crypto.subtle) {
    let h = 0x811c9dc5
    for (const c of email) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193) >>> 0
    return h.toString(16).padStart(8, '0')
  }
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email))
  return [...new Uint8Array(bytes).slice(0, 8)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// ── Remote engine (wire up when the backend exists) ───────────────────────

/**
 * Talks to an auth service over HTTP with a cookie session:
 *
 *   POST {base}/code     { email }        → { resendIn }
 *   POST {base}/verify   { email, code }  → User
 *   POST {base}/signout
 *
 * Passkey and social sign-in are added to `methods` once the service
 * implements them; the page picks them up without changes.
 */
export class RemoteAuthProvider implements AuthProvider {
  readonly name = 'remote'
  readonly methods: AuthMethod[] = ['email-code']
  readonly local = false
  constructor(private base: string) {}

  private async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (res.status === 400 || res.status === 401) {
      const { message } = await res.json().catch(() => ({ message: '' }))
      throw new AuthError(message || "That didn't work. Try again.")
    }
    if (!res.ok) throw new Error(`Auth API ${res.status}`)
    return res.status === 204 ? (undefined as T) : res.json()
  }

  requestCode(email: string) { return this.post<CodeRequest>('/code', { email }) }
  verifyCode(email: string, code: string) { return this.post<User>('/verify', { email, code }) }
  signOut() { return this.post<void>('/signout') }
}

// ── Active provider ───────────────────────────────────────────────────────

const base = import.meta.env.VITE_AUTH_API as string | undefined

export const auth: AuthProvider = base ? new RemoteAuthProvider(base) : new LocalAuthProvider()
