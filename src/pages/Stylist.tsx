import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import OutfitCard from '@/components/OutfitCard'
import { stylist } from '@/lib/ai/provider'
import { useChat } from '@/store'
import './stylist.css'

const STARTERS = [
  'A first day at a new office, and I want to look considered',
  'Dinner somewhere dark and good, early autumn',
  'Ten hours on a plane, arriving straight into a meeting',
  'A spring wedding — guest, not wedding party',
  'Weekend errands, but I might run into someone',
  'Something formal in black, under $800',
]

const uid = () => Math.random().toString(36).slice(2, 10)

export default function Stylist() {
  const [params, setParams] = useSearchParams()
  const { messages, busy, push, update, setBusy, reset } = useChat()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const send = useCallback(async (text: string) => {
    const query = text.trim()
    if (!query || busy) return

    setInput('')
    setBusy(true)
    push({ id: uid(), role: 'user', content: query })

    const replyId = uid()
    push({ id: replyId, role: 'assistant', content: '', pending: true })

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      const history = useChat.getState().messages
        .filter((m) => !m.pending)
        .map((m) => ({ role: m.role, content: m.content }))

      const res = await stylist.style({ query, history, count: 4, signal: ctrl.signal })
      update(replyId, { content: res.reply, outfits: res.outfits, pending: false })
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      update(replyId, {
        content: 'Something went wrong reaching the stylist. Try that again in a moment.',
        pending: false,
      })
    } finally {
      setBusy(false)
    }
  }, [busy, push, update, setBusy])

  // Accept a query handed over from the home page.
  useEffect(() => {
    const q = params.get('q')
    if (q && !messages.length) {
      send(q)
      const next = new URLSearchParams(params)
      next.delete('q')
      setParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  useEffect(() => () => abortRef.current?.abort(), [])

  const empty = messages.length === 0

  return (
    <div className="stylist">
      <div className="wrap stylist-inner">
        <header className="stylist-head">
          <div>
            <p className="eyebrow">The stylist</p>
            <h1 className="stylist-title">Describe the day. Get the look.</h1>
          </div>
          {!empty && (
            <button className="link-btn" onClick={() => { abortRef.current?.abort(); reset() }}>
              New conversation
            </button>
          )}
        </header>

        <div className="thread scroll-thin" ref={scrollRef}>
          {empty ? (
            <div className="starter">
              <div className="starter-mark" aria-hidden>
                <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
                  <path d="M12 2.6l1.9 5.6 5.6 1.9-5.6 1.9L12 17.6l-1.9-5.6L4.5 10.1l5.6-1.9L12 2.6Z" />
                </svg>
              </div>
              <h2>What are you dressing for?</h2>
              <p className="lede">
                Write it plainly — the occasion, the weather, how dressed up you want
                to be. Everything else is inferred.
              </p>
              <div className="starter-grid">
                {STARTERS.map((s) => (
                  <button key={s} className="starter-chip" onClick={() => send(s)}>{s}</button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) =>
              m.role === 'user' ? (
                <div key={m.id} className="turn user">
                  <p>{m.content}</p>
                </div>
              ) : (
                <div key={m.id} className="turn bot">
                  {m.pending ? (
                    <div className="thinking" role="status">
                      <span /><span /><span />
                      <em>Reading the brief…</em>
                    </div>
                  ) : (
                    <>
                      <p className="bot-reply">{m.content}</p>
                      {!!m.outfits?.length && (
                        <div className="looks">
                          {m.outfits.map((o, i) => <OutfitCard key={o.id} o={o} index={i} />)}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ),
            )
          )}
        </div>

        <form className="composer" onSubmit={(e) => { e.preventDefault(); send(input) }}>
          <input
            className="field"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={empty ? 'Where are you going?' : 'Ask for another look, or change something…'}
            aria-label="Message the stylist"
            disabled={busy}
          />
          <button className="btn" type="submit" disabled={busy || !input.trim()}>
            {busy ? 'Styling…' : 'Send'}
          </button>
        </form>
        <p className="composer-note muted">
          Styled from {stylist.name === 'local-engine' ? 'the on-device engine' : 'the live stylist service'} ·
          {' '}All pieces shown are in the catalogue
        </p>
      </div>
    </div>
  )
}
