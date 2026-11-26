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
- `0006_cities_geo.sql` — multi-city + geo: `lat`/`lng` on cities, areas and
  merchant backfills; Lagos, Port Harcourt, Ibadan, Kano and Enugu added with
  19 new delivery zones (25 zones across 6 cities, all idempotent)

Migrations are applied through the Neon guided-migration flow (temp branch →
verify → apply). `db/seed.ts` is intentionally a no-op.

**Boot-time self-heal:** copies of all six migrations also live in
`db/migrations/` and are embedded in the API bundle (esbuild `--loader:.sql=text`).
At production boot, `api/lib/migrate.ts` checks a `_pf_migrations` ledger:
a fresh/empty database (e.g. a platform-provisioned Postgres that never saw
the Neon flow) is migrated and seeded automatically; a database that already
has the schema is baselined and untouched. Failures are logged, never fatal —
`GET /api/health` reports `{ ok, db, host, detail }` for instant diagnosis.

**Which database wins:** the app prefers `PF_DATABASE_URL` over `DATABASE_URL`.
A deployed container may receive a platform-injected `DATABASE_URL` pointing at
its own (empty) provisioned database, and process env beats `.env` — so the
Neon connection string is pinned as `PF_DATABASE_URL` in `.env` (which ships in
the deploy zip) and always takes precedence. `GET /api/health`'s `host` field
shows which database the server is actually talking to.

## Pages

22 routes, open to guests by default — this is a website: visitors land on the
storefront Home page, browse everything, pick their area from the top bar, and
sign in only if they want to (Sign in / Sign up in the top bar and on the Home
hero; guest checkout works without an account). Home, Search, Restaurants,
Restaurant detail, Item detail, Category, Cart, Checkout, Order success,
Orders, Order tracking, Account, Edit profile, Addresses, Favorites, Promos,
Notifications, Help — plus `/welcome` intro, `/location` area picker and the
auth pages, still reachable directly but never forced.

## Location & maps

- **Location dialog** — pops over Home on first visit (and from the top-bar
  area button): "Use my current location" (browser geolocation →
  `catalog.nearestArea`, haversine over all active zones), zone/city search,
  an interactive zone map, and every city grouped with **Live / Launching
  soon** badges (live = has listed kitchens). The same picker powers the
  `/location` onboarding page (`src/components/LocationPicker.tsx`).
- **Area-aware feed** — Home and Restaurants filter kitchens by the selected
  zone (`catalog.restaurants { areaId? }`); zones with no kitchens yet get an
  honest "launching soon" empty state with a browse-everything escape.
- **Live order tracking** — the tracking page embeds a Leaflet map
  (`src/components/TrackingMap.tsx`): kitchen pin, customer pin, dashed route,
  and a rider marker that glides along the route as the order moves
  received → preparing → on_the_way → delivered (coords ride on `OrderDto`).
- **Tiles** — OpenStreetMap by default (key-free). Set
  `VITE_GOOGLE_MAPS_API_KEY` and every map switches to Google Maps tiles;
  geolocation, search and tracking work identically either way
  (`src/lib/map.ts`).

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
