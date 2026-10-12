import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import ProductCard from '@/components/ProductCard'
import { catalog } from '@/data/catalog'
import { styleRequest } from '@/lib/stylist'
import './home.css'

/** Short label on the chip; the full brief is what the stylist receives. */
const PROMPTS = [
  { label: 'First day at the office', brief: 'A first day at a new office, and I want to look considered' },
  { label: 'Dinner, early autumn', brief: 'Dinner somewhere dark and good, early autumn' },
  { label: 'Long-haul flight', brief: 'Ten hours on a plane, arriving straight into a meeting' },
  { label: 'Spring wedding', brief: 'A spring wedding — guest, not wedding party' },
]

/** How long each example look stays up before the next. */
const EXAMPLE_MS = 5200

const STEPS = [
  { n: '01', t: 'Tell it plainly', d: 'Write the way you would text a friend who dresses well. No filters, no dropdowns — a sentence about where you are going is enough.' },
  { n: '02', t: 'It reads the brief', d: 'It picks up the occasion, how dressed up to be, the season, colours and budget — then searches every piece we carry.' },
  { n: '03', t: 'Looks, not lists', d: 'You get finished outfits whose colours and dress code agree, each with a one-line reason. Add a whole look in one tap.' },
]

export default function Home() {
  const [q, setQ] = useState('')
  const nav = useNavigate()
  const featured = catalog.filter((p) => [4, 5].includes(p.formality)).slice(0, 8)

  // Real engine output, not a mock-up: the hero shows what the stylist does.
  const examples = useMemo(
    () => PROMPTS.map((p) => ({ ...p, look: styleRequest(p.brief, 1).outfits[0] }))
      .filter((e) => e.look),
    [],
  )
  const [shown, setShown] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (paused || still || examples.length < 2) return
    const t = setTimeout(() => setShown((i) => (i + 1) % examples.length), EXAMPLE_MS)
    return () => clearTimeout(t)
  }, [shown, paused, examples.length])
  const ex = examples[shown]

  const go = (text: string) => {
    const v = text.trim()
    if (v) nav(`/stylist?q=${encodeURIComponent(v)}`)
  }

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="wrap hero-inner">
          <div className="hero-copy">
            <p className="eyebrow rise">Personal styling, on demand</p>
            <h1 className="hero-title rise" style={{ animationDelay: '80ms' }}>
              Tell us the <em>occasion</em>.<br />We'll dress you for it.
            </h1>
            <p className="lede rise" style={{ animationDelay: '160ms' }}>
              Describe where you're going in your own words. You'll get complete
              outfits from our collection, each with a short note on why it works.
            </p>

            <form
              className="hero-ask rise"
              style={{ animationDelay: '240ms' }}
              onSubmit={(e) => { e.preventDefault(); go(q) }}
            >
              <input
                className="hero-input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Where are you going?"
                aria-label="Describe your occasion"
              />
              <button className="hero-go" type="submit" aria-label="Style me">
                <span>Style me</span>
                <Arrow />
              </button>
            </form>

            <div className="hero-prompts rise" style={{ animationDelay: '320ms' }}>
              <span className="muted">Try</span>
              {PROMPTS.map((p) => (
                <button key={p.label} className="chip" onClick={() => go(p.brief)} title={p.brief}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {ex && (
            <aside
              className="hero-demo rise"
              style={{ animationDelay: '260ms' }}
              aria-label="Example: a look the stylist built"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
              onFocus={() => setPaused(true)}
              onBlur={() => setPaused(false)}
            >
              <div className="demo-ask" key={`ask-${shown}`}>
                <span className="eyebrow">You asked</span>
                <p>“{ex.brief}”</p>
              </div>

              <div className="demo-look" key={`look-${shown}`}>
                {ex.look.items.slice(0, 4).map((p, i) => (
                  <figure key={p.id} style={{ animationDelay: `${i * 70}ms` }}>
                    <img src={p.image} alt={p.name} />
                    <figcaption>{p.name}</figcaption>
                  </figure>
                ))}
              </div>

              <footer className="demo-foot">
                <div>
                  <p className="demo-title">{ex.look.title}</p>
                  <p className="demo-meta">
                    {ex.look.score}% match · {ex.look.items.length} pieces · $
                    {ex.look.items.reduce((a, p) => a + p.price, 0).toLocaleString()}
                  </p>
                </div>
                <Link to={`/stylist?q=${encodeURIComponent(ex.brief)}`} className="demo-open">
                  See the looks <Arrow />
                </Link>
              </footer>

              <div className="demo-dots" role="tablist" aria-label="Examples">
                {examples.map((e, i) => (
                  <button
                    key={e.label}
                    role="tab"
                    aria-selected={i === shown}
                    aria-label={e.label}
                    className={i === shown ? 'on' : ''}
                    onClick={() => setShown(i)}
                  />
                ))}
              </div>
            </aside>
          )}
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section className="section">
        <div className="wrap">
          <header className="section-head">
            <p className="eyebrow">How it works</p>
            <h2 className="section-title">Three steps, one sentence of effort.</h2>
          </header>
          <div className="steps">
            {STEPS.map((s) => (
              <div key={s.n} className="step">
                <span className="step-n">{s.n}</span>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured ──────────────────────────────────────────────────── */}
      <section className="section section-alt">
        <div className="wrap">
          <header className="section-head row-head">
            <div>
              <p className="eyebrow">The edit</p>
              <h2 className="section-title">Pieces worth building around.</h2>
            </div>
            <Link to="/shop" className="btn ghost small">View all</Link>
          </header>
          <div className="grid-4">
            {featured.map((p, i) => <ProductCard key={p.id} p={p} index={i} />)}
          </div>
        </div>
      </section>

      {/* ── Closing ───────────────────────────────────────────────────── */}
      <section className="closer">
        <div className="wrap closer-inner">
          <h2 className="closer-title">
            Still deciding?<br />Just describe the day.
          </h2>
          <p className="lede">
            The stylist works from plain language. Tell it the weather, the room, the
            people who will be there — it will handle the rest.
          </p>
          <Link to="/stylist" className="btn">Open the stylist</Link>
        </div>
      </section>
    </>
  )
}

function Arrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
