import { useMemo } from 'react'
import { topQueries } from '../data'
import { catalog } from '@/data/catalog'
import type { Occasion, Slot } from '@/types'

/**
 * Stylist analytics.
 *
 * The useful signal for an AI-led shop is not "what sold" but "what shoppers
 * asked for that the catalogue could not answer". Low average match with high
 * volume is a buying instruction.
 */

const OCCASIONS: Occasion[] = ['work', 'evening', 'weekend', 'travel', 'formal', 'active']
const SLOTS: Slot[] = ['top', 'bottom', 'dress', 'outerwear', 'shoes', 'bag', 'accessory']

export default function Insights() {
  const gaps = topQueries.filter((q) => q.avgMatch < 60).sort((a, b) => b.count - a.count)

  const coverage = useMemo(
    () => OCCASIONS.map((o) => ({ occasion: o, count: catalog.filter((p) => p.occasions.includes(o)).length })),
    [],
  )
  const slotCoverage = useMemo(
    () => SLOTS.map((s) => ({ slot: s, count: catalog.filter((p) => p.slot === s).length })),
    [],
  )
  const maxOcc = Math.max(...coverage.map((c) => c.count))
  const maxSlot = Math.max(...slotCoverage.map((c) => c.count))

  const totalQueries = topQueries.reduce((a, q) => a + q.count, 0)
  const weighted = topQueries.reduce((a, q) => a + q.avgMatch * q.count, 0) / totalQueries

  return (
    <>
      <header className="apage-head">
        <div>
          <h1 className="apage-title">Stylist insights</h1>
          <p className="apage-sub">What shoppers asked for, and how well the catalogue answered</p>
        </div>
        <button className="abtn ghost">Export report</button>
      </header>

      <div className="stat-row">
        <div className="stat">
          <p className="stat-label">Styling requests</p>
          <p className="stat-value">{totalQueries.toLocaleString()}</p>
          <span className="stat-delta up">▲ 18.3% vs. prior 30d</span>
        </div>
        <div className="stat">
          <p className="stat-label">Avg. match quality</p>
          <p className="stat-value">{weighted.toFixed(0)}%</p>
          <span className="stat-delta down">▼ 2.4% vs. prior 30d</span>
        </div>
        <div className="stat">
          <p className="stat-label">Look → cart</p>
          <p className="stat-value">38.2%</p>
          <span className="stat-delta up">▲ 11.5% vs. prior 30d</span>
        </div>
        <div className="stat">
          <p className="stat-label">Unanswered requests</p>
          <p className="stat-value">{gaps.reduce((a, g) => a + g.count, 0)}</p>
          <span className="stat-delta down">▼ needs buying</span>
        </div>
      </div>

      {!!gaps.length && (
        <div className="gap-note">
          <span aria-hidden>⚑</span>
          <div>
            <strong>Catalogue gaps detected</strong>
            {gaps.length} recurring request{gaps.length > 1 ? 's' : ''} returned weak matches
            ({gaps.reduce((a, g) => a + g.count, 0)} shoppers affected). These are demand you
            are not currently stocking for.
          </div>
        </div>
      )}

      <div className="two-col">
        <section className="apanel">
          <div className="apanel-head">
            <h2 className="apanel-title">Requests by volume</h2>
            <span className="apage-sub">Last 30 days</span>
          </div>
          <div className="atable-wrap">
            <table className="atable">
              <thead>
                <tr>
                  <th>Request</th><th className="num">Volume</th>
                  <th>Match quality</th><th className="num">Click-through</th>
                </tr>
              </thead>
              <tbody>
                {topQueries.map((q) => (
                  <tr key={q.query}>
                    <td data-label="">
                      {q.query}
                      {q.avgMatch < 60 && <span className="pill refunded" style={{ marginLeft: 8 }}>gap</span>}
                    </td>
                    <td className="num" data-label="Volume">{q.count}</td>
                    <td data-label="Match quality">
                      <div className="stock-cell">
                        <div className={`meter ${q.avgMatch >= 80 ? 'good' : q.avgMatch >= 60 ? 'warn' : 'bad'}`}>
                          <i style={{ width: `${q.avgMatch}%` }} />
                        </div>
                        <span>{q.avgMatch}%</span>
                      </div>
                    </td>
                    <td className="num" data-label="Click-through">{(q.ctr * 100).toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="stack" style={{ gap: 16 }}>
          <section className="apanel">
            <div className="apanel-head"><h2 className="apanel-title">Coverage by occasion</h2></div>
            <ul className="barlist">
              {coverage.map((c) => (
                <li key={c.occasion}>
                  <span className="barlist-label">{c.occasion}</span>
                  <div className={`meter ${c.count < 6 ? 'bad' : c.count < 12 ? 'warn' : 'good'}`}>
                    <i style={{ width: `${(c.count / maxOcc) * 100}%` }} />
                  </div>
                  <b>{c.count}</b>
                </li>
              ))}
            </ul>
          </section>

          <section className="apanel">
            <div className="apanel-head"><h2 className="apanel-title">Coverage by category</h2></div>
            <ul className="barlist">
              {slotCoverage.map((c) => (
                <li key={c.slot}>
                  <span className="barlist-label">{c.slot}</span>
                  <div className={`meter ${c.count < 4 ? 'warn' : 'good'}`}>
                    <i style={{ width: `${(c.count / maxSlot) * 100}%` }} />
                  </div>
                  <b>{c.count}</b>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  )
}
