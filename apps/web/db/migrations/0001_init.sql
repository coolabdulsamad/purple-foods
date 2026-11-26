-- Purple Foods - Phase 1 foundation schema
-- Target: Neon Postgres 16+. Money is ALWAYS kobo (NGN x 100) in bigint.
-- Ids are uuid v4 (pgcrypto). All tables carry created_at; hot tables get updated_at.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;  -- geo dispatch/radius queries land in Phase 2

-- ---------------------------------------------------------------------------
-- Identity. One row per human across all four sides; role gates the surface.
-- Fine-grained admin RBAC (permissions, approval chains) lands in the admin slice.
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       text NOT NULL UNIQUE,               -- E.164, e.g. +2348030000000
  name        text,
  email       text,
  role        text NOT NULL DEFAULT 'customer'
              CHECK (role IN ('customer','rider','merchant','admin')),
  status      text NOT NULL DEFAULT 'active'
              CHECK (status IN ('active','suspended','deleted')),
  last_seen_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Geography: city -> delivery zones (areas). Fees are zone-level defaults;
-- a merchant may override with its own delivery_fee_kobo.
-- ---------------------------------------------------------------------------
CREATE TABLE cities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  state       text NOT NULL DEFAULT 'Lagos',
  country     text NOT NULL DEFAULT 'Nigeria',
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, state)
);

CREATE TABLE areas (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id                   uuid NOT NULL REFERENCES cities(id),
  name                      text NOT NULL,
  base_delivery_fee_kobo    bigint NOT NULL DEFAULT 90000,  -- NGN 900.00
  eta_min_minutes           integer NOT NULL DEFAULT 20,
  eta_max_minutes           integer NOT NULL DEFAULT 35,
  is_active                 boolean NOT NULL DEFAULT true,
  created_at                timestamptz NOT NULL DEFAULT now(),
  UNIQUE (city_id, name)
);

-- ---------------------------------------------------------------------------
-- Merchants (restaurants, bukas, groceries later via kind). Approval chain:
-- submitted -> approved before storefront visibility (is_listed).
-- rating/review_count/eta are ops-maintained display values until the
-- ratings pipeline replaces them with computed ones.
-- ---------------------------------------------------------------------------
CREATE TABLE merchants (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id       uuid REFERENCES users(id),          -- nullable pre-onboarding
  area_id             uuid NOT NULL REFERENCES areas(id),
  name                text NOT NULL,
  slug                text NOT NULL UNIQUE,               -- used in /r/:id
  kind                text NOT NULL DEFAULT 'restaurant'
                      CHECK (kind IN ('restaurant','grocery','pharmacy')),
  description         text,
  phone               text,
  address             text,
  lat                 numeric(9,6),
  lng                 numeric(9,6),
  tags                text[] NOT NULL DEFAULT '{}',       -- cuisine filter chips
  promo               text,                               -- display promo line
  delivery_fee_kobo   bigint,                             -- NULL = use area default
  eta_min_minutes     integer,
  eta_max_minutes     integer,
  rating              numeric(2,1) NOT NULL DEFAULT 0,
  review_count        integer NOT NULL DEFAULT 0,
  is_open             boolean NOT NULL DEFAULT true,
  is_approved         boolean NOT NULL DEFAULT false,
  is_listed           boolean NOT NULL DEFAULT false,     -- approved && quality gate
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE menu_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id     uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text NOT NULL DEFAULT '',
  price_kobo      bigint NOT NULL CHECK (price_kobo >= 0),
  category        text NOT NULL,                          -- menu grouping label
  is_spicy        boolean NOT NULL DEFAULT false,
  is_popular      boolean NOT NULL DEFAULT false,
  is_available    boolean NOT NULL DEFAULT true,
  photo_url       text,                                   -- NULL = DishArt placeholder
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Riders. vetted -> online -> assigned. Live GPS lands with the rider app.
-- ---------------------------------------------------------------------------
CREATE TABLE riders (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL UNIQUE REFERENCES users(id),
  vehicle_type      text NOT NULL DEFAULT 'bike'
                    CHECK (vehicle_type IN ('bike','bicycle','car')),
  plate_number      text,
  home_area_id      uuid REFERENCES areas(id),
  is_approved       boolean NOT NULL DEFAULT false,
  is_online         boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Orders. status is the kitchen/rider pipeline; payment_* tracks money
-- separately so a paid order can still cancel cleanly. Delivery address is
-- snapshotted as text - customer edits never rewrite history.
-- ---------------------------------------------------------------------------
CREATE TABLE orders (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  human_ref           text NOT NULL UNIQUE,               -- PF-1234, customer-facing
  customer_id         uuid NOT NULL REFERENCES users(id),
  merchant_id         uuid NOT NULL REFERENCES merchants(id),
  rider_id            uuid REFERENCES riders(id),
  delivery_area_id    uuid NOT NULL REFERENCES areas(id),
  status              text NOT NULL DEFAULT 'received'
                      CHECK (status IN ('received','preparing','on_the_way','delivered','cancelled')),
  payment_method      text NOT NULL
                      CHECK (payment_method IN ('paystack','flutterwave','cod')),
  payment_status      text NOT NULL DEFAULT 'pending'
                      CHECK (payment_status IN ('pending','paid','failed','refunded')),
  payment_ref         text,                               -- gateway reference
  subtotal_kobo       bigint NOT NULL CHECK (subtotal_kobo >= 0),
  delivery_fee_kobo   bigint NOT NULL DEFAULT 0,
  discount_kobo       bigint NOT NULL DEFAULT 0,
  total_kobo          bigint NOT NULL CHECK (total_kobo >= 0),
  delivery_name       text NOT NULL,
  delivery_phone      text NOT NULL,
  delivery_street     text NOT NULL,
  delivery_notes      text NOT NULL DEFAULT '',
  placed_at           timestamptz NOT NULL DEFAULT now(),
  delivered_at        timestamptz,
  cancelled_at        timestamptz,
  cancel_reason       text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Line items are SNAPSHOTS: name/price copied at purchase time.
CREATE TABLE order_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id      uuid NOT NULL REFERENCES menu_items(id),
  name_snapshot     text NOT NULL,
  unit_price_kobo   bigint NOT NULL,
  quantity          integer NOT NULL CHECK (quantity > 0),
  line_total_kobo   bigint NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Every status transition, who caused it, when. Powers the live timeline
-- and the admin audit view.
CREATE TABLE order_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status      text NOT NULL,
  actor_type  text NOT NULL DEFAULT 'system'
            CHECK (actor_type IN ('customer','merchant','rider','admin','system')),
  actor_id    uuid,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Money ledger: append-only, double-entry friendly. amount_kobo is signed
-- (+ = credit to the entity). Never UPDATE; corrections are new rows.
-- ---------------------------------------------------------------------------
CREATE TABLE ledger_entries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid REFERENCES orders(id),
  entity_type   text NOT NULL
                CHECK (entity_type IN ('customer','merchant','rider','platform')),
  entity_id     uuid NOT NULL,
  entry_type    text NOT NULL
                CHECK (entry_type IN ('charge','payout','commission','refund','adjustment')),
  amount_kobo   bigint NOT NULL,
  currency      char(3) NOT NULL DEFAULT 'NGN',
  memo          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Indexes for the hot read paths.
-- ---------------------------------------------------------------------------
CREATE INDEX idx_areas_city            ON areas (city_id) WHERE is_active;
CREATE INDEX idx_merchants_area        ON merchants (area_id) WHERE is_listed;
CREATE INDEX idx_merchants_owner       ON merchants (owner_user_id);
CREATE INDEX idx_menu_items_merchant   ON menu_items (merchant_id) WHERE is_available;
CREATE INDEX idx_orders_customer       ON orders (customer_id, placed_at DESC);
CREATE INDEX idx_orders_merchant_live  ON orders (merchant_id, status) WHERE status <> 'delivered' AND status <> 'cancelled';
CREATE INDEX idx_orders_rider_live     ON orders (rider_id) WHERE status = 'on_the_way';
CREATE INDEX idx_order_items_order     ON order_items (order_id);
CREATE INDEX idx_order_events_order    ON order_events (order_id, created_at);
CREATE INDEX idx_ledger_order          ON ledger_entries (order_id);
CREATE INDEX idx_ledger_entity         ON ledger_entries (entity_type, entity_id, created_at DESC);

COMMIT;
