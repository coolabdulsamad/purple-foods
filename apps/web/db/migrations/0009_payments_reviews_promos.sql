-- 0009_payments_reviews_promos.sql
-- Payments (saved cards + transactions), reviews, promo engine, referrals,
-- Facebook identity. Fully idempotent so the boot self-heal ledger can
-- re-apply safely.

-- ── Saved cards (tokenized gateway authorizations — NEVER PAN/CVV) ──
CREATE TABLE IF NOT EXISTS payment_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'paystack',
  -- Reusable charge token returned by the gateway after a successful charge.
  authorization_code text NOT NULL,
  last4 text NOT NULL DEFAULT '',
  brand text NOT NULL DEFAULT '',
  bank text NOT NULL DEFAULT '',
  exp_month text NOT NULL DEFAULT '',
  exp_year text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, authorization_code)
);
CREATE INDEX IF NOT EXISTS idx_payment_cards_user ON payment_cards (user_id);

-- ── Transactions (every money movement attempt, all methods) ────────
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  provider text NOT NULL,                -- paystack | flutterwave | cod
  reference text NOT NULL UNIQUE,
  amount_kobo bigint NOT NULL CHECK (amount_kobo >= 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'success', 'failed', 'abandoned')),
  channel text NOT NULL DEFAULT '',      -- card | bank_transfer | ussd | cash
  card_brand text NOT NULL DEFAULT '',
  card_last4 text NOT NULL DEFAULT '',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_order ON transactions (order_id);

-- ── Reviews (one per delivered order) ───────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  order_id uuid NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reviews_merchant ON reviews (merchant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews (user_id);

-- ── Promo engine ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('percent', 'fixed', 'free_delivery')),
  percent_off integer,                   -- kind=percent: 1..90
  value_kobo bigint,                     -- kind=fixed: kobo off subtotal
  min_order_kobo bigint NOT NULL DEFAULT 0,
  max_uses integer,                      -- NULL = unlimited
  used_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS promo_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id uuid NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (promo_id, user_id)             -- one use per customer per code
);

-- Promo code applied to an order (display + audit).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_code text;

-- ── Referrals + Facebook identity on users ──────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook_id text;
CREATE UNIQUE INDEX IF NOT EXISTS users_referral_code_unique ON users (referral_code) WHERE referral_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_facebook_id_unique ON users (facebook_id) WHERE facebook_id IS NOT NULL;

-- ── Launch promo codes (idempotent) ─────────────────────────────────
INSERT INTO promo_codes (code, kind, value_kobo, min_order_kobo, max_uses)
VALUES ('WELCOME500', 'fixed', 50000, 200000, NULL)
ON CONFLICT (code) DO NOTHING;

INSERT INTO promo_codes (code, kind, percent_off, min_order_kobo, max_uses)
VALUES ('PURPLE10', 'percent', 10, 100000, NULL)
ON CONFLICT (code) DO NOTHING;

INSERT INTO promo_codes (code, kind, min_order_kobo, max_uses)
VALUES ('FREEDEL', 'free_delivery', 150000, NULL)
ON CONFLICT (code) DO NOTHING;
