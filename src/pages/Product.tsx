import { Link, useParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import ProductCard from '@/components/ProductCard'
import { byId, catalog } from '@/data/catalog'
import { completeLook } from '@/lib/stylist'
import { useShop } from '@/store'
import './product.css'

const SIZES = ['XS', 'S', 'M', 'L', 'XL']
const FORMALITY_WORDS = ['', 'Relaxed', 'Casual', 'Smart casual', 'Polished', 'Formal']

export default function Product() {
  const { id = '' } = useParams()
  const p = byId(id)
  const add = useShop((s) => s.add)
  const saved = useShop((s) => s.saved.includes(id))
  const toggleSave = useShop((s) => s.toggleSave)
  const [size, setSize] = useState('M')
  const [added, setAdded] = useState(false)

  const pairs = useMemo(() => (p ? completeLook(p, 3) : []), [p])
  const similar = useMemo(
    () => (p ? catalog.filter((x) => x.slot === p.slot && x.id !== p.id).slice(0, 4) : []),
    [p],
  )

  if (!p) {
    return (
      <div className="wrap empty" style={{ padding: '120px 0' }}>
        <h3>We couldn't find that piece.</h3>
        <Link to="/shop" className="btn ghost small">Back to the shop</Link>
      </div>
    )
  }

  const addToBag = () => {
    add(p)
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  const lookTotal = p.price + pairs.reduce((a, x) => a + x.price, 0)

  return (
    <div className="wrap pdp">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/shop">Shop</Link>
        <span aria-hidden>/</span>
        <Link to={`/shop?slot=${p.slot}`}>{p.slot}</Link>
        <span aria-hidden>/</span>
        <span className="muted">{p.name}</span>
      </nav>

      <div className="pdp-main">
        <div className="pdp-media">
          <img src={p.image} alt={p.name} />
        </div>

        <div className="pdp-info">
          <p className="eyebrow">{p.brand}</p>
          <h1 className="pdp-title">{p.name}</h1>
          <p className="pdp-price price">${p.price}</p>

          <p className="pdp-desc">{p.description}</p>

          <dl className="pdp-specs">
            <div><dt>Material</dt><dd>{p.material}</dd></div>
            <div><dt>Colour</dt><dd><i style={{ background: p.color }} aria-hidden />{p.colorName}</dd></div>
            <div><dt>Register</dt><dd>{FORMALITY_WORDS[p.formality]}</dd></div>
            <div><dt>Season</dt><dd>{p.seasons.join(', ')}</dd></div>
          </dl>

          {p.slot !== 'bag' && p.slot !== 'accessory' && (
            <div className="pdp-sizes">
              <p className="eyebrow">Size</p>
              <div className="size-row">
                {SIZES.map((s) => (
                  <button
                    key={s}
                    className={`size ${size === s ? 'active' : ''}`}
                    onClick={() => setSize(s)}
                    aria-pressed={size === s}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pdp-actions">
            <button className="btn block" onClick={addToBag}>
              {added ? 'Added to bag ✓' : 'Add to bag'}
            </button>
            <button className={`btn ghost ${saved ? 'is-saved' : ''}`} onClick={() => toggleSave(p.id)}>
              {saved ? 'Saved' : 'Save'}
            </button>
          </div>

          <ul className="pdp-notes">
            <li>Complimentary shipping over $200</li>
            <li>Thirty-day returns, no questions</li>
          </ul>
        </div>
      </div>

      {/* Stylist-assembled companions */}
      {!!pairs.length && (
        <section className="pdp-section">
          <header className="row-head">
            <div>
              <p className="eyebrow">Styled by AIStylo</p>
              <h2 className="section-title">Finish the look.</h2>
            </div>
            <span className="look-total">
              <span className="muted">Complete look</span>
              <strong className="price">${lookTotal.toLocaleString()}</strong>
            </span>
          </header>
          <div className="pdp-pairs">
            <figure className="pair-anchor">
              <img src={p.image} alt="" />
              <figcaption>This piece</figcaption>
            </figure>
            {pairs.map((x, i) => <ProductCard key={x.id} p={x} index={i} />)}
          </div>
          <button className="btn ghost small" onClick={() => [p, ...pairs].forEach((x) => add(x))}>
            Add all four to bag
          </button>
        </section>
      )}

      {!!similar.length && (
        <section className="pdp-section">
          <header className="section-head">
            <p className="eyebrow">Also consider</p>
            <h2 className="section-title">More {p.slot}s.</h2>
          </header>
          <div className="grid-4">
            {similar.map((x, i) => <ProductCard key={x.id} p={x} index={i} />)}
          </div>
        </section>
      )}
    </div>
  )
}
