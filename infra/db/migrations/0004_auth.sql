-- 0004_auth.sql — phone OTP auth: one-time passcodes + opaque sessions.
-- Design:
--   * 6-digit codes, only an HMAC-SHA256 hash is stored (pepper = APP_SECRET),
--     10-minute TTL, max 5 verify attempts, rate-limited at request time
--     (5 codes per phone per hour, enforced in the API).
--   * Sessions are opaque 256-bit bearer tokens; only their SHA-256 hash is
--     stored. 30-day expiry, revocable, last_used_at for audit.
--   * users.phone (unique) stays the customer identity key.
-- NOTE for the Neon guided-migration flow: strip comment lines before
-- submitting (the splitter breaks on semicolons inside comments).

BEGIN;

CREATE TABLE IF NOT EXISTS otp_codes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       text NOT NULL,
  code_hash   text NOT NULL,
  purpose     text NOT NULL DEFAULT 'login',
  attempts    integer NOT NULL DEFAULT 0,
  expires_at  timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_otp_codes_phone_created
  ON otp_codes (phone, created_at DESC);

CREATE TABLE IF NOT EXISTS sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   text NOT NULL UNIQUE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  last_used_at timestamptz,
  revoked_at   timestamptz
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);

COMMIT;
