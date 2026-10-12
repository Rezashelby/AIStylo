import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { lineKey, useShop } from '@/store'
import './bag-toast.css'

const count = (cart: ReturnType<typeof useShop.getState>['cart']) => cart.reduce((a, l) => a + l.qty, 0)

/**
 * Confirms every add to bag, wherever it came from.
 *
 * Watches the cart rather than being called by each button, so a new add
 * button can never forget to confirm. Adding a whole look fires several
 * updates in one tick; they are gathered into a single message.
 */
export default function BagToast() {
  const [msg, setMsg] = useState<{ text: string; id: number } | null>(null)
  const { pathname } = useLocation()
  const pending = useRef({ added: 0, name: '' })
  const timers = useRef<{ batch?: number; hide?: number }>({})

  useEffect(() => useShop.subscribe((s, prev) => {
    const delta = count(s.cart) - count(prev.cart)
    if (delta <= 0) return
    const changed = s.cart.find((l) => l.qty > (prev.cart.find((p) => lineKey(p) === lineKey(l))?.qty ?? 0))
    pending.current.added += delta
    pending.current.name ||= changed?.product.name ?? ''

    clearTimeout(timers.current.batch)
    timers.current.batch = window.setTimeout(() => {
      const { added, name } = pending.current
      pending.current = { added: 0, name: '' }
      setMsg({ text: added === 1 ? `${name} added to your bag` : `${added} pieces added to your bag`, id: Date.now() })
      clearTimeout(timers.current.hide)
      timers.current.hide = window.setTimeout(() => setMsg(null), 3200)
    }, 40)
  }), [])

  useEffect(() => () => { clearTimeout(timers.current.batch); clearTimeout(timers.current.hide) }, [])

  // Already looking at the bag: nothing to point to.
  if (!msg || pathname === '/cart') return null

  return (
    <div key={msg.id} className="bag-toast" role="status">
      <Check />
      <span>{msg.text}</span>
      <Link to="/cart" onClick={() => setMsg(null)}>View bag</Link>
    </div>
  )
}

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
