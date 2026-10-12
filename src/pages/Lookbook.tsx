import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import OutfitCard from '@/components/OutfitCard'
import ProductCard from '@/components/ProductCard'
import { byId } from '@/data/catalog'
import { styleRequest } from '@/lib/stylist'
import { useProfile, useShop } from '@/store'
import type { Occasion } from '@/types'
import './lookbook.css'

const EDITS: { occasion: Occasion; title: string; brief: string; query: string }[] = [
  { occasion: 'work', title: 'The Working Week', brief: 'Five days that hold up under fluorescent light and a standing meeting.',
    query: 'polished office looks for the working week, autumn, neutral palette' },
  { occasion: 'evening', title: 'After Hours', brief: 'For rooms that are darker than they are loud.',
    query: 'evening dinner drinks looks, elevated, dark palette' },
  { occasion: 'travel', title: 'In Transit', brief: 'Built for long hauls and short turnarounds.',
    query: 'travel outfit for a long flight arriving into a meeting, comfortable but smart' },
  { occasion: 'weekend', title: 'Off Duty', brief: 'The clothes you actually reach for.',
    query: 'relaxed weekend casual outfit, easy, spring' },
  { occasion: 'formal', title: 'The Occasion', brief: 'When the invitation specifies.',
    query: 'formal wedding guest outfit, elevated and elegant' },
]

/** Tab index for the shopper's own saved looks; the edits are 0..n. */
const SAVED = -1

export default function Lookbook() {
  const savedLooks = useShop((s) => s.savedLooks)
  const savedIds = useShop((s) => s.saved)
  // Newest first; ids for products no longer in the catalogue drop out.
  const savedPieces = [...savedIds].reverse().flatMap((id) => byId(id) ?? [])
  const savedCount = savedLooks.length + savedPieces.length
  const profile = useProfile((s) => s.profile)
  const [params] = useSearchParams()
  // `?tab=saved` opens Saved directly, so other pages can link to it.
  const wantsSaved = params.get('tab') === 'saved'
  const [active, setActive] = useState(wantsSaved ? SAVED : 0)
  // Following a Saved link while already on this page.
  useEffect(() => { if (wantsSaved) setActive(SAVED) }, [wantsSaved])
  const [note, setNote] = useState<string | null>(null)
  // The tab responds at once; the looks for it render a moment later, so a
  // tap never waits on the engine before the screen updates.
  const shown = useDeferredValue(active)
  const showSaved = shown === SAVED
  const edit = EDITS[showSaved ? 0 : shown]
  // Edits are styled for this shopper too, so ratings and feedback show here.
  const looks = useMemo(
    () => styleRequest(edit.query, 4, profile).outfits,
    [edit.query, profile],
  )

  return (
    <div className="wrap lookbook">
      <header className="lb-head">
        <p className="eyebrow">Lookbook</p>
        <h1 className="lb-title">Edits, assembled and explained.</h1>
        <p className="lede">
          Each edit runs the same engine that powers the stylist — the difference
          is that the brief was written for you.
        </p>
      </header>

      <nav className="lb-tabs" aria-label="Edits">
        {EDITS.map((e, i) => (
          <button
            key={e.title}
            className={`lb-tab ${i === active ? 'active' : ''}`}
            onClick={() => { setActive(i); setNote(null) }}
            aria-current={i === active}
          >
            {e.title}
          </button>
        ))}
        <button
          className={`lb-tab ${active === SAVED ? 'active' : ''}`}
          onClick={() => { setActive(SAVED); setNote(null) }}
          aria-current={active === SAVED}
        >
          Saved{savedCount ? ` (${savedCount})` : ''}
        </button>
      </nav>

      {showSaved ? (
        <section className="lb-panel" key="saved">
          <header className="lb-brief">
            <h2>Saved</h2>
            <p className="lede">
              Looks and pieces you kept — tap the heart on anything to add it here.
            </p>
          </header>
          {savedCount ? (
            <>
              {!!savedLooks.length && (
                <div className="lb-saved-group">
                  <h3>Looks <span>{savedLooks.length}</span></h3>
                  <div className="lb-grid">
                    {savedLooks.map((o, i) => <OutfitCard key={o.id} o={o} index={i} />)}
                  </div>
                </div>
              )}
              {!!savedPieces.length && (
                <div className="lb-saved-group">
                  <h3>Pieces <span>{savedPieces.length}</span></h3>
                  <div className="lb-pieces">
                    {savedPieces.map((p, i) => <ProductCard key={p.id} p={p} index={i} />)}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="lb-empty">
              <p>Nothing saved yet. Tap the heart on any look or piece to keep it here.</p>
              <Link to="/stylist" className="btn ghost small">Ask the stylist</Link>
            </div>
          )}
        </section>
      ) : (
        <section className="lb-panel" key={edit.title}>
          <header className="lb-brief">
            <h2>{edit.title}</h2>
            <p className="lede">{edit.brief}</p>
          </header>
          {/* Feedback restyles the edit at once; say what changed above it. */}
          {note && <p className="lb-note" role="status">{note} The edit has been restyled.</p>}
          <div className="lb-grid">
            {looks.map((o, i) => <OutfitCard key={o.id} o={o} index={i} onFeedback={setNote} />)}
          </div>
        </section>
      )}
    </div>
  )
}
