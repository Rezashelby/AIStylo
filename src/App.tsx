import { Suspense, lazy, useEffect, useRef } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import BagToast from '@/components/BagToast'
import Home from '@/pages/Home'

// The storefront's first paint only needs Home; everything else — and the whole
// admin bundle — loads on demand.
const Shop     = lazy(() => import('@/pages/Shop'))
const Stylist  = lazy(() => import('@/pages/Stylist'))
const Product  = lazy(() => import('@/pages/Product'))
const Cart     = lazy(() => import('@/pages/Cart'))
const Lookbook = lazy(() => import('@/pages/Lookbook'))
const Profile  = lazy(() => import('@/pages/Profile'))
const Shuffle  = lazy(() => import('@/pages/Shuffle'))
const SignIn   = lazy(() => import('@/pages/SignIn'))
const Checkout = lazy(() => import('@/pages/Checkout'))
const OrderDetail = lazy(() => import('@/pages/OrderDetail'))
const Admin    = lazy(() => import('@/admin/Admin'))

function ScrollToTop() {
  const { pathname, hash } = useLocation()
  const lastPath = useRef(pathname)
  useEffect(() => {
    const newPage = lastPath.current !== pathname
    lastPath.current = pathname
    // `#section` links: the page may still be loading, so look for the
    // target for a moment before giving up. Dialog hashes are not sections.
    if (hash && hash.length > 1) {
      let tries = 0
      const t = setInterval(() => {
        const el = document.getElementById(hash.slice(1))
        if (el || ++tries > 20) {
          clearInterval(t)
          el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 50)
      return () => clearInterval(t)
    }
    // Only a new page starts at the top; opening or closing a dialog
    // (a hash change on the same page) must not move the scroll.
    if (newPage) window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

function Loading() {
  return <div className="route-loading" role="status" aria-label="Loading" />
}

export default function App() {
  const { pathname } = useLocation()
  const isAdmin = pathname.startsWith('/admin')
  // Sign-in is a focused task: no footer competing with the form.
  const bare = pathname === '/signin' || pathname === '/checkout'

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
            <Route path="/profile" element={<Profile />} />
            <Route path="/shuffle" element={<Shuffle />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
            <Route path="/admin/*" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      {!isAdmin && !bare && <Footer />}
      {!isAdmin && <BagToast />}
    </div>
  )
}

function NotFound() {
  return (
    <div className="wrap empty" style={{ paddingBlock: 130 }}>
      <h3>That page doesn't exist.</h3>
      <a className="btn ghost small" href="/">Back home</a>
    </div>
  )
}
