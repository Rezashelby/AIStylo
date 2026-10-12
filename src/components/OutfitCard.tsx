import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { lookKey, useProfile, useShop } from '@/store'
import { feedbackOptions, feedbackPatch, swapPiece, type LookFeedback } from '@/lib/stylist'
import type { Outfit, Slot } from '@/types'
import './outfit-card.css'

const SLOT_LABEL: Record<string, string> = {
  top: 'Top', bottom: 'Bottom', dress: 'Dress', outerwear: 'Layer',
  shoes: 'Shoes', bag: 'Bag', accessory: 'Finish',
}

interface Props {
  o: Outfit
  index?: number
  /**
   * Called after "not for me" feedback has been written to the profile, with
   * a sentence saying what changed. Where omitted, the card shows that
   * sentence itself.
   */
  onFeedback?: (note: string) => void
}

export default function OutfitCard({ o, index = 0, onFeedback }: Props) {
  const add = useShop((s) => s.add)
  const toggleLook = useShop((s) => s.toggleLook)
  const [look, setLook] = useState(o)
  // Pieces already shown per slot, so repeated swaps walk the whole list.
  const [tried, setTried] = useState<Partial<Record<Slot, string[]>>>({})
  const [exhausted, setExhausted] = useState<string | null>(null)
  const [asking, setAsking] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const isSaved = useShop((s) => s.savedLooks.some((l) => lookKey(l) === lookKey(look)))

  // A restyle hands the card a new look; drop edits made to the old one.
  useEffect(() => {
    setLook(o); setTried({}); setExhausted(null); setAsking(false); setNote(null)
  }, [o])

  const total = look.items.reduce((a, p) => a + p.price, 0)
  const swapped = lookKey(look) !== lookKey(o)

  const swap = (id: string, slot: Slot) => {
    const profile = useProfile.getState().profile
    const seen = [...(tried[slot] ?? []), id]
    let next = swapPiece(look, id, seen, profile)
    let history = seen
    if (!next) {
      // Every alternative has been shown; start the cycle again.
      history = [id]
      next = swapPiece(look, id, history, profile)
    }
    if (!next) { setExhausted(id); return }
    setExhausted(null)
    setTried({ ...tried, [slot]: history })
    setLook(next)
  }

  const reject = (reason: LookFeedback) => {
    const { profile, set } = useProfile.getState()
    const { patch, note } = feedbackPatch(look, reason, profile)
    set(patch)
    setAsking(false)
    if (onFeedback) onFeedback(note)
    else setNote(note)
  }

  return (
    <article className="ocard rise" style={{ animationDelay: `${index * 90}ms` }}>
      <header className="ocard-head">
        <div>
          <p className="eyebrow">Look {index + 1}{swapped && ' · edited'}</p>
          <h3 className="ocard-title">{look.title}</h3>
        </div>
        <div className="ocard-head-right">
          <button
            className={`ocard-save ${isSaved ? 'on' : ''}`}
            onClick={() => toggleLook(look)}
            aria-pressed={isSaved}
            aria-label={isSaved ? `Remove ${look.title} from saved looks` : `Save ${look.title}`}
            title={isSaved ? 'Saved to your lookbook' : 'Save this look'}
          >
            <Heart />
          </button>
          <span className="ocard-match" title="How closely this look fits what you asked for">
            {look.score}% match
          </span>
        </div>
      </header>

      <div className="ocard-rail scroll-thin">
        {look.items.map((p) => {
          const sized = look.sizes?.find((s) => s.productId === p.id)
          return (
            <div key={p.slot} className="ocard-item">
              <Link to={`/product/${p.id}`} className="ocard-link">
                <div className="ocard-thumb">
                  <img key={p.id} src={p.image} alt={p.name} loading="lazy" />
                  {sized && (
                    <span
                      className={`ocard-size ${sized.confidence}`}
                      title={`Suggested size — ${sized.basis}`}
                    >
                      {sized.size}
                    </span>
                  )}
                </div>
                <p className="ocard-slot">{SLOT_LABEL[p.slot] ?? p.slot}</p>
                <p className="ocard-item-name">{p.name}</p>
                <p className="ocard-item-price price">${p.price}</p>
              </Link>
              <button
                className="ocard-swap"
                onClick={() => swap(p.id, p.slot)}
                aria-label={`Swap the ${p.name} for another ${SLOT_LABEL[p.slot]?.toLowerCase() ?? p.slot}`}
                title={exhausted === p.id ? 'Nothing else in the catalogue fits here' : 'Swap this piece'}
                disabled={exhausted === p.id}
              >
                <SwapIcon />
              </button>
            </div>
          )
        })}
      </div>

      <div className="ocard-why">
        <p className="eyebrow">Why this works</p>
        <p>{look.rationale}</p>
      </div>

      {asking && (
        <div className="ocard-feedback" role="group" aria-label="Why isn't this look right?">
          <p className="eyebrow">What's off?</p>
          <div className="ocard-reasons">
            {feedbackOptions(look).map((r) => (
              <button key={r.value} className="ocard-reason" onClick={() => reject(r.value)}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {note && <p className="ocard-note" role="status">{note}</p>}

      <footer className="ocard-foot">
        <span className="ocard-total">
          <span className="muted">{look.items.length} pieces</span>
          <strong className="price">${total.toLocaleString()}</strong>
        </span>
        <div className="ocard-actions">
          {!note && (
            <button className="ocard-pass" onClick={() => setAsking((v) => !v)} aria-expanded={asking}>
              {asking ? 'Never mind' : 'Not for me'}
            </button>
          )}
          <button className="btn small" onClick={() => look.items.forEach((p) => add(p))}>
            Add look to bag
          </button>
        </div>
      </footer>
    </article>
  )
}

function Heart() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20Z"
        strokeLinejoin="round" />
    </svg>
  )
}

function SwapIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
