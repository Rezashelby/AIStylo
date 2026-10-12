import { useState } from 'react'
import type { ProfileQuestion, StyleProfile } from '@/types'
import { useProfile } from '@/store'
import './profile-questions.css'

/**
 * The stylist asking for what it does not know.
 *
 * Appears inline in the conversation, never as a gate: every question is
 * skippable, and each states plainly why the answer helps.
 */
export default function ProfileQuestions({
  questions,
  onAnswered,
}: {
  questions: ProfileQuestion[]
  onAnswered?: (field: keyof StyleProfile) => void
}) {
  const setProfile = useProfile((s) => s.set)
  const skip = useProfile((s) => s.skip)
  const skipped = useProfile((s) => s.skipped)
  const profile = useProfile((s) => s.profile)

  const pending = questions.filter(
    (q) => !skipped.includes(q.id) && profile[q.field] === undefined,
  )
  if (!pending.length) return null

  return (
    <div className="pq">
      <div className="pq-head">
        <Sparkle />
        <p>A couple of things would let me do this properly.</p>
      </div>
      {pending.map((q) => (
        <QuestionRow
          key={q.id}
          q={q}
          onAnswer={(value) => {
            setProfile({ [q.field]: value } as Partial<StyleProfile>)
            onAnswered?.(q.field)
          }}
          onSkip={() => skip(q.id)}
        />
      ))}
    </div>
  )
}

function QuestionRow({
  q, onAnswer, onSkip,
}: {
  q: ProfileQuestion
  onAnswer: (v: string | number) => void
  onSkip: () => void
}) {
  const [draft, setDraft] = useState('')
  const [showWhy, setShowWhy] = useState(false)

  const submitNumber = (e: React.FormEvent) => {
    e.preventDefault()
    const n = Number(draft)
    if (!Number.isFinite(n)) return
    if (q.min && n < q.min) return
    if (q.max && n > q.max) return
    onAnswer(n)
  }

  return (
    <div className="pq-row">
      <div className="pq-q">
        <p className="pq-question">{q.question}</p>
        <button
          className="pq-why"
          onClick={() => setShowWhy((v) => !v)}
          aria-expanded={showWhy}
        >
          {showWhy ? 'Hide' : 'Why?'}
        </button>
      </div>

      {showWhy && <p className="pq-because">{q.because}</p>}

      {q.kind === 'choice' && q.options ? (
        <div className="pq-options">
          {q.options.map((o) => (
            <button key={o.value} className="pq-option" onClick={() => onAnswer(o.value)}>
              <strong>{o.label}</strong>
              {o.hint && <span>{o.hint}</span>}
            </button>
          ))}
        </div>
      ) : (
        <form className="pq-number" onSubmit={submitNumber}>
          <div className="pq-input">
            <input
              type="number"
              inputMode="decimal"
              className="field"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={q.min && q.max ? `${q.min}–${q.max}` : ''}
              min={q.min}
              max={q.max}
              aria-label={q.question}
            />
            {q.unit && <span className="pq-unit">{q.unit}</span>}
          </div>
          <button className="btn small" type="submit" disabled={!draft.trim()}>Save</button>
        </form>
      )}

      <button className="pq-skip" onClick={onSkip}>Skip this</button>
    </div>
  )
}

function Sparkle() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.6l1.9 5.6 5.6 1.9-5.6 1.9L12 17.6l-1.9-5.6L4.5 10.1l5.6-1.9L12 2.6Z" />
    </svg>
  )
}
