import type { CartLine } from '@/types'

/**
 * Money rules shared by the bag, checkout and orders, so a total can never
 * differ between the page that shows it and the page that charges it.
 */

export const FREE_SHIPPING_FROM = 200

export interface DeliveryOption {
  id: 'standard' | 'express'
  label: string
  eta: string
  /** Price before the free-shipping threshold is applied. */
  price: number
}

export const DELIVERY: DeliveryOption[] = [
  { id: 'standard', label: 'Standard', eta: '3–5 working days', price: 18 },
  { id: 'express', label: 'Express', eta: '1–2 working days', price: 32 },
]

export const subtotalOf = (lines: CartLine[]) => lines.reduce((a, l) => a + l.qty * l.product.price, 0)

/** Standard is free over the threshold; express always costs, but less. */
export function shippingFor(subtotal: number, option: DeliveryOption['id'] = 'standard'): number {
  if (subtotal === 0) return 0
  const o = DELIVERY.find((d) => d.id === option) ?? DELIVERY[0]
  if (subtotal >= FREE_SHIPPING_FROM) return o.id === 'standard' ? 0 : o.price - DELIVERY[0].price
  return o.price
}

export const money = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
