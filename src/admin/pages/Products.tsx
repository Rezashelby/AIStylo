import { useMemo, useState } from 'react'
import { money, stock } from '../data'
import { brands } from '@/data/catalog'
import type { Slot } from '@/types'

type SortKey = 'name' | 'price' | 'stock' | 'sold'

export default function Products() {
  const [q, setQ] = useState('')
  const [slot, setSlot] = useState<Slot | 'all'>('all')
  const [brand, setBrand] = useState('all')
  const [sort, setSort] = useState<SortKey>('sold')
  const [selected, setSelected] = useState<string[]>([])

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    let out = stock.filter(
      (s) =>
        (slot === 'all' || s.product.slot === slot) &&
        (brand === 'all' || s.product.brand === brand) &&
        (!term ||
          s.product.name.toLowerCase().includes(term) ||
          s.product.brand.toLowerCase().includes(term) ||
          s.product.tags.some((t) => t.includes(term))),
    )
    const by: Record<SortKey, (a: typeof out[0], b: typeof out[0]) => number> = {
      name:  (a, b) => a.product.name.localeCompare(b.product.name),
      price: (a, b) => b.product.price - a.product.price,
      stock: (a, b) => a.stock - b.stock,
      sold:  (a, b) => b.sold30d - a.sold30d,
    }
    return [...out].sort(by[sort])
  }, [q, slot, brand, sort])

  const allChecked = rows.length > 0 && selected.length === rows.length
  const toggleAll = () => setSelected(allChecked ? [] : rows.map((r) => r.product.id))
  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  return (
    <>
      <header className="apage-head">
        <div>
          <h1 className="apage-title">Products</h1>
          <p className="apage-sub">{stock.length} in the catalogue · {stock.filter((s) => s.stock === 0).length} out of stock</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="abtn ghost">Import</button>
          <button className="abtn">Add product</button>
        </div>
      </header>

      <div className="atoolbar">
        <input
          className="afield" placeholder="Search products…"
          value={q} onChange={(e) => setQ(e.target.value)} style={{ minWidth: 220 }}
          aria-label="Search products"
        />
        <select className="afield" value={slot} onChange={(e) => setSlot(e.target.value as Slot | 'all')} aria-label="Filter by category">
          <option value="all">All categories</option>
          {['top','bottom','dress','outerwear','shoes','bag','accessory'].map((s) => (
            <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <select className="afield" value={brand} onChange={(e) => setBrand(e.target.value)} aria-label="Filter by brand">
          <option value="all">All brands</option>
          {brands.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <span className="aspacer" />
        {selected.length > 0 && (
          <>
            <span className="apage-sub">{selected.length} selected</span>
            <button className="abtn ghost">Archive</button>
            <button className="abtn ghost">Edit stock</button>
          </>
        )}
        <select className="afield" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort">
          <option value="sold">Best selling</option>
          <option value="stock">Lowest stock</option>
          <option value="price">Highest price</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>

      <section className="apanel" style={{ padding: '16px 4px 4px' }}>
        <div className="atable-wrap">
          <table className="atable">
            <thead>
              <tr>
                <th style={{ width: 34 }}>
                  <label className="hit">
                    <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all" />
                  </label>
                </th>
                <th>Product</th>
                <th>Category</th>
                <th>Dress code</th>
                <th>Stock</th>
                <th className="num">Sold 30d</th>
                <th className="num">Price</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.product.id}>
                  <td data-label="" className="cell-select">
                    <label className="hit">
                      <input
                        type="checkbox" checked={selected.includes(s.product.id)}
                        onChange={() => toggle(s.product.id)}
                        aria-label={`Select ${s.product.name}`}
                      />
                    </label>
                  </td>
                  <td data-label="">
                    <div className="cell-product">
                      <img src={s.product.image} alt="" />
                      <div>
                        <strong>{s.product.name}</strong>
                        <span>{s.product.brand} · {s.product.colorName}</span>
                      </div>
                    </div>
                  </td>
                  <td style={{ textTransform: 'capitalize' }} data-label="Category">{s.product.slot}</td>
                  <td data-label="Dress code">{'●'.repeat(s.product.formality)}<span style={{ color: 'var(--a-line)' }}>{'●'.repeat(5 - s.product.formality)}</span></td>
                  <td data-label="Stock">
                    <div className="stock-cell">
                      <div className={`meter ${s.stock > 15 ? 'good' : s.stock > 5 ? 'warn' : 'bad'}`}>
                        <i style={{ width: `${Math.min(100, (s.stock / 46) * 100)}%` }} />
                      </div>
                      <span>{s.stock}</span>
                    </div>
                  </td>
                  <td className="num" data-label="Sold 30d">{s.sold30d}</td>
                  <td className="num" data-label="Price">{money(s.product.price)}</td>
                  <td data-label="Status">
                    <span className={`pill ${s.stock === 0 ? 'draft' : 'live'}`}>
                      {s.stock === 0 ? 'Sold out' : 'Live'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <p className="aempty">No products match those filters.</p>}
      </section>
    </>
  )
}
