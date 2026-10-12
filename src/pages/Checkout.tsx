import { useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { orders, price, type Address } from '@/lib/orders'
import { DELIVERY, FREE_SHIPPING_FROM, money, shippingFor, subtotalOf, type DeliveryOption } from '@/lib/pricing'
import { needsSize } from '@/lib/sizing'
import { useAuth, useOrders, useShop } from '@/store'
import './checkout.css'

const COUNTRIES = ['United Kingdom', 'United States', 'Canada', 'Ireland', 'France', 'Germany', 'Netherlands', 'Australia']
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

type Field = keyof Address
const REQUIRED: Field[] = ['name', 'email', 'line1', 'city', 'postcode', 'country']
const MESSAGES: Partial<Record<Field, string>> = {
  name: 'Enter the name for delivery.',
  email: 'Enter a full email address — we send the confirmation there.',
  line1: 'Enter the street address.',
  city: 'Enter the town or city.',
  postcode: 'Enter the postcode.',
  country: 'Choose a country.',
}

/**
 * One-page checkout: contact and address, delivery, review. Guest-first —
 * signing in only prefills — and nothing is charged in demo mode, which the
 * page says before the shopper commits.
 */
export default function Checkout() {
  const cart = useShop((s) => s.cart)
  const clear = useShop((s) => s.clear)
  const user = useAuth((s) => s.user)
  const past = useOrders((s) => s.orders)
  const record = useOrders((s) => s.record)
  const navigate = useNavigate()

  // Prefill from the last order, then the account email.
  const [address, setAddress] = useState<Address>(() => {
    const blank: Address = { name: '', email: '', line1: '', city: '', postcode: '', country: COUNTRIES[0] }
    const last = past[0]?.address
    return { ...blank, ...last, email: last?.email ?? user?.email ?? '' }
  })
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const [delivery, setDelivery] = useState<DeliveryOption['id']>('standard')
  const [placing, setPlacing] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  const idempotencyKey = useRef(crypto.randomUUID?.() ?? String(Date.now()))
  const formRef = useRef<HTMLFormElement>(null)
  // Summary starts open on wide screens, folded on phones (form first).
  const [summaryOpen] = useState(() => !window.matchMedia('(max-width: 760px)').matches)

  const errors = useMemo(() => {
    const e: Partial<Record<Field, string>> = {}
    for (const f of REQUIRED) if (!String(address[f] ?? '').trim()) e[f] = MESSAGES[f]
    if (address.email && !EMAIL.test(address.email.trim())) e.email = MESSAGES.email
    return e
  }, [address])

  const subtotal = subtotalOf(cart)
  const totals = price({ lines: cart, delivery })

  // Nothing to buy, or sizes still missing: back to the bag.
  if (!placing && (!cart.length || cart.some((l) => needsSize(l.product.slot) && !l.size))) {
    return <Navigate to="/cart" replace />
  }

  const set = (f: Field) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setAddress((a) => ({ ...a, [f]: e.target.value }))
  const blur = (f: Field) => () => setTouched((t) => ({ ...t, [f]: true }))
  const err = (f: Field) => (touched[f] ? errors[f] : undefined)

  const place = async (e: React.FormEvent) => {
    e.preventDefault()
    if (Object.keys(errors).length) {
      setTouched(Object.fromEntries(REQUIRED.map((f) => [f, true])))
      // Take the shopper to the first problem rather than leaving them to look.
      const first = REQUIRED.find((f) => errors[f])
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
      return
    }
    setPlacing(true); setFailed(null)
    try {
      const order = await orders.place({
        lines: cart,
        address: { ...address, email: address.email.trim() },
        delivery,
        idempotencyKey: idempotencyKey.current,
      })
      record(order)
      clear()
      navigate(`/orders/${order.id}?placed=1`, { replace: true })
    } catch {
      setFailed('We couldn’t place your order. Nothing was charged — please try again.')
      setPlacing(false)
    }
  }

  const input = (f: Field, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, wide = false) => (
    <label className={`co-field ${wide ? 'wide' : ''} ${err(f) ? 'bad' : ''}`}>
      <span>{label}{!REQUIRED.includes(f) && <em> (optional)</em>}</span>
      <input
        name={f} value={address[f] ?? ''} onChange={set(f)} onBlur={blur(f)}
        aria-invalid={Boolean(err(f))} aria-describedby={err(f) ? `${f}-err` : undefined}
        {...props}
      />
      {err(f) && <small id={`${f}-err`}>{err(f)}</small>}
    </label>
  )

  return (
    <div className="wrap checkout">
      <header className="co-head">
        <Link to="/cart" className="co-back">← Back to bag</Link>
        <h1>Checkout</h1>
      </header>

      <div className="co-layout">
        <form className="co-form" onSubmit={place} noValidate ref={formRef}>
          <section className="co-step">
            <h2><span>1</span>Contact and delivery address</h2>
            {!user && (
              <p className="co-note">
                Checking out as a guest. <Link to="/signin?next=/checkout">Sign in</Link> to save this order to your account.
              </p>
            )}
            <div className="co-grid">
              {input('email', 'Email', { type: 'email', autoComplete: 'email', inputMode: 'email' }, true)}
              {input('name', 'Full name', { autoComplete: 'name' })}
              {input('phone', 'Phone', { type: 'tel', autoComplete: 'tel', inputMode: 'tel' })}
              {input('line1', 'Address', { autoComplete: 'address-line1' }, true)}
              {input('line2', 'Apartment, suite', { autoComplete: 'address-line2' })}
              {input('city', 'Town or city', { autoComplete: 'address-level2' })}
              {input('postcode', 'Postcode', { autoComplete: 'postal-code', autoCapitalize: 'characters' })}
              <label className="co-field">
                <span>Country</span>
                <select name="country" value={address.country} onChange={set('country')} autoComplete="country-name">
                  {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
            </div>
          </section>

          <section className="co-step">
            <h2><span>2</span>Delivery</h2>
            <div className="co-options" role="radiogroup" aria-label="Delivery speed">
              {DELIVERY.map((d) => {
                const cost = shippingFor(subtotal, d.id)
                return (
                  <label key={d.id} className={`co-option ${delivery === d.id ? 'on' : ''}`}>
                    <input type="radio" name="delivery" checked={delivery === d.id} onChange={() => setDelivery(d.id)} />
                    <span className="co-option-text">
                      <strong>{d.label}</strong>
                      <span>{d.eta}</span>
                    </span>
                    <span className="co-option-price">{cost ? money(cost) : 'Free'}</span>
                  </label>
                )
              })}
            </div>
            {subtotal < FREE_SHIPPING_FROM && (
              <p className="co-note">Standard delivery is free on orders over {money(FREE_SHIPPING_FROM)}.</p>
            )}
          </section>

          <section className="co-step">
            <h2><span>3</span>Review and place order</h2>
            {orders.demo && (
              <p className="co-demo" role="note">
                <strong>Demo store</strong> — no payment is taken and nothing will be shipped.
                Your order is recorded so you can see it in your order history.
              </p>
            )}
            {failed && <p className="co-error" role="alert">{failed}</p>}
            <button className="co-place" type="submit" disabled={placing}>
              {placing ? 'Placing your order…' : `Place order · ${money(totals.total)}`}
            </button>
            <p className="co-fine">Free returns within 30 days. You'll get a confirmation at {address.email || 'your email'}.</p>
          </section>
        </form>

        <aside className="co-summary">
          <details open={summaryOpen} className="co-summary-box">
            <summary>
              <span>Order summary · {cart.reduce((a, l) => a + l.qty, 0)} items</span>
              <strong>{money(totals.total)}</strong>
            </summary>
            <ul className="co-lines">
              {cart.map((l) => (
                <li key={`${l.product.id}-${l.size}`}>
                  <span className="co-thumb"><img src={l.product.image} alt="" /><i>{l.qty}</i></span>
                  <span className="co-line-text">
                    <strong>{l.product.name}</strong>
                    <span>{[l.size, l.product.colorName].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span className="price">{money(l.qty * l.product.price)}</span>
                </li>
              ))}
            </ul>
            <dl className="co-totals">
              <div><dt>Subtotal</dt><dd>{money(totals.subtotal)}</dd></div>
              <div><dt>Delivery</dt><dd>{totals.shipping ? money(totals.shipping) : 'Free'}</dd></div>
              <div className="total"><dt>Total</dt><dd>{money(totals.total)}</dd></div>
            </dl>
          </details>
        </aside>
      </div>
    </div>
  )
}
