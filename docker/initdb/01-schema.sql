-- AIStylo schema. Runs once, when the Postgres data directory is empty.
-- Mirrors the model in ROADMAP.md.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;      -- fuzzy product search
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS citext;      -- case-insensitive emails

-- ── Catalogue ────────────────────────────────────────────────────────────

CREATE TABLE brands (
  id    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name  text NOT NULL UNIQUE,
  slug  text NOT NULL UNIQUE
);

CREATE TYPE garment_slot AS ENUM
  ('top','bottom','dress','outerwear','shoes','bag','accessory');

CREATE TYPE product_status AS ENUM ('draft','live','archived');

CREATE TABLE products (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug        text NOT NULL UNIQUE,
  name        text NOT NULL,
  brand_id    uuid NOT NULL REFERENCES brands(id) ON DELETE RESTRICT,
  description text NOT NULL DEFAULT '',
  material    text NOT NULL DEFAULT '',
  base_price  numeric(10,2) NOT NULL CHECK (base_price >= 0),
  slot        garment_slot NOT NULL,
  formality   smallint NOT NULL CHECK (formality BETWEEN 1 AND 5),
  seasons     text[] NOT NULL DEFAULT '{}',
  occasions   text[] NOT NULL DEFAULT '{}',
  color_hex   char(7) NOT NULL,
  color_name  text NOT NULL,
  tags        text[] NOT NULL DEFAULT '{}',
  -- Titan / Fashion-CLIP multimodal embedding. Recomputed whenever the
  -- descriptive fields change, so retrieval never goes stale.
  embedding   vector(1024),
  status      product_status NOT NULL DEFAULT 'draft',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- HNSW over cosine distance: the stylist's retrieval step.
CREATE INDEX products_embedding_idx ON products
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX products_slot_idx      ON products (slot) WHERE status = 'live';
CREATE INDEX products_occasions_idx ON products USING gin (occasions);
CREATE INDEX products_tags_idx      ON products USING gin (tags);
CREATE INDEX products_name_trgm_idx ON products USING gin (name gin_trgm_ops);

CREATE TABLE variants (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id     uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size           text NOT NULL,
  sku            text NOT NULL UNIQUE,
  price_override numeric(10,2),
  stock_qty      integer NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  UNIQUE (product_id, size)
);
CREATE INDEX variants_product_idx ON variants (product_id);

CREATE TABLE media (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url        text NOT NULL,
  alt        text NOT NULL DEFAULT '',
  position   smallint NOT NULL DEFAULT 0
);
CREATE INDEX media_product_idx ON media (product_id, position);

-- ── Customers & orders ───────────────────────────────────────────────────

CREATE TABLE customers (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email      citext UNIQUE,
  name       text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TYPE order_status AS ENUM ('pending','paid','fulfilled','refunded','cancelled');

CREATE TABLE orders (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference   text NOT NULL UNIQUE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  status      order_status NOT NULL DEFAULT 'pending',
  subtotal    numeric(10,2) NOT NULL DEFAULT 0,
  tax         numeric(10,2) NOT NULL DEFAULT 0,
  shipping    numeric(10,2) NOT NULL DEFAULT 0,
  total       numeric(10,2) NOT NULL DEFAULT 0,
  placed_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_customer_idx ON orders (customer_id, placed_at DESC);
CREATE INDEX orders_status_idx   ON orders (status, placed_at DESC);

CREATE TABLE order_items (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id   uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES variants(id) ON DELETE RESTRICT,
  qty        integer NOT NULL CHECK (qty > 0),
  unit_price numeric(10,2) NOT NULL
);
CREATE INDEX order_items_order_idx ON order_items (order_id);

-- ── Stylist ──────────────────────────────────────────────────────────────

CREATE TABLE outfits (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title      text NOT NULL,
  rationale  text NOT NULL DEFAULT '',
  occasion   text NOT NULL,
  curated_by uuid,                          -- admin_users.id when hand-curated
  score      smallint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE outfit_items (
  outfit_id  uuid NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  slot       garment_slot NOT NULL,
  PRIMARY KEY (outfit_id, product_id)
);

-- Every styling request, with what the extractor made of it. This table is
-- what the admin Insights page reads to find catalogue gaps.
CREATE TABLE style_sessions (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id  uuid REFERENCES customers(id) ON DELETE SET NULL,
  query        text NOT NULL,
  parsed_intent jsonb NOT NULL DEFAULT '{}',
  top_score    smallint,                    -- best match returned; low = gap
  clicked      boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX style_sessions_created_idx ON style_sessions (created_at DESC);
CREATE INDEX style_sessions_score_idx   ON style_sessions (top_score)
  WHERE top_score < 60;

-- ── Admin ────────────────────────────────────────────────────────────────

CREATE TYPE admin_role AS ENUM ('owner','manager','staff');

CREATE TABLE admin_users (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         citext NOT NULL UNIQUE,
  name          text NOT NULL,
  role          admin_role NOT NULL DEFAULT 'staff',
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Housekeeping ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_touch BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
