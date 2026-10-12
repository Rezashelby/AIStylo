# AIStylo — To do

Open work, in priority order. Architecture and backend choices live in
[ROADMAP.md](ROADMAP.md); this file is the checklist.

Effort: **S** under a day · **M** a few days · **L** a week or more.
**Backend** marks items that need the Phase 2 server.

## 1. Broken or half-finished

- [x] **Suggested size on the product page** — S
  The size picker always defaults to M. Preselect the profile's suggested
  size (`suggestSize` in `src/lib/sizing.ts`) and show its confidence, e.g.
  "M — from your chest measurement".
- [x] **Size guide next to the size buttons** — S
  Measurement table per slot, opened from a link beside the selector. The
  overlay must close on the browser Back button as well as its own Close.
- [x] **Saved items page** — S
  Hearted products are stored (`saved` in the shop store) but never shown.
  Add a "Pieces" tab alongside saved looks.
- [x] **Checkout flow** — M
  "Proceed to checkout" (`src/pages/Cart.tsx`) does nothing. Build
  address → delivery → review → confirmation, guest-first with sign-in
  optional. Real payment (Stripe) is a follow-up — **Backend**.
  *Done in demo mode (`src/lib/orders.ts`): records the order, takes no
  payment and says so. Set `VITE_ORDERS_API` for the real service.*
- [x] **Order history** — S after checkout
  "My orders" on the profile. The `orders` and `order_items` tables already
  exist in `docker/initdb/01-schema.sql`.

## 2. Design consistency

- [x] **One button style** — S
  The older buttons are square and all caps ("ADD LOOK TO BAG", "VIEW ALL");
  the newer ones are rounded, sentence case. Move everything to the newer one.
- [ ] **Real product photography** — L
  The drawn placeholders hold the whole brand back. Consistent shots on an
  off-white background; on-model images where possible.
- [ ] **Image gallery and zoom on product pages** — S once photos exist
- [ ] **Dark mode** (optional) — M
  Tokens are already in place. Offered, not yet decided.

## 3. Fully responsive

Mobile layouts exist and the worst bugs are fixed (lost side gutters, look
cards overflowing, filters filling the first screen). What is missing is a
system: the CSS uses 12 different ad-hoc breakpoints (520, 560, 760, 780,
820, 860, 900, 940, 1040, 1080…), so pages change layout at different
widths, and tablets and very large screens were never designed for.

### Foundation — S each
- [ ] **One breakpoint scale**, shared by every stylesheet:
  `480` small phone · `760` phone/tablet · `1040` tablet/laptop ·
  `1440` large. Replace the 12 ad-hoc values with these.
- [ ] **Fluid type and spacing** with `clamp()` everywhere, not just the hero,
  so sizes scale smoothly between breakpoints instead of jumping.
- [ ] **Container queries** for components that appear in different widths
  — outfit cards, product cards, the look rail — so a card lays itself out by
  the space it gets, not by the window size.
- [ ] **Touch targets at least 44×44px** on touch screens: the swap button
  on look items (26px), heart buttons (32–34px), size buttons, chips.
- [ ] **Safe areas** on every fixed or sticky bar (notch, home indicator):
  done for the tab bar, sticky buy bar and toast; check the rest.
- [ ] **`dvh` instead of `vh`** for full-height layouts (stylist, sign-in),
  so the mobile browser toolbar does not hide the composer or buttons.

### Page by page — S–M each
- [ ] **Home:** hero fits the first screen from 360px to 2560px; the
  example look stays readable at tablet width.
- [ ] **Shop:** 2 columns on phone, 3 on tablet, 4 on laptop, 5 on large
  screens; filters as a bottom sheet on phones instead of an inline panel.
- [ ] **Product:** image gallery swipeable on phones; sticky buy bar (done);
  "Finish the look" as a horizontal scroller on small screens.
- [ ] **Stylist:** composer pinned above the keyboard on phones; look items
  swipeable; profile questions compact on small screens.
- [ ] **Lookbook and Saved:** tabs scroll sideways on phones instead of
  wrapping onto two rows.
- [ ] **Cart and checkout:** single column on phones with the order summary
  collapsible at the top; numeric keyboards for postcode and card fields.
- [ ] **Profile:** measurement fields two per row on phones; option cards
  (fit) two per row instead of four squeezed.
- [ ] **Style Shuffle:** card fills the phone screen; swipe is the primary
  control, with buttons as backup.
- [ ] **Sign-in:** show a short version of the benefits panel on phones
  (it is hidden entirely today).
- [ ] **Admin:** tables become stacked cards on phones rather than only
  scrolling sideways; order drawer full-screen on phones.
- [ ] **Large screens (1440px+):** cap line lengths, widen grids rather than
  stretching content, larger product imagery.
- [ ] **Landscape phones and foldables:** tab bar and sticky bars must not
  eat half of a short screen.

### Images — S once real photos exist
- [ ] **Responsive images:** `srcset`/`sizes` (or the image CDN's resizing)
  so phones download phone-sized images; `loading="lazy"` below the fold
  and explicit dimensions to stop layout shift.

### Prove it — S
- [ ] **Test matrix:** 360, 390, 430 (phones), 768, 1024 (tablets, both
  orientations), 1280, 1440, 1920, 2560; Safari iOS, Chrome Android,
  Chrome, Firefox and Safari on desktop.
- [ ] **Automated screenshots** of every page at those widths on each change
  (Playwright), so layout regressions are caught before they ship.
- [ ] **Core Web Vitals on mobile:** LCP < 2.5s, CLS < 0.1, INP < 200ms on a
  mid-range phone over 4G.
- [ ] **Zoom and text size:** layouts survive 200% browser zoom and large
  system font sizes without clipping or horizontal scroll.

## 4. Standard store features

- [ ] **Reviews with a fit score** ("runs small / true / large") — M · **Backend**
  Aggregate the fit answers above the reviews and feed them into size
  suggestions.
- [ ] **Keyword search** — S
  Search box in the header for people who know what they want; hand
  sentence-length queries to the stylist.
- [ ] **Recently viewed** — S
- [ ] **Shareable look links** — S
  Encode a look's product ids in the URL; open them as a read-only card.
- [ ] **Per-page titles and meta tags** — S
  Every page currently has the same `<title>`; bad for search and link previews.
- [ ] **Back-in-stock and price-drop alerts** — M · **Backend**

## 5. "How it works" — the engine, shown live

A dedicated page (`/how-it-works`, linked from the home page's "How it works"
section and the footer) in the spirit of the AWS AI Stylist demo: the
conversation on one side, and on the other every step the platform takes to
answer — reading the profile, asking the model, searching the database,
checking the rules — as it happens.

**The rule: never fake it.** Every step shown comes from the engine actually
running. Where a stage does not exist yet (the language model and the SQL
search arrive with the backend), the page shows exactly what the server
will run and labels it *simulated in local mode*.

### Layout — M
- [ ] **Split view:** chat left, pipeline trace right. On phones the trace is
  a bottom drawer with a step counter ("Step 4 of 9") that opens on tap.
- [ ] **Two modes:**
  - *Guided demo* — plays a scripted scenario end to end ("A spring wedding,
    guest not party"), including the stylist asking back.
  - *Try it yourself* — the visitor's own request and their own profile.
- [ ] **Controls:** play / pause / step forward / restart, and a speed toggle,
  so a step can be read before the next one lands.
- [ ] **Architecture diagram** below the demo: browser → API → profile,
  model, database, rules → looks. Each box links to its step in the trace.

### Back-and-forth with the customer — M
- [ ] **Clarifying questions in the chat:** the stylist asks what would
  change its answer ("How dressed up is the wedding?", "Any colours to
  avoid?") as tappable choices; the trace shows *why* it asked (which field
  was missing and how much it would move the result).
- [ ] **The answer visibly changes the result:** re-run with the answer and
  highlight what moved (different piece, new size, score up).

### The pipeline steps shown — M
Each step: a plain-language headline, a timing in ms, and an expandable
"show details" with the real inputs and outputs.
- [ ] **1. Read your profile** — the fields actually used (fit, chest 96 cm,
  loved colours, Style Shuffle taste) and, as plainly, what is *not* used or
  sent (email, address, order history).
- [ ] **2. Check the weather** — only when the visitor opted in.
- [ ] **3. Understand the request** — the prompt sent to the model and the
  structured intent it returns (occasion, formality, season, budget) as JSON.
- [ ] **4. Turn it into a search** — the query embedding (shown as a short
  vector excerpt and its size).
- [ ] **5. Search the catalogue** — the SQL with the pgvector similarity
  search and the in-stock filter, the candidate rows it returned and the
  time it took.
- [ ] **6. Apply your preferences** — what was filtered out and why
  ("removed: 3 red pieces — you avoid red", "2 over your $300 ceiling").
- [ ] **7. Assemble the looks** — slot by slot, with the hard rules checked
  live: one per slot, formality within two steps, palette harmony; rejected
  combinations shown with the rule they broke.
- [ ] **8. Score and rank** — the score breakdown (relevance, palette,
  coherence) per look.
- [ ] **9. Explain each look** — the rationale prompt and the model's reply.
- [ ] **10. Return** — final looks with sizes, totals and a "how sure we
  are" note.

### Engine work behind it — M
- [ ] **Trace events from the engine:** `styleRequest` emits a typed event
  per stage (stage, inputs, outputs, timing, `simulated` flag). The page
  only renders events; nothing in the trace is hand-written.
- [ ] **Server trace stream** — **Backend**: the stylist API streams the same
  events over server-sent events when a `trace` flag is set, with personal
  data redacted to what the visitor themselves supplied.
- [ ] **Rate-limited and cached** like the rest of the engine, so the demo
  cannot become the most expensive page on the site.

### Trust and privacy — S
- [ ] **"What we looked at" panel** — a one-screen summary of exactly which
  personal data the answer used, with a link to edit or clear it.
- [ ] **Plain-language copy** throughout; technical detail lives behind
  "show details", so a customer and an engineer can both follow it.

## 6. Differentiators

- [ ] **My closet** — M
  Mark catalogue pieces you already own; the stylist mixes them into looks
  and only suggests buying the gaps. Photo upload later — **Backend**.
- [ ] **Plan the week** — M
  An outfit per day from the forecast and occasions you enter. Reuses the
  weather module and the engine.
- [ ] **Colour analysis** — M
  Quiz-based seasonal palette that sets loved/avoided colours. Selfie-based
  version later — **Backend**.
- [ ] **Visual search** (upload a photo, find similar) — L · **Backend**
- [ ] **Virtual try-on** — L · **Backend**, needs real photos
- [ ] **Human stylist hand-off** — L · **Backend**

## 7. Backend and infrastructure

- [ ] **Auth service** — M · **Backend**
  Implement `POST /code`, `/verify`, `/signout` and set `VITE_AUTH_API`
  (see `src/lib/auth/provider.ts`). Decide: own server on the existing
  Postgres container, or a hosted service such as Clerk or Supabase Auth.
- [ ] **Passkeys and Google/Apple sign-in** — M · **Backend**, after auth
- [ ] **Stylist API** — L · **Backend**
  Hosted model behind `VITE_STYLIST_API` (`src/lib/ai/provider.ts`).

## 8. Stylist engine and scale

The engine runs in each shopper's browser today (`src/lib/stylist.ts`). That
costs nothing per request, but ships the whole catalogue to every visitor,
has no real language model, and shares nothing between shoppers. The server
engine below replaces it behind `StylistProvider` without UI changes.

**What load looks like.** 10,000 daily shoppers × 5 stylist requests is
~50,000 requests a day: under 1 per second on average, ~15–20 per second at a
campaign peak, and possibly 100+ per second in a viral spike. Servers are not
the bottleneck at these numbers. The bottlenecks are the language model's
latency (seconds per call), its rate limits and its per-request cost, and
stock contention at checkout. Every item below targets one of those.

```
browser ──► CDN (SPA, images) 
   │
   └──► API (stateless containers, autoscaled, behind nginx rate limits)
          ├─ Redis: result cache, intent cache, rate limits, sessions
          ├─ engine: catalogue snapshot in memory, deterministic scoring
          ├─ LLM gateway: concurrency cap, queue, timeouts, fallback
          ├─ Postgres + pgvector (via connection pooler, read replica)
          └─ job queue: embeddings, emails, analytics
```

### Data layer — M · **Backend**

Decision (reconfirmed Oct 2026; reasoning in [ROADMAP.md](ROADMAP.md)):
**PostgreSQL + pgvector as the one system of record, Redis beside it for
speed.** No separate vector database and no MongoDB.

- Orders, payments and stock need ACID transactions and row locks; Postgres
  is the conventional fit, and catalogue attributes that vary go in `jsonb`.
- The stylist's key query is "nearest products *that are live and in stock*".
  With vectors in the same database that is one query; with a separate vector
  store it is two round trips and a join in code.
- pgvector is production grade below ~10M vectors. A large catalogue
  (100k SKUs × a few embeddings) is well under that.
- Redis holds what must be fast and may be lost: result and intent caches,
  rate limits, sessions. It is never the source of truth.

- [ ] **Host:** Supabase (recommended: Postgres plus auth, storage and
  row-level security, always-on so no cold starts during a spike). Neon is
  the alternative if auth is built in-house; its scale-to-zero means cold
  starts under spiky load.
- [ ] **Migrations** for `docker/initdb/01-schema.sql` (it only runs on an
  empty database today), plus per-account tables for profiles, saved items,
  saved looks and Shuffle ratings — currently in browser storage.
- [ ] **HNSW index** on product embeddings; **test filtered recall** with the
  real filters (occasion, slot, in stock) before launch — filtered vector
  search can silently return fewer matches.
- [ ] **Hybrid search** for the keyword box: Postgres full-text plus trigram
  (already in the schema) combined with vector similarity.
- [ ] **Revisit only if** the catalogue passes ~10M vectors or filtered recall
  fails at scale: evaluate Qdrant then. Not before.

### Build the engine service — L · **Backend**
- [ ] **Stylist API service.** Stateless TypeScript service so `lib/stylist.ts`,
  `intent.ts`, `taste.ts` and `sizing.ts` are reused, not rewritten.
  Implements the `RemoteStylistProvider` contract.
- [ ] **Remove the browser API key.** Delete `VITE_STYLIST_API_KEY`;
  authenticate requests by the shopper's session cookie instead.
- [ ] **Pipeline:** intent extraction (small, fast model) → embed → pgvector
  retrieval filtered on live + in stock → the existing hard-constraint
  assembly → rationale. Keep the template rationale as the default; the model
  only rewrites it when there is budget.
- [ ] **Catalogue snapshot in memory** per instance, refreshed on product change
  (Postgres `LISTEN/NOTIFY` or Redis pub/sub). Scoring a few thousand SKUs in
  memory takes milliseconds; querying them per request does not.
- [ ] **Stream the reply** (server-sent events): the text and the first look
  appear while the rest are still assembling.

### Handle volume — M each · **Backend**
- [ ] **Cache aggressively (Redis).**
  - Intent cache keyed on the normalised query: "work outfit" is asked
    thousands of times; extract it once.
  - Result cache keyed on intent + profile signature + catalogue version,
    with a short TTL. A catalogue change bumps the version, so nothing stale
    is served.
  - Prompt caching on the model's fixed system prompt and catalogue context.
- [ ] **LLM gateway.** One place that caps concurrent model calls, queues the
  rest with a deadline, retries with backoff, and trips a circuit breaker on
  provider errors.
- [ ] **Graceful degradation.** When the queue is full, the model is slow or
  the provider is down, answer from the deterministic engine immediately and
  say so quietly. A shopper never sees an error because of load.
- [ ] **Hybrid first paint.** Keep the in-browser engine for the instant first
  result; the server answer replaces it when it lands. Spikes then cost
  nothing for the first view.
- [ ] **Rate limits.** Per IP at nginx (already sketched in
  `docker/nginx.conf`), per account and per guest session in Redis (token
  bucket). Separate, stricter limits for sign-in code requests.
- [ ] **Autoscale API containers** on CPU and in-flight requests; minimum two
  instances so a deploy or crash never drops traffic.
- [ ] **Database under load.** Connection pooler (PgBouncer, or Supavisor on
  Supabase), HNSW index on embeddings, a read replica for catalogue and
  stylist reads, writes on the primary.
- [ ] **Background jobs** (pg-boss): re-embedding on product save, emails,
  analytics events. Nothing slow runs inside a request.
- [ ] **CDN for everything static.** The SPA and product images never touch the
  API servers.

### Checkout under load — M · **Backend**
- [ ] **No overselling.** Reserve stock inside the order transaction
  (`SELECT … FOR UPDATE` on the variant row, or an atomic
  `UPDATE … WHERE stock_qty >= n`), release reservations on timeout.
- [ ] **Idempotency keys** on order creation and payment, so a double-click or
  a retry never charges twice.
- [ ] **Queue for drops.** For a limited release, admit shoppers to checkout in
  batches instead of letting everyone hit stock at once.

### Know it works — M · **Backend**
- [ ] **Targets.** Cached stylist reply p95 < 300 ms; uncached p95 < 4 s, with
  the first look visible < 1.5 s; error rate < 0.1%; zero oversells.
- [ ] **Load tests** (k6) at 2×, 5× and 10× expected peak, including a
  "provider down" run that must fall back cleanly.
- [ ] **Monitoring.** Latency per pipeline step, cache hit rate, queue depth,
  model tokens and cost per request, oversell and payment failure alerts
  (Sentry plus a metrics dashboard).
- [ ] **Cost guardrail.** Daily model spend cap; when reached, the engine
  serves deterministic and cached results only.

## 9. Housekeeping

- [ ] **Commit the work so far.** Nothing from the recent sessions is
  committed.
- [ ] **Brand name.** Metis was ruled out; Aplomb is the leading candidate.
  Check trademarks (classes 25 and 35), the .com domain and social handles
  before renaming.
- [ ] **Tests.** The engine, taste, feedback and account-switching logic
  were checked with throwaway scripts only; turn them into a real test
  suite (Vitest).
