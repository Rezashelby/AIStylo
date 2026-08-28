import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartLine, ChatMessage, Product } from '@/types'

interface ShopState {
  cart: CartLine[]
  saved: string[]
  add: (p: Product, qty?: number) => void
  remove: (id: string) => void
  setQty: (id: string, qty: number) => void
  clear: () => void
  toggleSave: (id: string) => void
  count: () => number
  subtotal: () => number
}

export const useShop = create<ShopState>()(
  persist(
    (set, get) => ({
      cart: [],
      saved: [],
      add: (p, qty = 1) =>
        set((s) => {
          const line = s.cart.find((l) => l.product.id === p.id)
          return line
            ? { cart: s.cart.map((l) => (l.product.id === p.id ? { ...l, qty: l.qty + qty } : l)) }
            : { cart: [...s.cart, { product: p, qty }] }
        }),
      remove: (id) => set((s) => ({ cart: s.cart.filter((l) => l.product.id !== id) })),
      setQty: (id, qty) =>
        set((s) => ({
          cart: qty <= 0
            ? s.cart.filter((l) => l.product.id !== id)
            : s.cart.map((l) => (l.product.id === id ? { ...l, qty } : l)),
        })),
      clear: () => set({ cart: [] }),
      toggleSave: (id) =>
        set((s) => ({
          saved: s.saved.includes(id) ? s.saved.filter((x) => x !== id) : [...s.saved, id],
        })),
      count: () => get().cart.reduce((a, l) => a + l.qty, 0),
      subtotal: () => get().cart.reduce((a, l) => a + l.qty * l.product.price, 0),
    }),
    { name: 'aistylo-shop' },
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
