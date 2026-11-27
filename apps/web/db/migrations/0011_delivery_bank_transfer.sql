-- 0011_delivery_bank_transfer.sql
-- Send-to-someone receiver details, scheduled delivery, exact drop-off
-- coordinates on orders, and bank-transfer as a payment method (with a
-- per-order transfer instruction table).

-- ── Orders: receiver, schedule, drop-off geo ───────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS receiver_name text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS receiver_phone text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lat numeric(9,6);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lng numeric(9,6);

-- ── Payment method: allow bank_transfer ────────────────────────────
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('paystack','flutterwave','cod','bank_transfer'));

-- ── Bank transfer instructions (one per order) ─────────────────────
-- With PAYSTACK_SECRET_KEY set, the server asks the gateway for a
-- per-order account; without it the company collection account from
-- env (BANK_*) is used with a unique reference the customer quotes.
CREATE TABLE IF NOT EXISTS bank_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reference text NOT NULL UNIQUE,
  amount_kobo bigint NOT NULL,
  bank_name text NOT NULL DEFAULT '',
  account_number text NOT NULL DEFAULT '',
  account_name text NOT NULL DEFAULT '',
  provider text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','paid','expired')),
  expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_transfers_order ON bank_transfers(order_id);
CREATE INDEX IF NOT EXISTS idx_bank_transfers_user ON bank_transfers(user_id, created_at);
