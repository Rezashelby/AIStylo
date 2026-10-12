import type { CartLine } from '@/types'
import { shippingFor, subtotalOf, type DeliveryOption } from './pricing'

/**
 * The seam between checkout and whatever takes payment and records orders.
 *
 * Same pattern as the stylist and auth providers. The local provider records
 * the order in the browser and takes no payment — it says so on the page.
 * The remote provider will create the order server-side (reserving stock in
 * the same transaction) and hand off to Stripe's hosted checkout, so card
 * details never touch this app.
 */

export interface Address {
  name: string
  email: string
  line1: string
  line2?: string
  city: string
  postcode: string
  country: string
  phone?: string
}

export type OrderStatus = 'placed' | 'paid' | 'shipped' | 'delivered' | 'cancelled'

export interface Order {
  id: string
  placedAt: string
  status: OrderStatus
  lines: CartLine[]
  address: Address
  delivery: DeliveryOption['id']
  subtotal: number
  shipping: number
  total: number
}

export const ORDER_STATUS: Record<OrderStatus, string> = {
  placed: 'Order placed', paid: 'Paid', shipped: 'On its way', delivered: 'Delivered', cancelled: 'Cancelled',
}

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })

export interface OrderDraft {
  lines: CartLine[]
  address: Address
  delivery: DeliveryOption['id']
  /** Prevents a double-click or retry from placing the same order twice. */
  idempotencyKey: string
}

export interface OrderProvider {
  readonly name: string
  /** True when no payment is taken. Shown to the shopper before they commit. */
  readonly demo: boolean
  place(draft: OrderDraft): Promise<Order>
}

/** Totals are always recomputed from the lines, never trusted from the page. */
export function price(draft: Pick<OrderDraft, 'lines' | 'delivery'>) {
  const subtotal = subtotalOf(draft.lines)
  const shipping = shippingFor(subtotal, draft.delivery)
  return { subtotal, shipping, total: subtotal + shipping }
}

// ── Local engine ──────────────────────────────────────────────────────────

const placed = new Map<string, Order>()

export class LocalOrderProvider implements OrderProvider {
  readonly name = 'local'
  readonly demo = true

  async place(draft: OrderDraft): Promise<Order> {
    const again = placed.get(draft.idempotencyKey)
    if (again) return again
    await new Promise((r) => setTimeout(r, 650))
    const order: Order = {
      id: orderNumber(),
      placedAt: new Date().toISOString(),
      status: 'placed',
      lines: draft.lines,
      address: draft.address,
      delivery: draft.delivery,
      ...price(draft),
    }
    placed.set(draft.idempotencyKey, order)
    return order
  }
}

/** Short, readable, unambiguous: no 0/O or 1/I. */
function orderNumber(): string {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return 'AS-' + [...bytes].map((b) => alphabet[b % alphabet.length]).join('')
}

// ── Remote engine (wire up with the backend) ──────────────────────────────

/**
 * POST {base}/orders with the draft and an `Idempotency-Key` header. The
 * server prices the lines itself, reserves stock, and returns either the
 * order or `{ redirect }` to Stripe Checkout.
 */
export class RemoteOrderProvider implements OrderProvider {
  readonly name = 'remote'
  readonly demo = false
  constructor(private base: string) {}

  async place(draft: OrderDraft): Promise<Order> {
    const res = await fetch(`${this.base}/orders`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': draft.idempotencyKey },
      body: JSON.stringify({
        lines: draft.lines.map((l) => ({ productId: l.product.id, size: l.size, qty: l.qty })),
        address: draft.address,
        delivery: draft.delivery,
      }),
    })
    if (!res.ok) throw new Error(`Orders API ${res.status}`)
    const body = await res.json()
    if (body.redirect) { window.location.assign(body.redirect); return new Promise(() => {}) }
    return body as Order
  }
}

const base = import.meta.env.VITE_ORDERS_API as string | undefined

export const orders: OrderProvider = base ? new RemoteOrderProvider(base) : new LocalOrderProvider()
