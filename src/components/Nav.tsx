import { Link, NavLink, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth, useShop } from '@/store'
import './nav.css'

/**
 * Two links and one primary action. The stylist is the product, so it is the
 * single filled button rather than one link among many; everything personal
 * (profile, Style Shuffle, saved looks) sits behind the profile icon.
 *
 * Under 760px the links move to a bottom tab bar, inside thumb reach.
 */
const LINKS = [
  { to: '/shop', label: 'Shop' },
  { to: '/lookbook', label: 'Lookbook' },
]

export default function Nav() {
  const count = useShop((s) => s.cart.reduce((a, l) => a + l.qty, 0))
  const user = useAuth((s) => s.user)
  const initial = user?.email[0].toUpperCase()
  const [scrolled, setScrolled] = useState(false)
  // Checkout is a focused task: no tab bar competing with the form.
  const focused = useLocation().pathname === '/checkout'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
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
            <NavLink to="/stylist" className={({ isActive }) => `nav-cta ${isActive ? 'active' : ''}`}>
              <Sparkle />
              <span>Ask the stylist</span>
            </NavLink>
            {user ? (
              <NavLink to="/profile" className="nav-icon nav-profile" aria-label={`Your profile, signed in as ${user.email}`} title={user.email}>
                <span className="nav-avatar">{initial}</span>
              </NavLink>
            ) : (
              <NavLink to="/signin" className="nav-signin">Sign in</NavLink>
            )}
            <CartLink count={count} className="nav-icon" />
          </div>
        </div>
      </header>

      {!focused && <nav className="tabbar" aria-label="Primary">
        <Tab to="/" label="Home" end><HomeIcon /></Tab>
        <Tab to="/shop" label="Shop"><Hanger /></Tab>
        <Tab to="/stylist" label="Stylist" primary><Sparkle size={20} /></Tab>
        <Tab to="/lookbook" label="Looks"><Grid /></Tab>
        <Tab to={user ? '/profile' : '/signin'} label={user ? 'You' : 'Sign in'}>
          {user ? <span className="nav-avatar small">{initial}</span> : <Person />}
        </Tab>
      </nav>}
    </>
  )
}

function CartLink({ count, className }: { count: number; className: string }) {
  // Re-keying the badge replays its bump animation each time the count rises.
  return (
    <Link to="/cart" className={className} aria-label={`Bag, ${count} items`} title="Bag">
      <Bag />
      {count > 0 && <span key={count} className="cart-dot">{count}</span>}
    </Link>
  )
}

function Tab({ to, label, end, primary, children }: {
  to: string; label: string; end?: boolean; primary?: boolean; children: React.ReactNode
}) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `tab ${primary ? 'primary' : ''} ${isActive ? 'active' : ''}`}>
      <span className="tab-icon">{children}</span>
      <span className="tab-label">{label}</span>
    </NavLink>
  )
}

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

function Bag() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M6 8h12l-1 12H7L6 8Z" />
      <path d="M9.2 8V6.4a2.8 2.8 0 0 1 5.6 0V8" />
    </svg>
  )
}

function Person() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <circle cx="12" cy="8.5" r="3.6" />
      <path d="M5 20c.9-3.6 3.6-5.6 7-5.6s6.1 2 7 5.6" />
    </svg>
  )
}

function HomeIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M4 10.5 12 4l8 6.5V20h-5.5v-5.5h-5V20H4v-9.5Z" />
    </svg>
  )
}

function Hanger() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M12 9.5V8.3a2.3 2.3 0 1 0-2.3-2.3" />
      <path d="M12 9.5 3.5 16.2c-.7.6-.3 1.8.7 1.8h15.6c1 0 1.4-1.2.7-1.8L12 9.5Z" />
    </svg>
  )
}

function Grid() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <rect x="4" y="4" width="7" height="9" rx="1" />
      <rect x="13" y="4" width="7" height="5" rx="1" />
      <rect x="4" y="15" width="7" height="5" rx="1" />
      <rect x="13" y="11" width="7" height="9" rx="1" />
    </svg>
  )
}

function Sparkle({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.6l1.9 5.6 5.6 1.9-5.6 1.9L12 17.6l-1.9-5.6L4.5 10.1l5.6-1.9L12 2.6Z" />
      <path d="M18.8 15.4l.85 2.5 2.5.85-2.5.85-.85 2.5-.85-2.5-2.5-.85 2.5-.85.85-2.5Z" opacity=".55" />
    </svg>
  )
}
