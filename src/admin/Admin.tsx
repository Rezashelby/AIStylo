import { NavLink, Navigate, Route, Routes, Link } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Orders from './pages/Orders'
import Insights from './pages/Insights'
import './admin.css'

const NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: 'M3 12h4l2.5-7 4 14L16 12h5' },
  { to: '/admin/products',  label: 'Products',  icon: 'M4 7h16v13H4zM8 7V5a4 4 0 0 1 8 0v2' },
  { to: '/admin/orders',    label: 'Orders',    icon: 'M5 4h14v16l-7-3-7 3z' },
  { to: '/admin/insights',  label: 'Stylist',   icon: 'M12 3l2 5.5L19.5 10 14 12l-2 5.5L10 12 4.5 10 10 8.5z' },
]

export default function Admin() {
  return (
    <div className="admin">
      <aside className="admin-side">
        <Link to="/" className="admin-brand">
          <span className="brand-mark">A</span>
          <span>
            <strong>AIStylo</strong>
            <em>Admin</em>
          </span>
        </Link>

        <nav className="admin-nav" aria-label="Admin sections">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => `admin-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d={n.icon} />
              </svg>
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-user">
          <div className="admin-avatar" aria-hidden>RM</div>
          <div>
            <p>Reza M.</p>
            <span>Owner</span>
          </div>
        </div>

        <Link to="/" className="admin-exit">← Back to storefront</Link>
      </aside>

      <div className="admin-body">
        <Routes>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="orders" element={<Orders />} />
          <Route path="insights" element={<Insights />} />
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Routes>
      </div>
    </div>
  )
}
