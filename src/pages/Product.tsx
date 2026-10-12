import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMemo, useRef, useState } from 'react'
import ProductCard from '@/components/ProductCard'
import SizeGuide from '@/components/SizeGuide'
import { byId, catalog } from '@/data/catalog'
import { needsSize, sizeOptions, suggestFor } from '@/lib/sizing'
import { completeLook } from '@/lib/stylist'
import { useProfile, useShop } from '@/store'
import './product.css'

const GUIDE_HASH = '#size-guide'

/** Plural category names; `${slot}s` gives "shoess" and "dresss". */
const PLURAL: Record<string, string> = {
  top: 'tops', bottom: 'bottoms', dress: 'dresses', outerwear: 'outerwear',
  shoes: 'shoes', bag: 'bags', accessory: 'accessories',
}
const FORMALITY_WORDS = ['', 'Relaxed', 'Casual', 'Smart casual', 'Polished', 'Formal']

export default function Product() {
  const { id = '' } = useParams()
  const p = byId(id)
  const add = useShop((s) => s.add)
  const saved = useShop((s) => s.saved.includes(id))
  const toggleSave = useShop((s) => s.toggleSave)
  const profile = useProfile((s) => s.profile)
  const [added, setAdded] = useState(false)
  // Keyed by product: moving to another product must not carry the size over.
  const [picked, setPicked] = useState<{ id: string; size: string } | null>(null)
  const [missingSize, setMissingSize] = useState(false)
  const sizeRow = useRef<HTMLDivElement>(null)

  const location = useLocation()
  const navigate = useNavigate()
  const guideOpen = location.hash === GUIDE_HASH
  const openedGuide = useRef(false)
  const openGuide = () => { openedGuide.current = true; navigate({ hash: GUIDE_HASH }) }
  // Back closes it when we opened it; a deep link closes without leaving.
  const closeGuide = () => {
    if (openedGuide.current) { openedGuide.current = false; navigate(-1) }
    else navigate({ hash: '' }, { replace: true })
  }

  const pairs = useMemo(() => (p ? completeLook(p, 3) : []), [p])
  const similar = useMemo(
    () => (p ? catalog.filter((x) => x.slot === p.slot && x.id !== p.id).slice(0, 4) : []),
    [p],
  )

  if (!p) {
    return (
      <div className="wrap empty" style={{ paddingBlock: 120 }}>
        <h3>We couldn't find that piece.</h3>
        <Link to="/shop" className="btn ghost small">Back to the shop</Link>
      </div>
    )
  }

  const sized = needsSize(p.slot)
  const suggestion = suggestFor(profile, p)
  const options = sizeOptions(p.slot, profile.units) ?? []
  if (suggestion && !options.includes(suggestion.size)) options.push(suggestion.size)
  const size = picked?.id === p.id ? picked.size : suggestion?.size ?? null

  const choose = (s: string) => { setPicked({ id: p.id, size: s }); setMissingSize(false) }

  const addToBag = () => {
    if (sized && !size) {
      setMissingSize(true)
      sizeRow.current?.querySelector('button')?.focus()
      return
    }
    add(p, 1, size ?? undefined)
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
            <div><dt>Dress code</dt><dd>{FORMALITY_WORDS[p.formality]}</dd></div>
            <div><dt>Season</dt><dd>{p.seasons.join(', ')}</dd></div>
          </dl>

          {sized && (
            <div className="pdp-sizes">
              <div className="size-head">
                <p className="eyebrow" id="size-label">Size</p>
                <button className="size-guide-link" onClick={openGuide}>Size guide</button>
              </div>
              <div className="size-row" ref={sizeRow} role="group" aria-labelledby="size-label">
                {options.map((s) => (
                  <button
                    key={s}
                    className={`size ${size === s ? 'active' : ''} ${suggestion?.size === s ? 'suggested' : ''}`}
                    onClick={() => choose(s)}
                    aria-pressed={size === s}
                  >
                    {p.slot === 'shoes' ? s.split(' ')[1] : s}
                  </button>
                ))}
                {p.slot === 'shoes' && <span className="size-unit">{profile.units === 'imperial' ? 'US' : 'EU'}</span>}
              </div>
              {missingSize ? (
                <p className="size-hint error" role="alert">Choose a size to add this to your bag.</p>
              ) : suggestion ? (
                <p className="size-hint">
                  <strong>{suggestion.size}</strong> suggested from {suggestion.basis}
                  {suggestion.confidence === 'low' && ' — an estimate; a chest or waist measurement would firm it up'}.
                </p>
              ) : (
                <p className="size-hint">
                  Not sure? <Link to="/profile">Add a measurement</Link> and we'll suggest your size.
                </p>
              )}
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
          <button className="btn ghost small" onClick={() => [p, ...pairs].forEach((x) => add(x, 1, x === p ? size ?? undefined : undefined))}>
            Add all four to bag
          </button>
        </section>
      )}

      {guideOpen && sized && (
        <SizeGuide
          slot={p.slot}
          units={profile.units}
          suggested={suggestion?.size}
          onClose={closeGuide}
        />
      )}

      {!!similar.length && (
        <section className="pdp-section">
          <header className="section-head">
            <p className="eyebrow">Also consider</p>
            <h2 className="section-title">More {PLURAL[p.slot] ?? p.slot}.</h2>
          </header>
          <div className="grid-4">
            {similar.map((x, i) => <ProductCard key={x.id} p={x} index={i} />)}
          </div>
        </section>
      )}
    </div>
  )
}
