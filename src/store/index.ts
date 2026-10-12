import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { CartLine, ChatMessage, Outfit, Product, StyleProfile } from '@/types'
import type { User } from '@/lib/auth/provider'
import { suggestFor } from '@/lib/sizing'
import type { Order } from '@/lib/orders'

// ── Per-account storage ───────────────────────────────────────────────────
//
// The bag, saved items and style profile belong to whoever is signed in.
// Each is stored under `<name>:<account id>` (or `:guest`), so two people
// sharing a browser never see each other's data. The session is read before
// any store is created, so the first hydration already uses the right key.

const SESSION_KEY = 'aistylo-session'

function readSession(): User | null {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null')?.state?.user ?? null }
  catch { return null }
}

let scope = readSession()?.id ?? 'guest'
/** While switching accounts, the stores are cleared; that must not be saved. */
let writesPaused = false
const scopedKey = (name: string, id = scope) => `${name}:${id}`

const scoped = createJSONStorage(() => ({
  getItem: (name) => {
    try {
      // Data saved before accounts existed belongs to the guest.
      return localStorage.getItem(scopedKey(name))
        ?? (scope === 'guest' ? localStorage.getItem(name) : null)
    } catch { return null }
  },
  setItem: (name, value) => {
    if (writesPaused) return
    try { localStorage.setItem(scopedKey(name), value) } catch { /* full or blocked */ }
  },
  removeItem: (name) => { try { localStorage.removeItem(scopedKey(name)) } catch { /* blocked */ } },
}))

const SHOP_KEY = 'aistylo-shop'
const PROFILE_KEY = 'aistylo-profile'
const ORDERS_KEY = 'aistylo-orders'

/**
 * Identity of a look by its pieces. Engine ids ("look-1") repeat across
 * requests, so they cannot tell two saved looks apart.
 */
export const lookKey = (o: Outfit) => o.items.map((p) => p.id).sort().join('|')

/** A cart line is a product in a size: the same piece in M and L is two lines. */
export const lineKey = (l: Pick<CartLine, 'product' | 'size'>) => `${l.product.id}::${l.size ?? ''}`

interface ShopState {
  cart: CartLine[]
  saved: string[]
  savedLooks: Outfit[]
  /**
   * Without a size, a sized product takes the profile's suggestion when there
   * is one (marked `suggested`), otherwise it waits for a choice in the bag.
   */
  add: (p: Product, qty?: number, size?: string) => void
  remove: (key: string) => void
  setQty: (key: string, qty: number) => void
  setSize: (key: string, size: string) => void
  clear: () => void
  toggleSave: (id: string) => void
  toggleLook: (o: Outfit) => void
  count: () => number
  subtotal: () => number
}

export const useShop = create<ShopState>()(
  persist(
    (set, get) => ({
      cart: [],
      saved: [],
      savedLooks: [],
      add: (p, qty = 1, size) =>
        set((s) => {
          const fallback = size ? undefined : suggestFor(useProfile.getState().profile, p)?.size
          const next: CartLine = { product: p, qty, size: size ?? fallback, suggested: !size && !!fallback }
          const key = lineKey(next)
          const line = s.cart.find((l) => lineKey(l) === key)
          return line
            ? { cart: s.cart.map((l) => (lineKey(l) === key ? { ...l, qty: l.qty + qty } : l)) }
            : { cart: [...s.cart, next] }
        }),
      remove: (key) => set((s) => ({ cart: s.cart.filter((l) => lineKey(l) !== key) })),
      setQty: (key, qty) =>
        set((s) => ({
          cart: qty <= 0
            ? s.cart.filter((l) => lineKey(l) !== key)
            : s.cart.map((l) => (lineKey(l) === key ? { ...l, qty } : l)),
        })),
      setSize: (key, size) =>
        set((s) => {
          const line = s.cart.find((l) => lineKey(l) === key)
          if (!line) return s
          const moved: CartLine = { ...line, size, suggested: false }
          // Changing to a size already in the bag merges the two lines.
          const twin = s.cart.find((l) => l !== line && lineKey(l) === lineKey(moved))
          return {
            cart: twin
              ? s.cart.filter((l) => l !== line).map((l) => (l === twin ? { ...l, qty: l.qty + line.qty } : l))
              : s.cart.map((l) => (l === line ? moved : l)),
          }
        }),
      clear: () => set({ cart: [] }),
      toggleSave: (id) =>
        set((s) => ({
          saved: s.saved.includes(id) ? s.saved.filter((x) => x !== id) : [...s.saved, id],
        })),
      toggleLook: (o) =>
        set((s) => {
          const key = lookKey(o)
          return s.savedLooks.some((l) => lookKey(l) === key)
            ? { savedLooks: s.savedLooks.filter((l) => lookKey(l) !== key) }
            : { savedLooks: [{ ...o, id: `saved-${key}` }, ...s.savedLooks] }
        }),
      count: () => get().cart.reduce((a, l) => a + l.qty, 0),
      subtotal: () => get().cart.reduce((a, l) => a + l.qty * l.product.price, 0),
    }),
    { name: SHOP_KEY, storage: scoped },
  ),
)

// ── Style profile ─────────────────────────────────────────────────────────

interface ProfileState {
  profile: StyleProfile
  /** Questions the shopper explicitly skipped; never asked again this session. */
  skipped: string[]
  set: (patch: Partial<StyleProfile>) => void
  skip: (questionId: string) => void
  reset: () => void
}

const EMPTY_PROFILE: StyleProfile = { units: 'metric' }

export const useProfile = create<ProfileState>()(
  persist(
    (set) => ({
      profile: EMPTY_PROFILE,
      skipped: [],
      set: (patch) =>
        set((s) => ({
          profile: { ...s.profile, ...patch, updatedAt: new Date().toISOString() },
        })),
      skip: (id) => set((s) => (s.skipped.includes(id) ? s : { skipped: [...s.skipped, id] })),
      reset: () => set({ profile: EMPTY_PROFILE, skipped: [] }),
    }),
    { name: PROFILE_KEY, storage: scoped },
  ),
)

interface ChatState {
  messages: ChatMessage[]
  busy: boolean
  push: (m: ChatMessage) => void
  update: (id: string, patch: Partial<ChatMessage>) => void
  setBusy: (b: boolean) => void
  reset: () => void
}

export const useChat = create<ChatState>((set) => ({
  messages: [],
  busy: false,
  push: (m) => set((s) => ({ messages: [...s.messages, m] })),
  update: (id, patch) =>
    set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
  setBusy: (busy) => set({ busy }),
  reset: () => set({ messages: [], busy: false }),
}))

// ── Orders ────────────────────────────────────────────────────────────────

interface OrdersState {
  /** Newest first. */
  orders: Order[]
  record: (o: Order) => void
}

/**
 * Orders the shopper has placed. With a real backend this becomes a cache of
 * the server's list; in local mode it is the list.
 */
export const useOrders = create<OrdersState>()(
  persist(
    (set) => ({
      orders: [],
      record: (o) => set((s) => ({ orders: [o, ...s.orders.filter((x) => x.id !== o.id)] })),
    }),
    { name: ORDERS_KEY, storage: scoped },
  ),
)

// ── Session ───────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null
  signIn: (user: User) => Promise<void>
  signOut: () => Promise<void>
}

/**
 * Point every per-account store at another account's data.
 *
 * Signing in from a guest session carries the guest's bag and profile into
 * the account when the account has none yet — the shopper should not lose
 * what they just did — and then clears the guest copy, so the next person
 * on this device starts clean.
 */
async function switchScope(next: string) {
  const prev = scope
  if (prev === next) return
  for (const name of [SHOP_KEY, PROFILE_KEY, ORDERS_KEY]) {
    try {
      const guest = localStorage.getItem(scopedKey(name, 'guest')) ?? localStorage.getItem(name)
      if (prev === 'guest' && guest && !localStorage.getItem(scopedKey(name, next))) {
        localStorage.setItem(scopedKey(name, next), guest)
      }
      if (prev === 'guest') { localStorage.removeItem(scopedKey(name, 'guest')); localStorage.removeItem(name) }
    } catch { /* storage blocked: nothing to carry */ }
  }

  // Clear what is on screen first: rehydrating from an empty key would
  // otherwise leave the previous account's data showing. The clear itself
  // must not be saved, or it would overwrite one account or the other.
  writesPaused = true
  scope = next
  useShop.setState({ cart: [], saved: [], savedLooks: [] })
  useProfile.setState({ profile: EMPTY_PROFILE, skipped: [] })
  useOrders.setState({ orders: [] })
  writesPaused = false
  await Promise.all([
    useShop.persist.rehydrate(), useProfile.persist.rehydrate(), useOrders.persist.rehydrate(),
  ])
  useChat.getState().reset()
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: readSession(),
      signIn: async (user) => {
        await switchScope(user.id)
        set({ user })
      },
      signOut: async () => {
        await switchScope('guest')
        set({ user: null })
      },
    }),
    { name: SESSION_KEY, partialize: (s) => ({ user: s.user }) },
  ),
)
