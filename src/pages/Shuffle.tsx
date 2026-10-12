import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, type PanInfo } from 'framer-motion'
import { catalog } from '@/data/catalog'
import { styleRead } from '@/lib/taste'
import { useProfile } from '@/store'
import type { Product } from '@/types'
import './shuffle.css'

/** How far a card must be dragged, in px, to count as a decision. */
const THRESHOLD = 110

/**
 * Style Shuffle: love or pass, one piece at a time.
 *
 * Quicker than a questionnaire and more honest — people know what they like
 * when they see it far better than they can describe it. Every rating feeds
 * the stylist's scoring through `lib/taste.ts`.
 */
export default function Shuffle() {
  const profile = useProfile((s) => s.profile)
  const set = useProfile((s) => s.set)
  const liked = profile.liked ?? []
  const passed = profile.passed ?? []

  // Shuffled once per visit, so the order does not jump as ratings land.
  const order = useMemo(() => [...catalog].sort(() => Math.random() - 0.5), [])
  const queue = order.filter((p) => !liked.includes(p.id) && !passed.includes(p.id))
  const current = queue[0]
  const [exit, setExit] = useState<1 | -1>(1)
  const [last, setLast] = useState<{ id: string; loved: boolean } | null>(null)

  const rate = (p: Product, loved: boolean) => {
    setExit(loved ? 1 : -1)
    setLast({ id: p.id, loved })
    set(loved ? { liked: [...liked, p.id] } : { passed: [...passed, p.id] })
  }

  const undo = () => {
    if (!last) return
    set(last.loved
      ? { liked: liked.filter((id) => id !== last.id) }
      : { passed: passed.filter((id) => id !== last.id) })
    setLast(null)
  }

  const restart = () => { set({ liked: [], passed: [] }); setLast(null) }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (!current) return
      if (e.key === 'ArrowRight') rate(current, true)
      if (e.key === 'ArrowLeft') rate(current, false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const rated = catalog.length - queue.length
  const read = styleRead(profile)

  return (
    <div className="wrap shuffle">
      <header className="sh-head">
        <p className="eyebrow">Style Shuffle</p>
        <h1 className="sh-title">Love it, or pass.</h1>
        <p className="lede">
          No questions — just react. Every answer teaches the stylist what you
          reach for, and it weighs the looks it builds accordingly.
        </p>
      </header>

      <div className="sh-body">
        <section className="sh-stage" aria-live="polite">
          <div className="sh-progress" aria-label={`${rated} of ${catalog.length} rated`}>
            <span style={{ width: `${(rated / catalog.length) * 100}%` }} />
          </div>

          <div className="sh-deck">
            <AnimatePresence initial={false} custom={exit}>
              {current ? (
                <motion.article
                  key={current.id}
                  className="sh-card"
                  drag="x"
                  dragSnapToOrigin
                  onDragEnd={(_, info: PanInfo) => {
                    if (Math.abs(info.offset.x) > THRESHOLD) rate(current, info.offset.x > 0)
                  }}
                  whileDrag={{ cursor: 'grabbing' }}
                  initial={{ opacity: 0, scale: 0.96, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0, x: 0, rotate: 0 }}
                  exit={{ opacity: 0, x: exit * 260, rotate: exit * 8, transition: { duration: 0.32 } }}
                  style={{ touchAction: 'pan-y' }}
                >
                  <div className="sh-img">
                    <img src={current.image} alt={current.name} draggable={false} />
                  </div>
                  <div className="sh-meta">
                    <p className="eyebrow">{current.brand}</p>
                    <h2>{current.name}</h2>
                    <p className="sh-desc">{current.description}</p>
                    <p className="sh-facts">
                      <span>{current.material}</span>
                      <span>{current.colorName}</span>
                      <span className="price">${current.price}</span>
                    </p>
                  </div>
                </motion.article>
              ) : (
                <motion.div key="done" className="sh-done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h2>That's the whole collection.</h2>
                  <p className="lede">
                    You loved {liked.length} and passed on {passed.length}. The
                    stylist is already using it.
                  </p>
                  <div className="sh-done-actions">
                    <Link to="/stylist" className="btn">Style me now</Link>
                    <button className="btn ghost" onClick={restart}>Start over</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {current && (
            <div className="sh-controls">
              <button className="sh-btn pass" onClick={() => rate(current, false)} aria-label="Pass">
                <Cross /> Pass
              </button>
              <button className="sh-undo" onClick={undo} disabled={!last}>Undo</button>
              <button className="sh-btn love" onClick={() => rate(current, true)} aria-label="Love">
                <Heart /> Love
              </button>
            </div>
          )}
          {current && (
            <p className="sh-hint muted">
              <span className="touch">Swipe right to love, left to pass</span>
              <span className="keys">Drag the card, or use ← and → keys</span>
            </p>
          )}
        </section>

        <aside className="sh-read">
          <p className="eyebrow">What the stylist has learned</p>
          {read.drawnTo.length || read.avoid.length ? (
            <>
              {!!read.drawnTo.length && (
                <div className="sh-read-group">
                  <h3>Drawn to</h3>
                  <ul>{read.drawnTo.map((t) => <li key={t}>{t}</li>)}</ul>
                </div>
              )}
              {!!read.avoid.length && (
                <div className="sh-read-group">
                  <h3>Less keen on</h3>
                  <ul className="neg">{read.avoid.map((t) => <li key={t}>{t}</li>)}</ul>
                </div>
              )}
            </>
          ) : (
            <p className="sh-read-empty">
              A pattern shows up after a few answers. One love is a preference;
              three is a style.
            </p>
          )}
          <p className="sh-read-count">
            <strong>{liked.length}</strong> loved · <strong>{passed.length}</strong> passed
          </p>
          {rated > 0 && current && (
            <button className="sh-reset" onClick={restart}>Clear my answers</button>
          )}
        </aside>
      </div>
    </div>
  )
}

function Heart() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20Z" />
    </svg>
  )
}

function Cross() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  )
}
