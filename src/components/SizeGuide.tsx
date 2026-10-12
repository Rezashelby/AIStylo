import { useEffect, useRef } from 'react'
import { footLengthCm, sizeChart, sizeOptions } from '@/lib/sizing'
import type { Slot, Units } from '@/types'
import './size-guide.css'

interface Props {
  slot: Slot
  units: Units
  /** Highlighted row: the shopper's suggested size, when known. */
  suggested?: string
  onClose: () => void
}

const inches = (cm: number) => Math.round(cm / 2.54)

/**
 * Measurement table for one slot, in the shopper's own units.
 *
 * Opened as a dialog over the product page. The page ties it to the URL
 * hash, so the browser Back button closes it — testers reach for Back far
 * more often than for a Close button.
 */
export default function SizeGuide({ slot, units, suggested, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const metric = units === 'metric'
  const chart = sizeChart(slot)

  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
  }, [])

  const range = (from: number, to: number) =>
    metric ? `${from}–${to - 1} cm` : `${inches(from)}–${inches(to) - 1} in`

  return (
    <dialog
      ref={ref}
      className="sg"
      aria-labelledby="sg-title"
      onCancel={(e) => { e.preventDefault(); onClose() }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="sg-inner">
        <header className="sg-head">
          <h2 id="sg-title">Size guide</h2>
          <button className="sg-close" onClick={onClose} aria-label="Close size guide">×</button>
        </header>

        {chart ? (
          <>
            <p className="sg-lede">
              Find your {chart.measure} measurement below. Between two sizes? Take
              the larger for a relaxed fit, the smaller for a close one.
            </p>
            <table className="sg-table">
              <thead><tr><th>Size</th><th>{chart.measure === 'chest' ? 'Chest' : 'Waist'}</th></tr></thead>
              <tbody>
                {chart.rows.map((r) => (
                  <tr key={r.size} className={r.size === suggested ? 'mine' : ''}>
                    <td>{r.size}{r.size === suggested && <span className="sg-you">Your size</span>}</td>
                    <td>{range(r.from, r.to)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="sg-how">
              <h3>How to measure</h3>
              {chart.measure === 'chest'
                ? <p><strong>Chest:</strong> around the fullest part, under the arms, tape level and snug but not tight.</p>
                : <p><strong>Waist:</strong> around your natural waist, the narrowest point above the navel, with the tape relaxed.</p>}
              <p><strong>Tip:</strong> measure over the underwear you'd wear with the piece, not over clothes.</p>
            </div>
          </>
        ) : (
          <>
            <p className="sg-lede">Measure your foot heel to longest toe, standing, at the end of the day.</p>
            <table className="sg-table">
              <thead><tr><th>Size</th><th>Foot length</th></tr></thead>
              <tbody>
                {sizeOptions('shoes', 'metric')!.map((label) => {
                  const eu = Number(label.split(' ')[1])
                  const cm = footLengthCm(eu)
                  return (
                    <tr key={label} className={label === suggested ? 'mine' : ''}>
                      <td>{label}{label === suggested && <span className="sg-you">Your size</span>}</td>
                      <td>{metric ? `${cm} cm` : `${(cm / 2.54).toFixed(1)} in`}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </>
        )}

        <p className="sg-fine">Approximate — cut varies by brand. Free returns within 30 days if it's not right.</p>
      </div>
    </dialog>
  )
}
