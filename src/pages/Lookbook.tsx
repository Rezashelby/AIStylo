import { useMemo, useState } from 'react'
import OutfitCard from '@/components/OutfitCard'
import { styleRequest } from '@/lib/stylist'
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

export default function Lookbook() {
  const [active, setActive] = useState(0)
  const edit = EDITS[active]
  const looks = useMemo(() => styleRequest(edit.query, 4).outfits, [edit.query])

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
            onClick={() => setActive(i)}
            aria-current={i === active}
          >
            {e.title}
          </button>
        ))}
      </nav>

      <section className="lb-panel" key={edit.title}>
        <header className="lb-brief">
          <h2>{edit.title}</h2>
          <p className="lede">{edit.brief}</p>
        </header>
        <div className="lb-grid">
          {looks.map((o, i) => <OutfitCard key={o.id} o={o} index={i} />)}
        </div>
      </section>
    </div>
  )
}
