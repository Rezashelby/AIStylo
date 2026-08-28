import { Link } from 'react-router-dom'
import { money, orders, revenueSeries, shortDate, stock, topQueries } from '../data'

export default function Dashboard() {
  const revenue = revenueSeries.reduce((a, d) => a + d.value, 0)
  const prev = revenue * 0.883
  const delta = ((revenue - prev) / prev) * 100

  const paid = orders.filter((o) => o.status !== 'refunded')
  const aov = paid.reduce((a, o) => a + o.total, 0) / paid.length
  const lowStock = stock.filter((s) => s.stock <= 6).sort((a, b) => a.stock - b.stock)
  const bestSellers = [...stock].sort((a, b) => b.sold30d - a.sold30d).slice(0, 5)

  return (
    <>
      <header className="apage-head">
        <div>
          <h1 className="apage-title">Dashboard</h1>
          <p className="apage-sub">Last 30 days · updated just now</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="abtn ghost">Export CSV</button>
          <Link to="/admin/products" className="abtn">Add product</Link>
        </div>
      </header>

      <div className="stat-row">
        <Stat label="Revenue" value={money(revenue)} delta={delta} />
        <Stat label="Orders" value={String(orders.length)} delta={6.4} />
        <Stat label="Avg. order value" value={money(aov)} delta={2.1} />
        <Stat label="Stylist → cart" value="38.2%" delta={11.5} />
      </div>

      <div className="two-col">
        <section className="apanel">
          <div className="apanel-head">
            <h2 className="apanel-title">Revenue</h2>
            <span className="pill live">Live</span>
          </div>
          <RevenueChart />
        </section>

        <section className="apanel">
          <div className="apanel-head">
            <h2 className="apanel-title">Top requests</h2>
            <Link to="/admin/insights" className="abtn ghost">All</Link>
          </div>
          <ul className="qlist">
            {topQueries.slice(0, 5).map((q) => (
              <li key={q.query}>
                <p>{q.query}</p>
                <div className="qlist-meta">
                  <span>{q.count}×</span>
                  <div className={`meter ${q.avgMatch >= 80 ? 'good' : q.avgMatch >= 60 ? 'warn' : 'bad'}`}>
                    <i style={{ width: `${q.avgMatch}%` }} />
                  </div>
                  <span>{q.avgMatch}%</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="two-col" style={{ marginTop: 16 }}>
        <section className="apanel">
          <div className="apanel-head">
            <h2 className="apanel-title">Recent orders</h2>
            <Link to="/admin/orders" className="abtn ghost">View all</Link>
          </div>
          <div className="atable-wrap">
            <table className="atable">
              <thead>
                <tr><th>Order</th><th>Customer</th><th>Date</th><th>Status</th><th className="num">Total</th></tr>
              </thead>
              <tbody>
                {orders.slice(0, 6).map((o) => (
                  <tr key={o.id}>
                    <td><strong>{o.id}</strong></td>
                    <td>{o.customer}</td>
                    <td className="muted">{shortDate(o.placedAt)}</td>
                    <td><span className={`pill ${o.status}`}>{o.status}</span></td>
                    <td className="num">{money(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="apanel">
          <div className="apanel-head">
            <h2 className="apanel-title">Low stock</h2>
            <span className="pill draft">{lowStock.length}</span>
          </div>
          {lowStock.length ? (
            <ul className="slist">
              {lowStock.slice(0, 6).map((s) => (
                <li key={s.product.id}>
                  <img src={s.product.image} alt="" />
                  <div>
                    <strong>{s.product.name}</strong>
                    <span>{s.product.brand}</span>
                  </div>
                  <b className={s.stock <= 2 ? 'crit' : ''}>{s.stock}</b>
                </li>
              ))}
            </ul>
          ) : <p className="aempty">Everything well stocked.</p>}

          <div className="apanel-head" style={{ marginTop: 22 }}>
            <h2 className="apanel-title">Best sellers</h2>
          </div>
          <ul className="slist">
            {bestSellers.map((s) => (
              <li key={s.product.id}>
                <img src={s.product.image} alt="" />
                <div>
                  <strong>{s.product.name}</strong>
                  <span>{money(s.product.price)}</span>
                </div>
                <b>{s.sold30d}</b>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}

function Stat({ label, value, delta }: { label: string; value: string; delta: number }) {
  const up = delta >= 0
  return (
    <div className="stat">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      <span className={`stat-delta ${up ? 'up' : 'down'}`}>
        {up ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}% vs. prior 30d
      </span>
    </div>
  )
}

/** Inline area chart — no charting library, so nothing loads from a CDN. */
function RevenueChart() {
  const w = 640, h = 190, pad = 6
  const vals = revenueSeries.map((d) => d.value)
  const max = Math.max(...vals) * 1.08
  const min = Math.min(...vals) * 0.85
  const x = (i: number) => (i / (vals.length - 1)) * (w - pad * 2) + pad
  const y = (v: number) => h - pad - ((v - min) / (max - min)) * (h - pad * 2)

  const line = vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const area = `${line} L${x(vals.length - 1).toFixed(1)},${h} L${x(0).toFixed(1)},${h} Z`

  return (
    <>
      <svg className="chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img"
        aria-label={`Revenue over the last 30 days, ${money(vals.reduce((a, b) => a + b, 0))} total`}>
        <defs>
          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--a-accent)" stopOpacity=".22" />
            <stop offset="1" stopColor="var(--a-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((t) => (
          <line key={t} x1="0" x2={w} y1={h * t} y2={h * t} stroke="var(--a-line)" strokeWidth="1" />
        ))}
        <path d={area} fill="url(#rev)" />
        <path d={line} fill="none" stroke="var(--a-accent)" strokeWidth="1.8"
          strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <circle cx={x(vals.length - 1)} cy={y(vals[vals.length - 1])} r="3.4" fill="var(--a-accent)" />
      </svg>
      <div className="chart-x">
        <span>{shortDate(revenueSeries[0].date)}</span>
        <span>{shortDate(revenueSeries[14].date)}</span>
        <span>{shortDate(revenueSeries[29].date)}</span>
      </div>
    </>
  )
}
