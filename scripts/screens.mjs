#!/usr/bin/env node
/**
 * Responsive check: every page at every width in the test matrix.
 *
 *   npm run build && npm run screens            # all widths
 *   npm run screens -- --widths=390,1280        # a subset
 *   npm run screens -- --text=150               # shopper's default font at 150%
 *
 * Starts `vite preview`, seeds a realistic shopper once (profile with
 * measurements, a bag, a placed order), then for each page × width:
 *   - saves a full-page screenshot to screenshots/<width>/<page>.png
 *   - fails if the page scrolls sideways (content wider than the screen)
 *   - fails if the home page's request box is below the fold
 *   - warns about tap targets under 44px on touch screens
 *
 * Uses the system Chrome through playwright-core, so no browser download.
 */
import { spawn } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { chromium } from 'playwright-core'

const PORT = 4399
const BASE = `http://localhost:${PORT}`
const OUT = 'screenshots'

/** width × height, and whether it is a touch device. */
const MATRIX = [
  { w: 360, h: 780, touch: true },
  { w: 390, h: 844, touch: true },
  { w: 430, h: 932, touch: true },
  { w: 667, h: 375, touch: true },   // small phone, landscape
  { w: 768, h: 1024, touch: true },  // tablet portrait
  { w: 1024, h: 768, touch: true },  // tablet landscape
  { w: 640, h: 450, touch: false },  // a 1280px laptop at 200% zoom
  { w: 1280, h: 800, touch: false },
  { w: 1440, h: 900, touch: false },
  { w: 1920, h: 1080, touch: false },
  { w: 2560, h: 1440, touch: false },
]

const PAGES = [
  ['home', '/'],
  ['shop', '/shop'],
  ['product', '/product/maison-verre-silk-charmeuse-blouse'],
  ['stylist', '/stylist?q=dinner%20somewhere%20nice'],
  ['lookbook', '/lookbook'],
  ['saved', '/lookbook?tab=saved'],
  ['shuffle', '/shuffle'],
  ['profile', '/profile'],
  ['cart', '/cart'],
  ['checkout', '/checkout'],
  ['order', '/orders/:order'],
  ['signin', '/signin'],
  ['admin', '/admin'],
  ['admin-products', '/admin/products'],
  ['admin-orders', '/admin/orders'],
]

const only = process.argv.find((a) => a.startsWith('--widths='))?.split('=')[1].split(',').map(Number)
const matrix = only ? MATRIX.filter((m) => only.includes(m.w)) : MATRIX
// A larger default font, as a shopper would set in browser settings. Type
// is in rem, so everything should grow with it — and still fit.
const textScale = Number(process.argv.find((a) => a.startsWith('--text='))?.split('=')[1] ?? 100)

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
const stop = () => server.kill()
process.on('exit', stop)

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(BASE)).ok) return } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`vite preview did not start on ${BASE} — run "npm run build" first`)
}

/** One shopper, set up through the real UI, reused for every width. */
async function seed(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  await page.goto(BASE)
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem('aistylo-profile:guest', JSON.stringify({
      state: { profile: { units: 'metric', chest: 96, waist: 76, shoeSize: 39, fit: 'true' }, skipped: [] },
      version: 0,
    }))
  })
  // Place one order through checkout, then fill the bag again for the cart pages.
  await page.goto(`${BASE}/product/maison-verre-silk-charmeuse-blouse`)
  await page.click('.pdp-actions .btn.block')
  await page.goto(`${BASE}/checkout`)
  for (const [name, value] of Object.entries({
    email: 'shopper@example.com', name: 'Sam Shopper', line1: '1 Test Street', city: 'London', postcode: 'N1 1AA',
  })) await page.fill(`[name="${name}"]`, value)
  await page.click('.co-place')
  await page.waitForURL(/\/orders\//)
  const orderId = new URL(page.url()).pathname.split('/').pop()
  await page.goto(`${BASE}/product/atelier-nord-ankle-boot`)
  await page.click('.pdp-actions .btn.block')
  await page.goto(`${BASE}/product/atelier-nord-wide-leg-wool-trouser`)
  await page.click('.pdp-actions .btn.block')
  await page.goto(`${BASE}/product/maison-verre-bias-cut-slip-dress`)
  await page.click('.pdp-actions .btn.block')
  await page.evaluate(() => {
    // Saved items and a saved look, so the Saved tab has content.
    const shop = JSON.parse(localStorage.getItem('aistylo-shop:guest'))
    shop.state.saved = ['atelier-nord-ankle-boot', 'maison-verre-silk-charmeuse-blouse']
    localStorage.setItem('aistylo-shop:guest', JSON.stringify(shop))
  })
  const state = await ctx.storageState()
  await ctx.close()
  return { state, orderId }
}

/** Checks run inside the page. */
function inspect(touch) {
  const overflow = document.documentElement.scrollWidth - window.innerWidth
  const ask = document.querySelector('.hero-ask')
  const askBottom = ask ? ask.getBoundingClientRect().bottom : null
  const small = []
  if (touch) {
    const targets = document.querySelectorAll('a[href], button, select, input:not([type=hidden]), [role=tab]')
    for (const el of targets) {
      // Radios and checkboxes are tapped through their label: measure that.
      const box = el.tagName === 'INPUT' && el.closest('label') ? el.closest('label') : el
      const r = box.getBoundingClientRect()
      if (!r.width || !r.height || r.bottom < 0 || getComputedStyle(el).visibility === 'hidden') continue
      // An invisible ::before hit area counts toward the target size.
      const before = getComputedStyle(el, '::before')
      const hit = before.content !== 'none' && before.position === 'absolute'
        ? Math.max(parseFloat(before.width) || 0, r.width) : r.width
      const hitH = before.content !== 'none' && before.position === 'absolute'
        ? Math.max(parseFloat(before.height) || 0, r.height) : r.height
      // Text links inside running text are exempt (WCAG 2.5.8 inline exception).
      if (el.tagName === 'A' && getComputedStyle(el).display === 'inline') continue
      if (hit < 44 && hitH < 44) {
        small.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.') || '(no class)'} ${Math.round(r.width)}×${Math.round(r.height)}`)
      }
    }
  }
  return { overflow, askBottom, innerHeight: window.innerHeight, small: [...new Set(small)].slice(0, 8) }
}

let failures = 0
const warnings = []

try {
  await waitForServer()
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const { state, orderId } = await seed(browser)
  rmSync(OUT, { recursive: true, force: true })

  for (const m of matrix) {
    const ctx = await browser.newContext({
      viewport: { width: m.w, height: m.h }, hasTouch: m.touch, isMobile: m.touch && m.w < 800,
      storageState: state, reducedMotion: 'reduce',
    })
    if (textScale !== 100) {
      await ctx.addInitScript((pct) => {
        document.addEventListener('DOMContentLoaded', () => {
          const s = document.createElement('style')
          s.textContent = `html { font-size: ${pct}%; }`
          document.head.appendChild(s)
        })
      }, textScale)
    }
    const dir = `${OUT}/${m.w}x${m.h}${textScale !== 100 ? `-text${textScale}` : ''}`
    mkdirSync(dir, { recursive: true })

    for (const [name, path] of PAGES) {
      const page = await ctx.newPage()
      await page.goto(BASE + path.replace(':order', orderId))
      if (name === 'stylist') await page.waitForSelector('.looks', { timeout: 5000 }).catch(() => {})
      await page.waitForTimeout(400)
      const r = await page.evaluate(inspect, m.touch)
      await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true })

      const where = `${String(m.w).padStart(4)}×${m.h}${textScale !== 100 ? ` @${textScale}%` : ''} ${name}`
      if (r.overflow > 1) { failures++; console.log(`FAIL ${where}: scrolls sideways by ${r.overflow}px`) }
      // The fold is a design goal at the default text size; a shopper who
      // enlarged their text expects the page to grow, so only overflow counts.
      if (name === 'home' && textScale === 100 && r.askBottom !== null && r.askBottom > r.innerHeight && m.h >= 700) {
        failures++; console.log(`FAIL ${where}: request box below the fold (${Math.round(r.askBottom)} > ${r.innerHeight})`)
      }
      if (r.small.length) warnings.push(`${where}: ${r.small.join(', ')}`)
      await page.close()
    }
    await ctx.close()
    console.log(`done ${m.w}×${m.h}`)
  }
  await browser.close()
} finally {
  stop()
}

if (warnings.length) {
  console.log(`\nTap targets under 44px (touch screens):`)
  for (const w of warnings) console.log(`  ${w}`)
}
console.log(failures ? `\n${failures} layout failure(s). Screenshots in ${OUT}/` : `\nNo layout failures. Screenshots in ${OUT}/`)
process.exit(failures ? 1 : 0)
