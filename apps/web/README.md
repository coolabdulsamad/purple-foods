# Purple Foods — apps/web

Customer storefront **and** grafted API, one deployable unit:

```
src/        React 19 + Vite PWA (customer app)
api/        Hono + tRPC API (boot.ts bundles to dist/boot.js)
contracts/  Shared DTOs/errors between api/ and src/ (money = kobo, plain number)
db/         Drizzle schema mirror + seed stub (canonical DDL lives in infra/db/migrations/)
```

## Run

```bash
cp .env.example .env   # fill DATABASE_URL (Neon) — never commit .env
npm install
npm run dev            # Vite dev server + API
npm run check          # typecheck (app + server)
npm run build          # PWA bundle + dist/boot.js API bundle
```

## Database

Canonical DDL + seeds: `infra/db/migrations/` (repo root) —

- `0001_init.sql` — schema (users, cities, areas, merchants, menu, orders, ledger…)
- `0002_seed_lagos.sql` — initial launch data (idempotent)
- `0003_abuja.sql` — Lagos → Abuja/FCT switch, in place (ids kept stable)
- `0004_auth.sql` — phone OTP auth (`otp_codes`, `sessions`)

Migrations are applied through the Neon guided-migration flow (temp branch →
verify → apply), not from the app. `db/seed.ts` is intentionally a no-op.

## Auth (phone OTP)

- `POST auth.requestOtp { phone }` → 6-digit code (HMAC-SHA256 hashed, 10-min
  TTL, 5 requests/phone/hour). SMS goes through Termii when `TERMII_API_KEY`
  is set; without it the response carries `devCode` so sign-in stays testable.
- `POST auth.verifyOtp { phone, code }` → opaque bearer token (stored as
  SHA-256 hash, 30-day expiry) + the session user. Phone is the customer
  identity key; first verify creates the user row.
- Send `Authorization: Bearer <token>` on every request (the web client reads
  it from localStorage `pf2-session`). `orders.mine` is session-only;
  `orders.create` pins signed-in orders to the session identity — a phone
  typed at checkout never overrides it. Guest checkout stays supported.

## State

- Catalog, orders, auth: live Neon Postgres.
- On-device only: cart, selected area, delivery profile draft, session token
  (localStorage `pf2-*`).

© Smadsoft Technology Limited.
