import { Link } from 'react-router-dom'
import { useAuth, useOrders, useProfile } from '@/store'
import { formatDate, ORDER_STATUS } from '@/lib/orders'
import { money } from '@/lib/pricing'
import { auth } from '@/lib/auth/provider'
import { completeness, suggestSize, hasSizing } from '@/lib/sizing'
import { styleRead } from '@/lib/taste'
import type { BodyShape, FitPreference, Slot, Units } from '@/types'
import './profile.css'

const FITS: { v: FitPreference; label: string; hint: string }[] = [
  { v: 'fitted',    label: 'Close to the body', hint: 'Tailored, defined' },
  { v: 'true',      label: 'True to size',      hint: 'As the designer cut it' },
  { v: 'relaxed',   label: 'Relaxed',           hint: 'Room to move' },
  { v: 'oversized', label: 'Oversized',         hint: 'Deliberately generous' },
]

const SHAPES: { v: BodyShape; label: string }[] = [
  { v: 'straight',          label: 'Fairly straight' },
  { v: 'hourglass',         label: 'Defined waist' },
  { v: 'pear',              label: 'Fuller through hips' },
  { v: 'apple',             label: 'Fuller through middle' },
  { v: 'inverted-triangle', label: 'Broader shoulders' },
  { v: 'unspecified',       label: 'Rather not say' },
]

const COLORS = ['black', 'white', 'navy', 'brown', 'neutral', 'green', 'red', 'grey']

const SLOTS: Slot[] = ['top', 'bottom', 'dress', 'outerwear', 'shoes', 'bag', 'accessory']

export default function Profile() {
  const { profile, set, reset } = useProfile()
  const user = useAuth((s) => s.user)
  const signOut = useAuth((s) => s.signOut)
  const orders = useOrders((s) => s.orders)
  const filled = completeness(profile)
  const metric = profile.units === 'metric'

  const num = (v: string) => (v === '' ? undefined : Number(v))
  const toggle = (list: string[] | undefined, v: string) =>
    list?.includes(v) ? list.filter((x) => x !== v) : [...(list ?? []), v]

  /** Convert stored values when the shopper switches unit system. */
  const switchUnits = (units: Units) => {
    if (units === profile.units) return
    const f = units === 'imperial' ? 1 / 2.54 : 2.54
    const w = units === 'imperial' ? 2.2046 : 1 / 2.2046
    const conv = (v: number | undefined, factor: number) =>
      v === undefined ? undefined : Math.round(v * factor)
    set({
      units,
      height: conv(profile.height, f),
      chest:  conv(profile.chest, f),
      waist:  conv(profile.waist, f),
      hips:   conv(profile.hips, f),
      inseam: conv(profile.inseam, f),
      weight: conv(profile.weight, w),
    })
  }

  const read = styleRead(profile)
  const rated = (profile.liked?.length ?? 0) + (profile.passed?.length ?? 0)
  const bias = profile.formalityBias ?? 0

  const preview = (['top', 'bottom'] as Slot[])
    .map((slot) => ({ slot, s: suggestSize(profile, slot) }))
    .filter((x) => x.s)

  return (
    <div className="wrap profile-page">
      <header className="profile-head">
        <div>
          <p className="eyebrow">Style profile</p>
          <h1 className="profile-title">What should the stylist know?</h1>
          <p className="lede">
            Everything here is optional and stays in your browser. The more you
            fill in, the less the stylist has to guess — but it works without
            any of it.
          </p>
        </div>
        <div className="profile-meter" role="img" aria-label={`Profile ${filled}% complete`}>
          <svg viewBox="0 0 44 44" width="60" height="60">
            <circle cx="22" cy="22" r="19" fill="none" stroke="var(--line)" strokeWidth="3" />
            <circle
              cx="22" cy="22" r="19" fill="none" stroke="var(--accent)" strokeWidth="3"
              strokeLinecap="round" strokeDasharray={`${(filled / 100) * 119.4} 119.4`}
              transform="rotate(-90 22 22)"
            />
          </svg>
          <span>{filled}%</span>
        </div>
      </header>

      {/* ── Account ───────────────────────────────────────────────────── */}
      {user ? (
        <div className="account-bar">
          <span className="account-avatar" aria-hidden>{user.email[0].toUpperCase()}</span>
          <div>
            <p className="account-email">{user.email}</p>
            <p className="account-note">
              {auth.local ? 'Saved to this account on this device.' : 'Saved to your account on every device.'}
            </p>
          </div>
          <button className="link-btn" onClick={() => { auth.signOut(); signOut() }}>Sign out</button>
        </div>
      ) : (
        <div className="account-bar guest">
          <div>
            <p className="account-email">You're browsing as a guest</p>
            <p className="account-note">Sign in to keep this profile, your saved looks and your bag.</p>
          </div>
          <Link to="/signin?next=/profile" className="btn small">Sign in</Link>
        </div>
      )}

      {/* ── Orders ────────────────────────────────────────────────────── */}
      <section className="profile-section" id="orders">
        <h2>Your orders</h2>
        {orders.length ? (
          <ul className="order-list">
            {orders.map((o) => (
              <li key={o.id}>
                <Link to={`/orders/${o.id}`} className="order-row">
                  <span className="order-row-thumbs" aria-hidden>
                    {o.lines.slice(0, 3).map((l) => <img key={`${l.product.id}-${l.size}`} src={l.product.image} alt="" />)}
                  </span>
                  <span className="order-row-text">
                    <strong>{o.id}</strong>
                    <span>{formatDate(o.placedAt)} · {o.lines.reduce((a, l) => a + l.qty, 0)} items · {ORDER_STATUS[o.status]}</span>
                  </span>
                  <span className="order-row-total">{money(o.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="section-note">No orders yet. When you place one, it'll appear here.</p>
        )}
      </section>

      {/* ── Units ─────────────────────────────────────────────────────── */}
      <section className="profile-section">
        <h2>Units</h2>
        <div className="seg">
          {(['metric', 'imperial'] as Units[]).map((u) => (
            <button
              key={u}
              className={`seg-btn ${profile.units === u ? 'active' : ''}`}
              onClick={() => switchUnits(u)}
            >
              {u === 'metric' ? 'Metric (cm / kg)' : 'Imperial (in / lbs)'}
            </button>
          ))}
        </div>
      </section>

      {/* ── Fit ───────────────────────────────────────────────────────── */}
      <section className="profile-section">
        <h2>How should things fit?</h2>
        <p className="section-note">The single biggest factor in whether a piece works.</p>
        <div className="opt-grid">
          {FITS.map((f) => (
            <button
              key={f.v}
              className={`opt ${profile.fit === f.v ? 'active' : ''}`}
              onClick={() => set({ fit: profile.fit === f.v ? undefined : f.v })}
              aria-pressed={profile.fit === f.v}
            >
              <strong>{f.label}</strong>
              <span>{f.hint}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Measurements ──────────────────────────────────────────────── */}
      <section className="profile-section">
        <h2>Measurements</h2>
        <p className="section-note">
          A chest or waist measurement sizes you far more accurately than height
          and weight. Give whichever you know.
        </p>
        <div className="field-grid">
          <NumField label="Height" unit={metric ? 'cm' : 'in'} value={profile.height}
            onChange={(v) => set({ height: num(v) })} />
          <NumField label="Weight" unit={metric ? 'kg' : 'lbs'} value={profile.weight}
            onChange={(v) => set({ weight: num(v) })} />
          <NumField label="Chest" unit={metric ? 'cm' : 'in'} value={profile.chest}
            onChange={(v) => set({ chest: num(v) })} />
          <NumField label="Waist" unit={metric ? 'cm' : 'in'} value={profile.waist}
            onChange={(v) => set({ waist: num(v) })} />
          <NumField label="Hips" unit={metric ? 'cm' : 'in'} value={profile.hips}
            onChange={(v) => set({ hips: num(v) })} />
          <NumField label="Shoe size" unit={metric ? 'EU' : 'US'} value={profile.shoeSize}
            onChange={(v) => set({ shoeSize: num(v) })} />
        </div>

        {hasSizing(profile) && !!preview.length && (
          <div className="size-preview">
            <p className="eyebrow">Your suggested sizes</p>
            <ul>
              {preview.map(({ slot, s }) => (
                <li key={slot}>
                  <span className="size-slot">{slot === 'top' ? 'Tops' : 'Bottoms'}</span>
                  <strong>{s!.size}</strong>
                  <span className={`size-conf ${s!.confidence}`}>{s!.confidence} confidence</span>
                  <span className="size-basis">{s!.basis}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* ── Shape ─────────────────────────────────────────────────────── */}
      <section className="profile-section">
        <h2>Proportions</h2>
        <p className="section-note">Guides where volume and structure are placed. Skip freely.</p>
        <div className="chip-row">
          {SHAPES.map((sh) => (
            <button
              key={sh.v}
              className={`chip ${profile.bodyShape === sh.v ? 'on' : ''}`}
              onClick={() => set({ bodyShape: profile.bodyShape === sh.v ? undefined : sh.v })}
              aria-pressed={profile.bodyShape === sh.v}
            >
              {sh.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Colour ────────────────────────────────────────────────────── */}
      <section className="profile-section">
        <h2>Colour</h2>
        <div className="two-up">
          <div>
            <p className="section-note">Colours you reach for</p>
            <div className="chip-row">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={`chip ${profile.lovedColors?.includes(c) ? 'on' : ''}`}
                  onClick={() => set({ lovedColors: toggle(profile.lovedColors, c) })}
                  aria-pressed={profile.lovedColors?.includes(c) ?? false}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="section-note">Colours to avoid</p>
            <div className="chip-row">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={`chip ${profile.avoidColors?.includes(c) ? 'off' : ''}`}
                  onClick={() => set({ avoidColors: toggle(profile.avoidColors, c) })}
                  aria-pressed={profile.avoidColors?.includes(c) ?? false}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Exclusions & budget ───────────────────────────────────────── */}
      <section className="profile-section">
        <h2>Never suggest</h2>
        <div className="chip-row">
          {SLOTS.map((s) => (
            <button
              key={s}
              className={`chip ${profile.avoidSlots?.includes(s) ? 'off' : ''}`}
              onClick={() => set({ avoidSlots: toggle(profile.avoidSlots, s) as Slot[] })}
              aria-pressed={profile.avoidSlots?.includes(s) ?? false}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="field-grid" style={{ marginTop: 22 }}>
          <NumField label="Comfortable ceiling per piece" unit="$" value={profile.budgetPerItem}
            onChange={(v) => set({ budgetPerItem: num(v) })} />
        </div>
      </section>

      {/* ── Taste ─────────────────────────────────────────────────────── */}
      <section className="profile-section">
        <h2>Taste</h2>
        <p className="section-note">
          Learned from Style Shuffle and from looks you marked "not for me".
        </p>
        {rated ? (
          <p className="taste-line">
            {profile.liked?.length ?? 0} loved, {profile.passed?.length ?? 0} passed
            {read.drawnTo.length > 0 && <> · drawn to {read.drawnTo.slice(0, 4).join(', ')}</>}
          </p>
        ) : (
          <p className="taste-line muted">Nothing rated yet.</p>
        )}
        {bias !== 0 && (
          <p className="taste-line">
            Looks are pitched {Math.abs(bias) === 2 ? 'two notches' : 'a notch'}
            {bias < 0 ? ' more relaxed' : ' more polished'} than the occasion suggests.{' '}
            <button className="link-btn" onClick={() => set({ formalityBias: undefined })}>Reset</button>
          </p>
        )}
        <div className="taste-actions">
          <Link to="/shuffle" className="btn ghost small">{rated ? 'Keep shuffling' : 'Play Style Shuffle'}</Link>
          {rated > 0 && (
            <button className="link-btn" onClick={() => set({ liked: undefined, passed: undefined })}>
              Clear ratings
            </button>
          )}
        </div>
      </section>

      {/* ── Notes ─────────────────────────────────────────────────────── */}
      <section className="profile-section">
        <h2>Anything else</h2>
        <textarea
          className="field profile-notes"
          rows={3}
          placeholder="Nothing above the knee. I run cold. I need pockets."
          value={profile.notes ?? ''}
          onChange={(e) => set({ notes: e.target.value || undefined })}
          aria-label="Additional notes for the stylist"
        />
      </section>

      <footer className="profile-foot">
        <Link to="/stylist" className="btn">Style me with this</Link>
        <button className="link-btn" onClick={reset}>Clear profile</button>
      </footer>
    </div>
  )
}

function NumField({
  label, unit, value, onChange,
}: {
  label: string
  unit: string
  value?: number
  onChange: (v: string) => void
}) {
  return (
    <label className="nfield">
      <span>{label}</span>
      <div className="nfield-input">
        <input
          type="number" inputMode="decimal" className="field"
          value={value ?? ''} onChange={(e) => onChange(e.target.value)}
        />
        <i>{unit}</i>
      </div>
    </label>
  )
}
