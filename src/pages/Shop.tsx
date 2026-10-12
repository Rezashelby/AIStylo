import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ProductCard from '@/components/ProductCard'
import { brands, catalog } from '@/data/catalog'
import type { Occasion, Slot } from '@/types'
import './shop.css'

const SLOTS: { v: Slot | 'all'; label: string }[] = [
  { v: 'all', label: 'Everything' },
  { v: 'top', label: 'Tops' },
  { v: 'bottom', label: 'Bottoms' },
  { v: 'dress', label: 'Dresses' },
  { v: 'outerwear', label: 'Outerwear' },
  { v: 'shoes', label: 'Shoes' },
  { v: 'bag', label: 'Bags' },
  { v: 'accessory', label: 'Accessories' },
]

const OCCASIONS: (Occasion | 'all')[] = ['all', 'work', 'evening', 'weekend', 'travel', 'formal']

type Sort = 'featured' | 'price-asc' | 'price-desc' | 'name'

export default function Shop() {
  const [params, setParams] = useSearchParams()
  const slot = (params.get('slot') as Slot | 'all') ?? 'all'
  const occasion = (params.get('occasion') as Occasion | 'all') ?? 'all'
  const brand = params.get('brand') ?? 'all'
  const [sort, setSort] = useState<Sort>('featured')
  const [maxPrice, setMaxPrice] = useState(1000)
  // Small screens only: filters stay folded until asked for.
  const [showFilters, setShowFilters] = useState(false)

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    if (v === 'all') next.delete(k)
    else next.set(k, v)
    setParams(next, { replace: true })
  }

  const items = useMemo(() => {
    let out = catalog.filter(
      (p) =>
        (slot === 'all' || p.slot === slot) &&
        (occasion === 'all' || p.occasions.includes(occasion as Occasion)) &&
        (brand === 'all' || p.brand === brand) &&
        p.price <= maxPrice,
    )
    if (sort === 'price-asc') out = [...out].sort((a, b) => a.price - b.price)
    if (sort === 'price-desc') out = [...out].sort((a, b) => b.price - a.price)
    if (sort === 'name') out = [...out].sort((a, b) => a.name.localeCompare(b.name))
    return out
  }, [slot, occasion, brand, sort, maxPrice])

  const clear = () => { setParams({}, { replace: true }); setMaxPrice(1000) }
  const filtered = slot !== 'all' || occasion !== 'all' || brand !== 'all' || maxPrice < 1000

  return (
    <div className="wrap shop">
      <header className="shop-head">
        <p className="eyebrow">The collection</p>
        <h1 className="shop-title">Considered pieces, built to combine.</h1>
        <p className="lede">
          Pieces chosen to work together — which is why the stylist can build
          whole outfits from them.
        </p>
      </header>

      <nav className="shop-slots" aria-label="Category">
        {SLOTS.map((s) => (
          <button
            key={s.v}
            className={`slot-tab ${slot === s.v ? 'active' : ''}`}
            onClick={() => set('slot', s.v)}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <button
        className="filters-toggle"
        onClick={() => setShowFilters((v) => !v)}
        aria-expanded={showFilters}
        aria-controls="shop-bar"
      >
        Filter &amp; sort{filtered ? ' · on' : ''}
        <span aria-hidden>{showFilters ? '−' : '+'}</span>
      </button>

      <div id="shop-bar" className={`shop-bar ${showFilters ? 'open' : ''}`}>
        <div className="shop-filters">
          <label className="ctl">
            <span>Occasion</span>
            <select className="field" value={occasion} onChange={(e) => set('occasion', e.target.value)}>
              {OCCASIONS.map((o) => (
                <option key={o} value={o}>{o === 'all' ? 'Any occasion' : o[0].toUpperCase() + o.slice(1)}</option>
              ))}
            </select>
          </label>

          <label className="ctl">
            <span>Brand</span>
            <select className="field" value={brand} onChange={(e) => set('brand', e.target.value)}>
              <option value="all">All brands</option>
              {brands.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>

          <label className="ctl ctl-range">
            <span>Under ${maxPrice}</span>
            <input
              type="range" min={80} max={1000} step={20}
              value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="shop-right">
          {filtered && <button className="link-btn" onClick={clear}>Clear</button>}
          <label className="ctl">
            <span>Sort</span>
            <select className="field" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="featured">Featured</option>
              <option value="price-asc">Price, low to high</option>
              <option value="price-desc">Price, high to low</option>
              <option value="name">Alphabetical</option>
            </select>
          </label>
        </div>
      </div>

      <p className="shop-count muted">{items.length} {items.length === 1 ? 'piece' : 'pieces'}</p>

      {items.length ? (
        <div className="shop-grid">
          {items.map((p, i) => <ProductCard key={p.id} p={p} index={i} />)}
        </div>
      ) : (
        <div className="empty">
          <h3>Nothing matches those filters.</h3>
          <p className="muted">Try widening the price range or clearing a filter.</p>
          <button className="btn ghost small" onClick={clear}>Clear filters</button>
        </div>
      )}
    </div>
  )
}
