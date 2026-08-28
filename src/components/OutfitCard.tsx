import { Link } from 'react-router-dom'
import { useShop } from '@/store'
import type { Outfit } from '@/types'
import './outfit-card.css'

const SLOT_LABEL: Record<string, string> = {
  top: 'Top', bottom: 'Bottom', dress: 'Dress', outerwear: 'Layer',
  shoes: 'Shoes', bag: 'Bag', accessory: 'Finish',
}

export default function OutfitCard({ o, index = 0 }: { o: Outfit; index?: number }) {
  const add = useShop((s) => s.add)
  const total = o.items.reduce((a, p) => a + p.price, 0)

  return (
    <article className="ocard rise" style={{ animationDelay: `${index * 90}ms` }}>
      <header className="ocard-head">
        <div>
          <p className="eyebrow">Look {index + 1}</p>
          <h3 className="ocard-title">{o.title}</h3>
        </div>
        <div className="ocard-match" title={`${o.score}% match to your request`}>
          <svg viewBox="0 0 40 40" width="42" height="42" aria-hidden>
            <circle cx="20" cy="20" r="17" fill="none" stroke="var(--line)" strokeWidth="2.5" />
            <circle
              cx="20" cy="20" r="17" fill="none" stroke="var(--clay)" strokeWidth="2.5"
              strokeLinecap="round" strokeDasharray={`${(o.score / 100) * 106.8} 106.8`}
              transform="rotate(-90 20 20)"
            />
          </svg>
          <span>{o.score}</span>
          <p className="sr-only">{o.score} percent match</p>
        </div>
      </header>

      <div className="ocard-rail scroll-thin">
        {o.items.map((p) => (
          <Link key={p.id} to={`/product/${p.id}`} className="ocard-item">
            <div className="ocard-thumb"><img src={p.image} alt={p.name} loading="lazy" /></div>
            <p className="ocard-slot">{SLOT_LABEL[p.slot] ?? p.slot}</p>
            <p className="ocard-item-name">{p.name}</p>
            <p className="ocard-item-price price">${p.price}</p>
          </Link>
        ))}
      </div>

      <div className="ocard-why">
        <p className="eyebrow">Why this works</p>
        <p>{o.rationale}</p>
      </div>

      <footer className="ocard-foot">
        <span className="ocard-total">
          <span className="muted">{o.items.length} pieces</span>
          <strong className="price">${total.toLocaleString()}</strong>
        </span>
        <button className="btn small" onClick={() => o.items.forEach((p) => add(p))}>
          Add look to bag
        </button>
      </footer>
    </article>
  )
}
