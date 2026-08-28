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

Or with Docker:

```bash
docker compose up web              # http://localhost:8080
docker compose --profile dev up    # hot-reloading dev server on :5173
docker compose --profile data up   # + Postgres/pgvector on :5432, Redis on :6379
```

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

**Admin** (`/admin`)
- Dashboard — revenue, orders, AOV, best sellers, low stock
- Products — searchable table, filters, bulk selection, stock meters
- Orders — status filters, detail drawer, fulfilment actions
- Stylist insights — what shoppers asked for, and which requests the catalogue
  answered badly. Low match quality at high volume is a buying signal.

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
  "outfits": [ { "id": "look-1", "title": "…", "rationale": "…",
                 "items": [ /* Product */ ], "score": 88, "occasion": "work" } ]
}
```

See `ROADMAP.md` for the database choice, the service list, and the server-side
pipeline.

## Layout

```
src/
  components/   Nav, Footer, ProductCard, OutfitCard
  pages/        Home, Shop, Stylist, Product, Cart, Lookbook
  admin/        Admin shell + Dashboard, Products, Orders, Insights
  lib/          intent.ts, stylist.ts, ai/provider.ts
  data/         catalog.ts, imagery.ts
  store/        Zustand: cart, saved items, chat
  types/        domain model
docker/         nginx.conf, initdb/01-schema.sql
```

Product imagery is generated as inline SVG (`src/data/imagery.ts`) — the shop
renders identically offline, with no CDN or image licensing.
