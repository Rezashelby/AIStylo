# AIStylo — Architecture & Roadmap

## Phase 1 — Storefront (current)

React 18 + TypeScript + Vite 5, React Router, Zustand. No backend: the catalogue
is a typed module and the styling engine runs in the browser. Everything is
built against interfaces that a real backend can implement without touching the
UI.

## Phase 2 — Database

**Choice: PostgreSQL + `pgvector`** (Supabase managed, or Neon).

Why Postgres over the alternatives, given this specific product:

| Need | Postgres + pgvector | Mongo | Pinecone | DynamoDB |
|---|---|---|---|---|
| Vector search for the stylist | native (`pgvector`) | add-on | yes (only this) | no |
| Relational catalogue + variants | native | workable | no | awkward |
| Transactional checkout | ACID | limited | no | limited |
| Admin filtering/sorting/reporting | SQL | aggregation pipeline | no | very poor |
| One database to operate | yes | +vector DB | +main DB | +vector DB |

The stylist's retrieval step is `ORDER BY embedding <=> $1 LIMIT n`. Keeping that
in the same database as inventory means the recommender can filter on live stock
in a single query — the thing that breaks when vectors live elsewhere.

Supabase specifically also supplies auth, image storage, and row-level security,
which covers most of the admin backend without writing it.

### Schema sketch

```
products      id, slug, name, brand_id, description, material, base_price,
              slot, formality, seasons[], occasions[], color_hex, color_name,
              tags[], embedding vector(1024), status, created_at
variants      id, product_id, size, sku, price_override, stock_qty
brands        id, name, slug
media         id, product_id, url, alt, position
customers     id, email, name, created_at
orders        id, customer_id, status, subtotal, tax, shipping, total, placed_at
order_items   id, order_id, variant_id, qty, unit_price
outfits       id, title, rationale, occasion, curated_by, score
outfit_items  outfit_id, product_id, slot
style_sessions id, customer_id, query, parsed_intent jsonb, created_at
admin_users   id, email, role (owner|manager|staff)
```

Index `embedding` with HNSW; index `slot`, `occasions`, `status` for the shop
filters.


## Services — what you actually need

Researched Aug 2026. The rule applied throughout: add a service when a real
limit forces it, not in advance.

### Need from day one

| Concern | Choice | Note |
|---|---|---|
| Database + vectors | **Postgres + pgvector** | one system, see below |
| Payments | **Stripe** | Checkout hosted first; keeps card data out of scope for PCI |
| Product images | **Cloudflare Images** or **Supabase Storage** | resizing + CDN included |
| Transactional email | **Resend** or **Postmark** | order confirmations, shipping |
| Hosting (frontend) | **Vercel**, **Cloudflare Pages**, or the Docker image here | static SPA, cheap anywhere |
| Error tracking | **Sentry** | free tier covers early traffic |

### Add only when a limit is hit

| Concern | Add when | Choice |
|---|---|---|
| Dedicated search | Postgres full-text/trigram stops keeping up, roughly >50k SKUs or you need typo-tolerance and facets | **Typesense** (self-host) or **Algolia** |
| Redis cache | Sessions/carts start straining Postgres | already in `docker-compose.yml` |
| Vector database | Past ~50M vectors — see below | **Pinecone** or **Qdrant** |
| Queue / background jobs | Re-embedding the catalogue starts blocking requests | **pg-boss** (stays in Postgres) or **Inngest** |
| Tax & shipping | Selling across jurisdictions | **Stripe Tax**, **Shippo** |

**You do not need a separate vector database.** pgvector handles up to roughly
50M vectors on one well-provisioned node, and below that it beats Pinecone on
cost, operational simplicity and query flexibility while matching it on latency.
For scale: 100,000 SKUs at five embeddings each is 500k vectors — two orders of
magnitude below the ceiling. Pinecone earns its cost past ~100M vectors, or when
you need multi-region replication and zero-ops.

The decisive advantage of keeping vectors in Postgres is the filtered query.
The stylist needs "nearest neighbours **that are live and in stock**":

```sql
SELECT p.id, p.name
FROM products p
JOIN variants v ON v.product_id = p.id
WHERE p.status = 'live' AND v.stock_qty > 0
  AND 'work' = ANY(p.occasions)
ORDER BY p.embedding <=> $1
LIMIT 20;
```

With a separate vector store that becomes two round trips and a join done in
application code, and you either over-fetch candidates or return items you
cannot sell.

## Which Postgres to run

All four run real Postgres with pgvector; the difference is what surrounds it.

| | Best for | Trade-off |
|---|---|---|
| **Supabase** ← recommended | Auth, storage, realtime and row-level security bundled — most of the admin backend without writing it | Opinionated; you adopt their client libraries |
| **Neon** | Pure Postgres, scale-to-zero, branch-per-PR | Bring your own auth, storage, file handling |
| **AWS Aurora** | Already committed to AWS; matches the AWS AI Stylist reference | Most expensive, most operational overhead |
| **PlanetScale** | Not recommended here | Postgres product is newer; extension compatibility including pgvector is less consistent |

**Recommendation: Supabase.** For this specific app it supplies four things you
would otherwise build — auth for customer accounts, storage plus a CDN for
product images, row-level security to gate the `/admin` routes by role, and
pgvector already enabled. Migrating off later is a `pg_dump`, because it is
ordinary Postgres underneath.

Postgres over the alternatives generally: it was chosen 3:1 over MySQL for new
projects in 2026, its JSONB outperforms MongoDB by ~3.7x on JSON queries, and
ACID transactions are not optional once inventory and payments are involved.
MySQL's ~20-30% edge on simple SELECTs does not offset lacking pgvector.

## Phase 3 — Admin UI

A separate authenticated area at `/admin`, role-gated (owner / manager / staff).

- **Dashboard** — revenue, orders, conversion, top products, low stock.
- **Products** — table with search/filter/bulk actions; create & edit with image
  upload, variants, pricing, stock; publish/archive. Re-embeds on save so the
  stylist stays current.
- **Orders** — list, detail, fulfilment status, refunds.
- **Customers** — profiles, order history, saved items.
- **Outfits** — curate looks by hand; pin them above engine output.
- **Stylist analytics** — what shoppers actually ask for, which intents return
  weak matches (the catalogue-gap report), click-through per look.
- **Settings** — shipping, tax, brand, staff accounts.

## Phase 4 — AI backend

Implement `StylistProvider` (`src/lib/ai/provider.ts`) against a real service.
The UI needs no changes — set `VITE_STYLIST_API`.

Server pipeline: extract intent (Claude) → embed → `pgvector` retrieval filtered
on in-stock → assemble under the same hard constraints as the local engine →
Claude writes the rationale → return resolved product ids.

Keep the structured scoring layer server-side. Embeddings find plausible
candidates; only explicit rules reliably enforce "not two jackets" and
"formality must not span more than two steps".
