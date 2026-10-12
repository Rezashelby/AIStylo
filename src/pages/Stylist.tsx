import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatMessage, Weather } from '@/types'
import { Link, useSearchParams } from 'react-router-dom'
import OutfitCard from '@/components/OutfitCard'
import ProfileQuestions from '@/components/ProfileQuestions'
import { stylist } from '@/lib/ai/provider'
import { confidenceNote, nextQuestions } from '@/lib/profileGaps'
import { completeness } from '@/lib/sizing'
import { localWeather } from '@/lib/weather'
import { useChat, useProfile } from '@/store'
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
  const profile = useProfile((s) => s.profile)
  const skipped = useProfile((s) => s.skipped)
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  // Opt-in per visit; never stored.
  const [weather, setWeather] = useState<Weather | null>(null)
  const [weatherState, setWeatherState] = useState<'idle' | 'loading' | string>('idle')
  const weatherRef = useRef<Weather | null>(null)
  weatherRef.current = weather

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

      const res = await stylist.style({
        query, history, count: 4, signal: ctrl.signal,
        profile: useProfile.getState().profile,
        weather: weatherRef.current ?? undefined,
      })
      update(replyId, {
        content: res.reply,
        outfits: res.outfits,
        pending: false,
        intent: res.intent,
      })
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

  /**
   * Restyle the last request now that the profile has changed. `lead` says
   * what changed, and is shown ahead of the new reply.
   */
  const restyle = useCallback(async (botMessage: ChatMessage, lead?: string) => {
    const msgs = useChat.getState().messages
    const idx = msgs.findIndex((m) => m.id === botMessage.id)
    const prompt = [...msgs.slice(0, idx)].reverse().find((m) => m.role === 'user')
    if (!prompt || useChat.getState().busy) return

    setBusy(true)
    update(botMessage.id, { pending: true })
    try {
      const res = await stylist.style({
        query: prompt.content,
        count: 4,
        profile: useProfile.getState().profile,
        weather: weatherRef.current ?? undefined,
      })
      update(botMessage.id, {
        content: lead ? `${lead} ${res.reply}` : res.reply,
        outfits: res.outfits, intent: res.intent, pending: false,
      })
    } catch {
      update(botMessage.id, { pending: false })
    } finally {
      setBusy(false)
    }
  }, [setBusy, update])

  const toggleWeather = async () => {
    let next: Weather | null = null
    if (!weather) {
      setWeatherState('loading')
      try {
        next = await localWeather()
        setWeatherState('idle')
      } catch (err) {
        setWeatherState((err as Error).message || 'Could not read the weather.')
        return
      }
    } else {
      setWeatherState('idle')
    }
    weatherRef.current = next
    setWeather(next)
    // Show the effect on the looks already on screen, as profile answers do.
    const last = [...useChat.getState().messages].reverse()
      .find((m) => m.role === 'assistant' && !m.pending && m.outfits?.length)
    if (last) restyle(last)
  }

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
  const lastBotId = [...messages].reverse().find((m) => m.role === 'assistant' && !m.pending)?.id
  const note = confidenceNote(profile)
  const filled = completeness(profile)

  return (
    <div className="stylist">
      <div className="wrap stylist-inner">
        <header className="stylist-head">
          <div>
            <p className="eyebrow">The stylist</p>
            <h1 className="stylist-title">Describe the day. Get the look.</h1>
          </div>
          <div className="stylist-head-right">
            {filled > 0 && (
              <Link to="/profile" className="profile-chip" title={`Style profile ${filled}% complete`}>
                <span className="profile-ring" style={{ '--pct': `${filled}%` } as React.CSSProperties} />
                Style profile · {filled}%
              </Link>
            )}
            {!empty && (
              <button className="link-btn" onClick={() => { abortRef.current?.abort(); reset() }}>
                New conversation
              </button>
            )}
          </div>
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
                          {m.outfits.map((o, i) => (
                            <OutfitCard
                              key={o.id} o={o} index={i}
                              // Only the latest reply restyles; older turns are history.
                              onFeedback={m.id === lastBotId ? (note) => restyle(m, note) : undefined}
                            />
                          ))}
                        </div>
                      )}

                      {/* Ask only under the most recent reply, so earlier turns
                          do not accumulate stale question cards. */}
                      {m.id === lastBotId && !!m.outfits?.length && (() => {
                        const ask = nextQuestions(profile, m.intent).filter(
                          (q) => !skipped.includes(q.id),
                        )
                        return ask.length ? (
                          <ProfileQuestions questions={ask} onAnswered={() => restyle(m)} />
                        ) : null
                      })()}

                      {m.id === lastBotId && !!m.outfits?.length && note && (
                        <p className="bot-note">{note}</p>
                      )}
                    </>
                  )}
                </div>
              ),
            )
          )}
        </div>

        <div className="context-row">
          <button
            type="button"
            className={`weather-chip ${weather ? 'on' : ''}`}
            onClick={toggleWeather}
            disabled={weatherState === 'loading'}
            aria-pressed={Boolean(weather)}
            title={weather ? 'Stop using local weather' : 'Uses your location once to read current conditions'}
          >
            <Cloud />
            {weatherState === 'loading' ? 'Reading the sky…'
              : weather ? `Dressing for ${weather.tempC}° · ${weather.summary}`
              : 'Dress for my weather'}
            {weather && <span aria-hidden className="weather-x">×</span>}
          </button>
          {weatherState !== 'idle' && weatherState !== 'loading' && (
            <span className="weather-err" role="status">{weatherState}</span>
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

function Cloud() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M7 18h10.5a3.5 3.5 0 0 0 .4-7A5.5 5.5 0 0 0 7.3 9.6 4.2 4.2 0 0 0 7 18Z" strokeLinejoin="round" />
    </svg>
  )
}
