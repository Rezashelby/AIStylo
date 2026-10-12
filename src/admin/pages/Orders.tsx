import { useMemo, useState } from 'react'
import { money, orders, shortDate, type AdminOrder, type OrderStatus } from '../data'

const STATUSES: (OrderStatus | 'all')[] = ['all', 'pending', 'paid', 'fulfilled', 'refunded']

export default function Orders() {
  const [status, setStatus] = useState<OrderStatus | 'all'>('all')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<AdminOrder | null>(null)

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    return orders.filter(
      (o) =>
        (status === 'all' || o.status === status) &&
        (!term || o.id.toLowerCase().includes(term) || o.customer.toLowerCase().includes(term) || o.email.includes(term)),
    )
  }, [status, q])

  const revenue = rows.filter((o) => o.status !== 'refunded').reduce((a, o) => a + o.total, 0)

  return (
    <>
      <header className="apage-head">
        <div>
          <h1 className="apage-title">Orders</h1>
          <p className="apage-sub">{rows.length} orders · {money(revenue)} net</p>
        </div>
        <button className="abtn ghost">Export</button>
      </header>

      <div className="atoolbar">
        {STATUSES.map((s) => (
          <button
            key={s}
            className={`abtn ${status === s ? '' : 'ghost'}`}
            onClick={() => setStatus(s)}
            style={{ textTransform: 'capitalize' }}
          >
            {s === 'all' ? 'All' : s}
            {s !== 'all' && <span style={{ opacity: .55 }}>{orders.filter((o) => o.status === s).length}</span>}
          </button>
        ))}
        <span className="aspacer" />
        <input
          className="afield" placeholder="Search order or customer…"
          value={q} onChange={(e) => setQ(e.target.value)} style={{ minWidth: 230 }}
          aria-label="Search orders"
        />
      </div>

      <section className="apanel" style={{ padding: '16px 4px 4px' }}>
        <div className="atable-wrap">
          <table className="atable">
            <thead>
              <tr>
                <th>Order</th><th>Customer</th><th>Date</th>
                <th className="num">Items</th><th>Status</th>
                <th className="num">Total</th><th />
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id}>
                  <td data-label=""><strong>{o.id}</strong></td>
                  <td data-label="Customer">
                    <div>{o.customer}</div>
                    <div style={{ fontSize: 11, color: 'var(--a-ink3)' }}>{o.email}</div>
                  </td>
                  <td data-label="Date">{shortDate(o.placedAt)}</td>
                  <td className="num" data-label="Items">{o.items.reduce((a, i) => a + i.qty, 0)}</td>
                  <td data-label="Status"><span className={`pill ${o.status}`}>{o.status}</span></td>
                  <td className="num" data-label="Total">{money(o.total)}</td>
                  <td className="num" data-label="">
                    <button className="abtn ghost" onClick={() => setOpen(o)}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <p className="aempty">No orders match.</p>}
      </section>

      {open && <OrderDrawer order={open} onClose={() => setOpen(null)} />}
    </>
  )
}

function OrderDrawer({ order, onClose }: { order: AdminOrder; onClose: () => void }) {
  return (
    <div className="drawer-scrim" onClick={onClose} role="presentation">
      <aside
        className="drawer" onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label={`Order ${order.id}`}
      >
        <header className="drawer-head">
          <div>
            <h2>{order.id}</h2>
            <p className="apage-sub">{shortDate(order.placedAt)} · {order.customer}</p>
          </div>
          <button className="abtn ghost" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <div className="drawer-body">
          <div className="drawer-row">
            <span className="stat-label">Status</span>
            <span className={`pill ${order.status}`}>{order.status}</span>
          </div>
          <div className="drawer-row">
            <span className="stat-label">Email</span>
            <span>{order.email}</span>
          </div>

          <p className="stat-label" style={{ marginTop: 20, marginBottom: 10 }}>Items</p>
          <ul className="slist">
            {order.items.map((it, i) => (
              <li key={`${it.product.id}-${i}`}>
                <img src={it.product.image} alt="" />
                <div>
                  <strong>{it.product.name}</strong>
                  <span>{it.product.brand} · qty {it.qty}</span>
                </div>
                <b>{money(it.product.price * it.qty)}</b>
              </li>
            ))}
          </ul>

          <div className="drawer-total">
            <span>Total</span>
            <strong>{money(order.total)}</strong>
          </div>

          <div className="row" style={{ gap: 8, marginTop: 20 }}>
            <button className="abtn" style={{ flex: 1, justifyContent: 'center' }}>Mark fulfilled</button>
            <button className="abtn ghost">Refund</button>
          </div>
        </div>
      </aside>
    </div>
  )
}
