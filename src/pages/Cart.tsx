import { Link } from 'react-router-dom'
import { needsSize, sizeOptions } from '@/lib/sizing'
import { FREE_SHIPPING_FROM, shippingFor, subtotalOf } from '@/lib/pricing'
import { lineKey, useProfile, useShop } from '@/store'
import './cart.css'

export default function Cart() {
  const { cart, setQty, setSize, remove, clear } = useShop()
  const units = useProfile((s) => s.profile.units)
  const unsized = cart.filter((l) => needsSize(l.product.slot) && !l.size).length
  const subtotal = subtotalOf(cart)
  const shipping = shippingFor(subtotal)
  const total = subtotal + shipping
  const toFree = FREE_SHIPPING_FROM - subtotal

  if (!cart.length) {
    return (
      <div className="wrap empty" style={{ paddingBlock: 130 }}>
        <h3>Your bag is empty.</h3>
        <p className="muted">Not sure where to start? Describe the occasion and let the stylist build a look.</p>
        <div className="row" style={{ gap: 10, marginTop: 6 }}>
          <Link to="/stylist" className="btn">Ask the stylist</Link>
          <Link to="/shop" className="btn ghost">Browse the shop</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="wrap cart">
      <header className="cart-head">
        <div>
          <p className="eyebrow">Your bag</p>
          <h1 className="cart-title">{cart.length} {cart.length === 1 ? 'piece' : 'pieces'}</h1>
        </div>
        <button className="link-btn" onClick={clear}>Empty bag</button>
      </header>

      <div className="cart-layout">
        <ul className="cart-lines">
          {cart.map((line) => {
            const { product: p, qty, size, suggested } = line
            const key = lineKey(line)
            const options = sizeOptions(p.slot, units)
            if (options && size && !options.includes(size)) options.push(size)
            return (
            <li key={key} className="line">
              <Link to={`/product/${p.id}`} className="line-media">
                <img src={p.image} alt={p.name} />
              </Link>
              <div className="line-body">
                <div>
                  <p className="eyebrow">{p.brand}</p>
                  <h3 className="line-name"><Link to={`/product/${p.id}`}>{p.name}</Link></h3>
                  <p className="line-meta muted">{p.colorName} · {p.material}</p>
                  {options && (
                    <label className={`line-size ${size ? '' : 'missing'}`}>
                      <span>Size</span>
                      <select value={size ?? ''} onChange={(e) => setSize(key, e.target.value)}>
                        {!size && <option value="" disabled>Choose size</option>}
                        {options.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                      {suggested && <em>suggested for you</em>}
                    </label>
                  )}
                </div>
                <div className="line-controls">
                  <div className="qty" role="group" aria-label={`Quantity for ${p.name}`}>
                    <button onClick={() => setQty(key, qty - 1)} aria-label="Decrease quantity">−</button>
                    <span aria-live="polite">{qty}</span>
                    <button onClick={() => setQty(key, qty + 1)} aria-label="Increase quantity">+</button>
                  </div>
                  <button className="link-btn" onClick={() => remove(key)}>Remove</button>
                </div>
              </div>
              <p className="line-price price">${(p.price * qty).toLocaleString()}</p>
            </li>
            )
          })}
        </ul>

        <aside className="summary">
          <h2 className="summary-title">Summary</h2>

          {toFree > 0 && (
            <div className="ship-nudge">
              <p>Add <strong>${toFree}</strong> for complimentary shipping.</p>
              <div className="ship-bar"><i style={{ width: `${Math.min(100, (subtotal / FREE_SHIPPING_FROM) * 100)}%` }} /></div>
            </div>
          )}

          <dl className="summary-rows">
            <div><dt>Subtotal</dt><dd className="price">${subtotal.toLocaleString()}</dd></div>
            <div><dt>Shipping</dt><dd className="price">{shipping ? `$${shipping}` : 'Complimentary'}</dd></div>
            <div className="summary-total"><dt>Total</dt><dd className="price">${total.toLocaleString()}</dd></div>
          </dl>

          {unsized > 0 && (
            <p className="summary-warn" role="status">
              Choose a size for {unsized === 1 ? '1 piece' : `${unsized} pieces`} before checkout.
            </p>
          )}
          {unsized > 0
            ? <button className="btn block" disabled>Proceed to checkout</button>
            : <Link to="/checkout" className="btn block">Proceed to checkout</Link>}
          <Link to="/shop" className="link-btn summary-link">Continue shopping</Link>
        </aside>
      </div>
    </div>
  )
}
