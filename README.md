# AIStylo

An editorial-luxury clothing shop with an AI personal stylist, in the spirit of
the AWS AI Stylist demo. Describe where you are going in plain language; get
back complete outfits, each explaining why it works.

React 18 · TypeScript · Vite · React Router · Zustand

## Running it

```bash
npm install
npm run dev            # http://localhost:5173
```

Or with Docker. The app image is self-contained — it builds the SPA and
serves it over Node, needing no other service:

```bash
docker build -t aistylo/app .
docker run -p 3000:3000 aistylo/app        # http://localhost:3000
```

Compose layers optional services on top:

```bash
docker compose up app               # the app alone, :3000
docker compose --profile edge up    # + nginx reverse proxy on :8080
docker compose --profile data up    # + Postgres/pgvector :5432, Redis :6379
docker compose --profile dev up     # hot-reloading Vite on :5173
```

`proxy` is a true reverse proxy — TLS termination, rate limiting, and `/api`
routing for the Phase 2 backend. It serves no files itself, and the app runs
fine without it.

The Postgres container applies `docker/initdb/01-schema.sql` on first start —
the full schema with pgvector, HNSW indexes and trigram search.

```bash
npm run build          # production bundle
npm run lint           # typecheck
```

## What's here

**Storefront**
- Home — editorial hero with the styling prompt as the primary action
- Shop — filter by category, occasion, brand, price; sort
- Stylist — conversational styling; returns assembled looks with reasoning
- Product — detail, plus a stylist-built "finish the look"
- Lookbook — curated edits, each run through the same engine
- Cart — quantities, shipping threshold, persisted to localStorage
- Profile — measurements, fit preference, colours, exclusions, budget, learned taste
- Style Shuffle — love or pass on pieces one at a time; ratings feed scoring
- Saved looks — heart any look; kept under Lookbook → Saved

**On every look**
- Swap a piece — replaces one garment with the next-best fit for the rest of
  the look; repeated swaps walk the whole slot
- Not for me — a reason (too dressed up, too casual, colours, price, style)
  becomes a concrete profile change, and the looks restyle at once
- Dress for my weather — opt-in, per visit. Reads current conditions from
  Open-Meteo via browser geolocation; cold or wet weather means every look
  carries a layer, heat removes them. Nothing is stored

**Admin** (`/admin`)
- Dashboard — revenue, orders, AOV, best sellers, low stock
- Products — searchable table, filters, bulk selection, stock meters
- Orders — status filters, detail drawer, fulfilment actions
- Stylist insights — what shoppers asked for, and which requests the catalogue
  answered badly. Low match quality at high volume is a buying signal.

## Accounts

Sign-in is passwordless: email first, then a six-digit code. Guests can do
everything; an account keeps the profile, saved looks and bag together.

- `src/lib/auth/provider.ts` is the seam, like the stylist provider. With no
  `VITE_AUTH_API` set it runs in **local mode**: accounts live in this
  browser only and the code is shown on screen, because nothing is emailed.
  This is for development — it is not security.
- Set `VITE_AUTH_API` to a service implementing `POST /code`, `/verify` and
  `/signout` (cookie session) for real accounts. Passkey and Google/Apple
  sign-in appear on the page once that service lists them in `methods`.
- Per-account data is stored under `<key>:<account id>`. Signing in from a
  guest session carries the guest's bag and profile into a new account, then
  clears the guest copy so the next person on the device starts clean.

## Checkout and orders

One-page checkout (contact and address, delivery, review), guest-first.
`src/lib/orders.ts` is the seam: with no `VITE_ORDERS_API` it runs in
**demo mode** — the order is recorded in the shopper's order history, no
payment is taken, and the page says so before they commit. A real service
prices the lines itself, reserves stock and hands off to Stripe Checkout;
requests carry an `Idempotency-Key` so a retry never places two orders.

Cart lines carry a size. Sized products without one take the profile's
suggestion (`suggestFor` in `src/lib/sizing.ts`), otherwise the bag asks
before checkout.

## Asking rather than assuming

The stylist works with an empty profile, then asks for what would actually
change its answer — never as a gate, always with a stated reason, and every
question skippable.

- `src/lib/profileGaps.ts` decides what to ask. Fit preference outranks
  everything (it is the single largest factor); a real chest or waist
  measurement outranks height and weight; nothing already known is asked
  again, and neither is anything skipped.
- `src/lib/sizing.ts` derives a size from whatever exists, and reports its
  confidence honestly: `high` from a direct measurement, `medium` from an
  estimate such as hips standing in for waist, `low` from height and weight
  via BMI. Low-confidence sizes are marked provisional in the UI rather than
  shown with false certainty.
- Answering re-runs the last request immediately, so the shopper sees the
  effect instead of being told about it.

The profile then feeds scoring: budget ceiling, loved and avoided colours, fit
preference, and hard exclusions. Exclusions filter the candidate pool rather
than ranking items down — a low score still wins when it is the only candidate
for a slot.

Everything stays in `localStorage`. No measurement leaves the browser unless
you wire up a backend.

## How the stylist works

Hybrid retrieval and structured scoring — the architecture the research
converges on, because embeddings alone cannot enforce hard constraints.

1. **Intent extraction** (`src/lib/intent.ts`) — pulls occasion, season,
   formality, colour and budget out of free text.
2. **Retrieval** (`relevance` in `src/lib/stylist.ts`) — scores every garment
   against that intent. In production this becomes a pgvector query.
3. **Assembly** (`buildOutfit`) — fills one slot at a time under hard
   constraints: no duplicate slots, formality within about one step, palette
   harmony computed in HSL, at most two statement colours per look.
4. **Rationale** — explains the result in the terms a stylist would use.

Steps 1 and 4 are what an LLM does better. Step 3 should stay rule-based
wherever it runs: relevance scoring will happily suggest two jackets.

## Swapping in a real AI backend

Everything above `StylistProvider` (`src/lib/ai/provider.ts`) is written
against that interface, so no component changes when the backend arrives.

```bash
VITE_STYLIST_API=https://your-api.example.com/style
VITE_STYLIST_API_KEY=...
```

Set those and `RemoteStylistProvider` takes over. Unset, the local engine runs
in the browser with no keys and no network. Your endpoint returns:

```jsonc
{
  "reply":  "Here are 4 looks for work…",
  "intent": { "occasion": "work", "formality": 4, "keywords": [] },
  // `profile` is sent in the request; echo sizes back per garment if you can
  "outfits": [ { "id": "look-1", "title": "…", "rationale": "…",
                 "items": [ /* Product */ ], "score": 88, "occasion": "work" } ]
}
```

See `ROADMAP.md` for the database choice, the service list, and the server-side
pipeline.

## Layout

```
src/
  components/   Nav, Footer, ProductCard, OutfitCard, ProfileQuestions
  pages/        Home, Shop, Stylist, Product, Cart, Lookbook, Profile
  admin/        Admin shell + Dashboard, Products, Orders, Insights
  lib/          intent.ts, stylist.ts, sizing.ts, profileGaps.ts, ai/provider.ts
  data/         catalog.ts, imagery.ts
  store/        Zustand: cart, saved items, chat
  types/        domain model
docker/         server.mjs (static server), nginx.conf, initdb/01-schema.sql
```

Product imagery is generated as inline SVG (`src/data/imagery.ts`) — the shop
renders identically offline, with no CDN or image licensing.
