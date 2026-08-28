import { Link } from 'react-router-dom'
import './footer.css'

const COLUMNS = [
  { title: 'Shop', links: [
    { to: '/shop', label: 'Everything' },
    { to: '/shop?slot=outerwear', label: 'Outerwear' },
    { to: '/shop?slot=dress', label: 'Dresses' },
    { to: '/shop?slot=shoes', label: 'Shoes' },
  ]},
  { title: 'Discover', links: [
    { to: '/stylist', label: 'The stylist' },
    { to: '/lookbook', label: 'Lookbook' },
  ]},
  { title: 'Care', links: [
    { to: '/shop', label: 'Shipping' },
    { to: '/shop', label: 'Returns' },
    { to: '/shop', label: 'Contact' },
  ]},
]

export default function Footer() {
  return (
    <footer className="foot">
      <div className="wrap foot-inner">
        <div className="foot-brand">
          <Link to="/" className="brand">
            <span className="brand-mark">A</span>
            <span className="brand-word">AIStylo</span>
          </Link>
          <p className="muted">
            Personal styling for people who would rather describe the day than
            scroll through it.
          </p>
        </div>

        {COLUMNS.map((c) => (
          <nav key={c.title} className="foot-col" aria-label={c.title}>
            <p className="eyebrow">{c.title}</p>
            {c.links.map((l) => <Link key={l.label} to={l.to}>{l.label}</Link>)}
          </nav>
        ))}
      </div>

      <div className="wrap foot-base">
        <p className="muted">© {new Date().getFullYear()} AIStylo</p>
        <Link to="/admin" className="muted foot-admin">Admin</Link>
      </div>
    </footer>
  )
}
