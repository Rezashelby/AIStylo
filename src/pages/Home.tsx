import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import ProductCard from '@/components/ProductCard'
import { catalog } from '@/data/catalog'
import './home.css'

const PROMPTS = [
  'A first day at a new office, and I want to look considered',
  'Dinner somewhere dark and good, early autumn',
  'Ten hours on a plane, arriving straight into a meeting',
  'A spring wedding — guest, not wedding party',
]

const STEPS = [
  { n: '01', t: 'Tell it plainly', d: 'Write the way you would text a friend who dresses well. No filters, no dropdowns — a sentence about where you are going is enough.' },
  { n: '02', t: 'It reads the brief', d: 'Occasion, formality, season, palette and budget are pulled from your words, then matched against every piece in the catalogue.' },
  { n: '03', t: 'Looks, not lists', d: 'Complete outfits come back assembled — checked for palette harmony and a consistent register, with the reasoning shown.' },
]

export default function Home() {
  const [q, setQ] = useState('')
  const nav = useNavigate()
  const featured = catalog.filter((p) => [4, 5].includes(p.formality)).slice(0, 8)

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
              Dress for the<br /><em>occasion</em>, not<br />the algorithm.
            </h1>
            <p className="lede rise" style={{ animationDelay: '160ms' }}>
              Describe where you are going. AIStylo reads the brief the way a stylist
              would — occasion, register, palette, season — and returns complete looks
              from our catalogue, each one explaining itself.
            </p>

            <form
              className="hero-ask rise"
              style={{ animationDelay: '240ms' }}
              onSubmit={(e) => { e.preventDefault(); go(q) }}
            >
              <input
                className="field"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Where are you going?"
                aria-label="Describe your occasion"
              />
              <button className="btn" type="submit">Style me</button>
            </form>

            <div className="hero-prompts rise" style={{ animationDelay: '320ms' }}>
              {PROMPTS.slice(0, 3).map((p) => (
                <button key={p} className="chip" onClick={() => go(p)}>{p}</button>
              ))}
            </div>
          </div>

          <div className="hero-art" aria-hidden>
            {catalog.slice(0, 3).map((p, i) => (
              <figure key={p.id} className={`hero-tile t${i + 1} rise`} style={{ animationDelay: `${240 + i * 120}ms` }}>
                <img src={p.image} alt="" />
              </figure>
            ))}
            <div className="hero-note rise" style={{ animationDelay: '660ms' }}>
              <span className="eyebrow">Look 01</span>
              <p>Neutral base, one warm accent — calm enough to repeat all week.</p>
            </div>
          </div>
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
