import { catalog } from '@/data/catalog'
import type { Product } from '@/types'

/**
 * Admin demo data.
 *
 * Deterministically derived from the catalogue so the dashboard shows stable
 * numbers between reloads. Replace with queries against Postgres — see
 * ROADMAP.md for the schema.
 */

export type OrderStatus = 'pending' | 'paid' | 'fulfilled' | 'refunded'

export interface AdminOrder {
  id: string
  customer: string
  email: string
  placedAt: string
  status: OrderStatus
  items: { product: Product; qty: number }[]
  total: number
}

export interface StockRow { product: Product; stock: number; sold30d: number }

/** Small deterministic PRNG so figures do not churn on every render. */
const rand = (seed: number) => {
  let s = seed * 9301 + 49297
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
}

const FIRST = ['Amara','Theo','Nadia','Elias','Juno','Rafi','Simone','Otto','Lena','Kai','Ines','Mateo','Saskia','Noor','Dov','Perla']
const LAST  = ['Okafor','Lindqvist','Haddad','Moreau','Tanaka','Bergström','Duarte','Novak','Rahimi','Castellani','奥','Sørensen']

const STATUSES: OrderStatus[] = ['fulfilled','fulfilled','fulfilled','paid','paid','pending','refunded']

export const stock: StockRow[] = (() => {
  const r = rand(7)
  return catalog.map((p) => ({
    product: p,
    stock: Math.floor(r() * 46),
    sold30d: Math.floor(r() * 34),
  }))
})()

export const orders: AdminOrder[] = (() => {
  const r = rand(23)
  return Array.from({ length: 42 }, (_, i) => {
    const n = 1 + Math.floor(r() * 3)
    const items = Array.from({ length: n }, () => {
      const p = catalog[Math.floor(r() * catalog.length)]
      return { product: p, qty: 1 + Math.floor(r() * 2) }
    })
    const first = FIRST[Math.floor(r() * FIRST.length)]
    const last = LAST[Math.floor(r() * LAST.length)]
    const daysAgo = Math.floor(r() * 30)
    const d = new Date()
    d.setDate(d.getDate() - daysAgo)
    return {
      id: `AS-${(10428 + i).toString()}`,
      customer: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase().replace(/[^a-z]/g,'')}@example.com`,
      placedAt: d.toISOString(),
      status: STATUSES[Math.floor(r() * STATUSES.length)],
      items,
      total: items.reduce((a, it) => a + it.product.price * it.qty, 0),
    }
  }).sort((a, b) => +new Date(b.placedAt) - +new Date(a.placedAt))
})()

/** Queries shoppers actually sent, with how well the catalogue answered them. */
export interface QueryRow { query: string; count: number; avgMatch: number; ctr: number }

export const topQueries: QueryRow[] = [
  { query: 'work outfit, polished but not stuffy',        count: 184, avgMatch: 88, ctr: 0.41 },
  { query: 'dinner date, autumn evening',                 count: 141, avgMatch: 91, ctr: 0.47 },
  { query: 'travel outfit for a long flight',             count: 118, avgMatch: 84, ctr: 0.36 },
  { query: 'wedding guest, spring',                       count: 97,  avgMatch: 79, ctr: 0.33 },
  { query: 'something in black, under $500',              count: 88,  avgMatch: 86, ctr: 0.39 },
  { query: 'weekend casual, comfortable',                 count: 74,  avgMatch: 82, ctr: 0.29 },
  { query: 'gym clothes / activewear',                    count: 61,  avgMatch: 34, ctr: 0.07 },
  { query: 'winter coat, very cold',                      count: 55,  avgMatch: 72, ctr: 0.31 },
  { query: 'petite sizing, tailored',                     count: 43,  avgMatch: 41, ctr: 0.11 },
  { query: 'plus size evening wear',                      count: 38,  avgMatch: 29, ctr: 0.06 },
]

export const revenueSeries = (() => {
  const r = rand(11)
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    const weekend = [0, 6].includes(d.getDay())
    return { date: d, value: Math.round((2200 + r() * 3400) * (weekend ? 1.28 : 1)) }
  })
})()

export const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export const shortDate = (iso: string | Date) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
