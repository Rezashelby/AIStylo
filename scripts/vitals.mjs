#!/usr/bin/env node
/**
 * Core Web Vitals on a mid-range phone over 4G.
 *
 *   npm run build && npm run vitals
 *
 * Throttling matches Lighthouse's mobile profile: 4× slower CPU, 1.6 Mbps
 * down, 150 ms round trip. Each page loads cold, then one real tap is made
 * to measure responsiveness. Targets (Google's "good" thresholds):
 *   LCP < 2500 ms · CLS < 0.1 · INP < 200 ms
 */
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'

const PORT = 4398
const BASE = `http://localhost:${PORT}`
const RUNS = 3

/** Page, and a tap that exercises its main interaction. */
const PAGES = [
  ['home', '/', '.chip'],
  ['shop', '/shop', '.slot-tab:nth-child(2)'],
  ['product', '/product/maison-verre-silk-charmeuse-blouse', '.size:nth-child(2)'],
  ['stylist', '/stylist', '.starter-chip'],
  ['lookbook', '/lookbook', '.lb-tab:nth-child(2)'],
]

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
process.on('exit', () => server.kill())
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(BASE)).ok) break } catch { /* starting */ }
  await new Promise((r) => setTimeout(r, 250))
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
let failed = 0

console.log('page        LCP ms   CLS     INP ms   (median of 3, throttled mobile)')
for (const [name, path, tap] of PAGES) {
  const runs = []
  for (let i = 0; i < RUNS; i++) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const page = await ctx.newPage()
    const cdp = await ctx.newCDPSession(page)
    await cdp.send('Network.enable')
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8,
    })
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })

    // Observers installed before any page script runs.
    await page.addInitScript(() => {
      window.__v = { lcp: 0, cls: 0, inp: 0 }
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__v.lcp = e.startTime })
        .observe({ type: 'largest-contentful-paint', buffered: true })
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__v.cls += e.value })
        .observe({ type: 'layout-shift', buffered: true })
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__v.inp = Math.max(window.__v.inp, e.duration) })
        .observe({ type: 'event', buffered: true, durationThreshold: 16 })
    })

    await page.goto(BASE + path, { waitUntil: 'load' })
    await page.waitForTimeout(1500)
    await page.tap(tap).catch(() => page.click(tap))
    await page.waitForTimeout(800)
    runs.push(await page.evaluate(() => window.__v))
    await ctx.close()
  }
  const lcp = Math.round(median(runs.map((r) => r.lcp)))
  const cls = median(runs.map((r) => r.cls))
  const inp = Math.round(median(runs.map((r) => r.inp)))
  const ok = lcp < 2500 && cls < 0.1 && inp < 200
  if (!ok) failed++
  console.log(`${name.padEnd(10)}  ${String(lcp).padStart(6)}   ${cls.toFixed(3)}   ${String(inp).padStart(6)}   ${ok ? 'good' : 'NEEDS WORK'}`)
}

await browser.close()
process.exit(failed ? 1 : 0)
