import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { auth, AuthError } from '@/lib/auth/provider'
import { useAuth } from '@/store'
import './signin.css'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * Passwordless sign-in: email first, then a six-digit code.
 *
 * One field per step, no password to forget, and a guest path as visible as
 * the sign-in itself — an account is offered for what it keeps, never
 * required to shop or to use the stylist.
 */
export default function SignIn() {
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const navigate = useNavigate()
  const user = useAuth((s) => s.user)
  const signIn = useAuth((s) => s.signIn)

  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [devCode, setDevCode] = useState<string>()
  const [resendIn, setResendIn] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const codeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (resendIn <= 0) return
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  useEffect(() => { if (step === 'code') codeRef.current?.focus() }, [step])

  // Already signed in: nothing to do here.
  if (user && !busy) return <Navigate to={next} replace />

  const sendCode = async () => {
    const value = email.trim().toLowerCase()
    if (!EMAIL.test(value)) { setError('Enter a full email address, like name@example.com.'); return }
    setBusy(true); setError(null)
    try {
      const r = await auth.requestCode(value)
      setEmail(value); setDevCode(r.devCode); setResendIn(r.resendIn); setCode(''); setStep('code')
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'We couldn’t send a code just now. Try again in a moment.')
    } finally {
      setBusy(false)
    }
  }

  const verify = async (value: string) => {
    if (value.length !== 6 || busy) return
    setBusy(true); setError(null)
    try {
      await signIn(await auth.verifyCode(email, value))
      navigate(next, { replace: true })
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Something went wrong. Try again.')
      setCode('')
      codeRef.current?.focus()
      setBusy(false)
    }
  }

  return (
    <div className="signin">
      <aside className="signin-side" aria-hidden>
        <div className="signin-side-inner">
          <p className="eyebrow">Your account</p>
          <h2>A stylist that <em>remembers</em> you.</h2>
          <ul>
            <li><Dot />Your sizes, fit and colours on every device</li>
            <li><Dot />Saved looks and pieces, kept in one place</li>
            <li><Dot />Your bag waits for you</li>
          </ul>
          <p className="signin-side-note">No password, ever. We email you a code.</p>
        </div>
      </aside>

      <main className="signin-main">
        <div className="signin-card">
          {step === 'email' ? (
            <form onSubmit={(e) => { e.preventDefault(); sendCode() }} noValidate>
              <h1>Sign in or create an account</h1>
              <p className="signin-lede">Enter your email. If you're new, we'll set you up.</p>
              {/* Phones hide the side panel; keep its point in one line. */}
              <p className="signin-perks">Keeps your sizes, saved looks and bag on every device. No password, ever.</p>

              <label className="signin-label" htmlFor="email">Email</label>
              <input
                id="email" className="signin-input" type="email" inputMode="email"
                autoComplete="email" autoFocus spellCheck={false}
                value={email} onChange={(e) => { setEmail(e.target.value); setError(null) }}
                placeholder="name@example.com"
                aria-invalid={Boolean(error)} aria-describedby={error ? 'signin-error' : undefined}
              />
              {error && <p id="signin-error" className="signin-error" role="alert">{error}</p>}

              <button className="signin-primary" type="submit" disabled={busy}>
                {busy ? 'Sending…' : 'Continue'}
              </button>
            </form>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); verify(code) }} noValidate>
              <button type="button" className="signin-back" onClick={() => { setStep('email'); setError(null) }}>
                ← Use a different email
              </button>
              <h1>Check your email</h1>
              <p className="signin-lede">
                We sent a six-digit code to <strong>{email}</strong>. It works for 10 minutes.
              </p>

              {devCode && (
                <p className="signin-dev" role="note">
                  <strong>Local mode</strong> — no email is sent yet. Your code is{' '}
                  <button type="button" onClick={() => { setCode(devCode); verify(devCode) }}>{devCode}</button>
                </p>
              )}

              <label className="signin-label" htmlFor="code">Code</label>
              <input
                id="code" ref={codeRef} className="signin-input signin-code"
                inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6}
                value={code}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 6)
                  setCode(v); setError(null)
                  // Autofill and paste deliver all six at once: go straight on.
                  if (v.length === 6) verify(v)
                }}
                placeholder="••••••"
                aria-invalid={Boolean(error)} aria-describedby={error ? 'signin-error' : undefined}
              />
              {error && <p id="signin-error" className="signin-error" role="alert">{error}</p>}

              <button className="signin-primary" type="submit" disabled={busy || code.length !== 6}>
                {busy ? 'Signing in…' : 'Sign in'}
              </button>

              <p className="signin-resend">
                {resendIn > 0
                  ? <>Didn't get it? You can send another in {resendIn}s.</>
                  : <>Didn't get it? <button type="button" onClick={sendCode} disabled={busy}>Send a new code</button></>}
              </p>
            </form>
          )}

          <div className="signin-or"><span>or</span></div>
          <Link to={next === '/signin' ? '/' : next} className="signin-guest">Continue as a guest</Link>
          <p className="signin-fine">
            Everything works without an account. Signing in keeps your profile,
            saved looks and bag together
            {auth.local ? ' — in local mode, on this device only.' : ' across your devices.'}
          </p>
        </div>
      </main>
    </div>
  )
}

/** Only same-site paths: never bounce a shopper to another origin after sign-in. */
function safeNext(raw: string | null): string {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/profile'
}

function Dot() {
  return <span className="signin-dot" />
}
