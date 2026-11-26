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
- `0005_full_auth.sql` — email + Google auth (nullable phone, `password_hash`,
  `google_sub`, `avatar_url`, partial unique indexes), `addresses`, `favorites`,
  `notifications`

Migrations are applied through the Neon guided-migration flow (temp branch →
verify → apply), not from the app. `db/seed.ts` is intentionally a no-op.

## Pages

22 routes behind an onboarding gate (`/welcome` intro → `/location` area +
street → `/auth` sign-in, skippable): Home, Search, Restaurants, Restaurant
detail, Item detail, Category, Cart, Checkout, Order success, Orders, Order
tracking, Account, Edit profile, Addresses, Favorites, Promos, Notifications,
Help — plus the 4 chromeless onboarding/auth pages.

## Auth (phone OTP + email + Google)

Three sign-in methods, all returning `{ token, expiresAt, user }`:

- **Phone OTP** — `auth.requestOtp { phone }` → 6-digit code (HMAC-SHA256
  hashed, 10-min TTL, 5 requests/phone/hour); `auth.verifyOtp { phone, code }`
  → bearer token (SHA-256 stored, 30-day). SMS via Termii when
  `TERMII_API_KEY` is set; otherwise the response carries `devCode`.
- **Email + password** — `auth.register { name, email, phone, password }` /
  `auth.loginEmail { email, password }`. scrypt hashes with per-user salt,
  constant-time compare, dummy-hash timing equalization. Registering with a
  phone that matches a phone-only OTP/guest account upgrades that account
  (order history preserved).
- **Google** — `auth.google { idToken }` verifies the ID token against
  Google's tokeninfo endpoint (`aud` must equal `GOOGLE_CLIENT_ID`, email must
  be verified); links by `google_sub` or email, else creates the account.
  Needs `GOOGLE_CLIENT_ID` (server) + `VITE_GOOGLE_CLIENT_ID` (web); without
  them the endpoint returns PRECONDITION_FAILED and the button says it's
  being connected.

Send `Authorization: Bearer <token>` on every request (web client reads it
from localStorage `pf2-session`). `orders.mine`, `addresses.*`, `favorites.*`,
`notifications.*` are session-only; `orders.create` pins signed-in orders to
the session identity and backfills a typed checkout phone onto accounts that
have none (Google sign-ups). Guest checkout stays supported.

## State

- Catalog, orders, auth, addresses, favorites, notifications: live Neon Postgres.
- On-device only: cart, selected area, onboarding flag, session token
  (localStorage `pf2-*`).

© Smadsoft Technology Limited.
