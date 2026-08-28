import { Link, NavLink, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useShop } from '@/store'
import './nav.css'

const LINKS = [
  { to: '/shop', label: 'Shop' },
  { to: '/stylist', label: 'Stylist' },
  { to: '/lookbook', label: 'Lookbook' },
]

export default function Nav() {
  const count = useShop((s) => s.cart.reduce((a, l) => a + l.qty, 0))
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setOpen(false), [pathname])

  return (
    <header className={`nav ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="wrap nav-inner">
        <Link to="/" className="brand" aria-label="AIStylo home">
          <span className="brand-mark">A</span>
          <span className="brand-word">AIStylo</span>
        </Link>

        <nav className="nav-links" aria-label="Primary">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="nav-actions">
          <Link to="/stylist" className="nav-cta">
            <Sparkle />
            <span>Ask the stylist</span>
          </Link>
          <Link to="/cart" className="nav-cart" aria-label={`Cart, ${count} items`}>
            <Bag />
            {count > 0 && <span className="cart-dot">{count}</span>}
          </Link>
          <button
            className="nav-burger"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="Toggle menu"
          >
            <span /><span />
          </button>
        </div>
      </div>

      {open && (
        <div className="nav-drawer">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className="drawer-link">{l.label}</NavLink>
          ))}
          <NavLink to="/cart" className="drawer-link">Cart{count > 0 ? ` (${count})` : ''}</NavLink>
        </div>
      )}
    </header>
  )
}

function Bag() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M6 8h12l-1 12H7L6 8Z" strokeLinejoin="round" />
      <path d="M9.2 8V6.4a2.8 2.8 0 0 1 5.6 0V8" strokeLinecap="round" />
    </svg>
  )
}

function Sparkle() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.6l1.9 5.6 5.6 1.9-5.6 1.9L12 17.6l-1.9-5.6L4.5 10.1l5.6-1.9L12 2.6Z" />
      <path d="M18.8 15.4l.85 2.5 2.5.85-2.5.85-.85 2.5-.85-2.5-2.5-.85 2.5-.85.85-2.5Z" opacity=".55" />
    </svg>
  )
}
