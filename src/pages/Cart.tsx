import { Link } from 'react-router-dom'
import { useShop } from '@/store'
import './cart.css'

const SHIPPING_THRESHOLD = 200
const SHIPPING_COST = 18

export default function Cart() {
  const { cart, setQty, remove, clear } = useShop()
  const subtotal = cart.reduce((a, l) => a + l.qty * l.product.price, 0)
  const shipping = subtotal >= SHIPPING_THRESHOLD || subtotal === 0 ? 0 : SHIPPING_COST
  const total = subtotal + shipping
  const toFree = SHIPPING_THRESHOLD - subtotal

  if (!cart.length) {
    return (
      <div className="wrap empty" style={{ padding: '130px 0' }}>
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
          {cart.map(({ product: p, qty }) => (
            <li key={p.id} className="line">
              <Link to={`/product/${p.id}`} className="line-media">
                <img src={p.image} alt={p.name} />
              </Link>
              <div className="line-body">
                <div>
                  <p className="eyebrow">{p.brand}</p>
                  <h3 className="line-name"><Link to={`/product/${p.id}`}>{p.name}</Link></h3>
                  <p className="line-meta muted">{p.colorName} · {p.material}</p>
                </div>
                <div className="line-controls">
                  <div className="qty" role="group" aria-label={`Quantity for ${p.name}`}>
                    <button onClick={() => setQty(p.id, qty - 1)} aria-label="Decrease quantity">−</button>
                    <span aria-live="polite">{qty}</span>
                    <button onClick={() => setQty(p.id, qty + 1)} aria-label="Increase quantity">+</button>
                  </div>
                  <button className="link-btn" onClick={() => remove(p.id)}>Remove</button>
                </div>
              </div>
              <p className="line-price price">${(p.price * qty).toLocaleString()}</p>
            </li>
          ))}
        </ul>

        <aside className="summary">
          <h2 className="summary-title">Summary</h2>

          {toFree > 0 && (
            <div className="ship-nudge">
              <p>Add <strong>${toFree}</strong> for complimentary shipping.</p>
              <div className="ship-bar"><i style={{ width: `${Math.min(100, (subtotal / SHIPPING_THRESHOLD) * 100)}%` }} /></div>
            </div>
          )}

          <dl className="summary-rows">
            <div><dt>Subtotal</dt><dd className="price">${subtotal.toLocaleString()}</dd></div>
            <div><dt>Shipping</dt><dd className="price">{shipping ? `$${shipping}` : 'Complimentary'}</dd></div>
            <div className="summary-total"><dt>Total</dt><dd className="price">${total.toLocaleString()}</dd></div>
          </dl>

          <button className="btn block">Proceed to checkout</button>
          <Link to="/shop" className="link-btn summary-link">Continue shopping</Link>
        </aside>
      </div>
    </div>
  )
}
