import { Suspense, lazy, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import Home from '@/pages/Home'

// The storefront's first paint only needs Home; everything else — and the whole
// admin bundle — loads on demand.
const Shop     = lazy(() => import('@/pages/Shop'))
const Stylist  = lazy(() => import('@/pages/Stylist'))
const Product  = lazy(() => import('@/pages/Product'))
const Cart     = lazy(() => import('@/pages/Cart'))
const Lookbook = lazy(() => import('@/pages/Lookbook'))
const Admin    = lazy(() => import('@/admin/Admin'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function Loading() {
  return <div className="route-loading" role="status" aria-label="Loading" />
}

export default function App() {
  const { pathname } = useLocation()
  const isAdmin = pathname.startsWith('/admin')

  return (
    <div className="app">
      <ScrollToTop />
      {!isAdmin && <Nav />}
      <main className="app-main">
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/stylist" element={<Stylist />} />
            <Route path="/product/:id" element={<Product />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/lookbook" element={<Lookbook />} />
            <Route path="/admin/*" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      {!isAdmin && <Footer />}
    </div>
  )
}

function NotFound() {
  return (
    <div className="wrap empty" style={{ padding: '130px 0' }}>
      <h3>That page doesn't exist.</h3>
      <a className="btn ghost small" href="/">Back home</a>
    </div>
  )
}
