import { Link, useParams, useSearchParams } from 'react-router-dom'
import { formatDate, orders as provider, ORDER_STATUS } from '@/lib/orders'
import { DELIVERY, money } from '@/lib/pricing'
import { useOrders } from '@/store'
import './order.css'

/** One order. Straight after checkout (`?placed=1`) it doubles as the confirmation. */
export default function OrderDetail() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const order = useOrders((s) => s.orders.find((o) => o.id === id))
  const justPlaced = params.get('placed') === '1'

  if (!order) {
    return (
      <div className="wrap empty" style={{ paddingBlock: 120 }}>
        <h3>We couldn't find that order.</h3>
        <p className="muted">It may belong to another account on this device.</p>
        <Link to="/profile#orders" className="btn ghost small">Your orders</Link>
      </div>
    )
  }

  const delivery = DELIVERY.find((d) => d.id === order.delivery)
  const a = order.address

  return (
    <div className="wrap order">
      {justPlaced ? (
        <header className="order-hero">
          <span className="order-check" aria-hidden>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <h1>Thank you, {a.name.split(' ')[0]}.</h1>
          <p className="lede">
            Order <strong>{order.id}</strong> is confirmed. We've sent the details to {a.email}.
          </p>
          {provider.demo && (
            <p className="order-demo">Demo store — no payment was taken and nothing will ship.</p>
          )}
        </header>
      ) : (
        <header className="order-head">
          <Link to="/profile#orders" className="co-back">← Your orders</Link>
          <h1>Order {order.id}</h1>
          <p className="muted">Placed {formatDate(order.placedAt)} · {ORDER_STATUS[order.status]}</p>
        </header>
      )}

      <div className="order-grid">
        <section className="order-box">
          <h2>Items</h2>
          <ul className="order-lines">
            {order.lines.map((l) => (
              <li key={`${l.product.id}-${l.size}`}>
                <Link to={`/product/${l.product.id}`} className="order-thumb"><img src={l.product.image} alt="" /></Link>
                <span className="order-line-text">
                  <Link to={`/product/${l.product.id}`}><strong>{l.product.name}</strong></Link>
                  <span>{[l.size && `Size ${l.size}`, `Qty ${l.qty}`].filter(Boolean).join(' · ')}</span>
                </span>
                <span className="price">{money(l.qty * l.product.price)}</span>
              </li>
            ))}
          </ul>
          <dl className="order-totals">
            <div><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
            <div><dt>Delivery</dt><dd>{order.shipping ? money(order.shipping) : 'Free'}</dd></div>
            <div className="total"><dt>Total</dt><dd>{money(order.total)}</dd></div>
          </dl>
        </section>

        <section className="order-box">
          <h2>Delivery</h2>
          <p className="order-addr">
            {a.name}<br />{a.line1}{a.line2 && <><br />{a.line2}</>}<br />{a.city} {a.postcode}<br />{a.country}
          </p>
          <p className="muted">{delivery?.label} · {delivery?.eta}</p>
          <h2 className="order-h-gap">Need help?</h2>
          <p className="muted">Free returns within 30 days of delivery. Reply to your confirmation email and we'll sort it.</p>
        </section>
      </div>

      {justPlaced && (
        <div className="order-next">
          <Link to="/stylist" className="btn">Style another look</Link>
          <Link to="/profile#orders" className="btn ghost">View all orders</Link>
        </div>
      )}
    </div>
  )
}
