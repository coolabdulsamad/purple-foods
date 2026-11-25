# Purple Foods — Customer Web App (apps/web)

Full-stack customer storefront for the Purple Foods platform (Lagos launch):
React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui PWA frontend, with the
backend grafted in — Hono + tRPC 11 + Drizzle ORM on **Neon Postgres**.

## Layout

```
src/         React frontend (pages, store, ui)
api/         Hono server + tRPC routers (catalog, orders)
contracts/   Shared DTOs — all money is kobo as number at the API boundary
db/          Drizzle schema (mirrors infra/db/migrations) + connection
```

## Run

```bash
npm install
cp .env.example .env   # fill DATABASE_URL (Neon) — never commit .env
npm run dev            # http://localhost:3000 (frontend + /api/trpc)
npm run check          # type-check
npm run build          # dist/public (frontend) + dist/boot.js (server bundle)
npm start              # production server
```

## Database

Canonical DDL and Lagos seed data live in `infra/db/migrations/` at the repo
root and are applied to Neon directly. `db/schema.ts` mirrors that DDL for
typed queries; `db/seed.ts` is intentionally a no-op.

## PWA icons

Binary icons are generated, not committed. After cloning:

```bash
pip install Pillow
python3 scripts/generate-icons.py   # writes public/icon-192.png, icon-512.png, apple-touch-icon.png, favicon.png
```

## State

Catalog and orders are live database reads/writes (server-side pricing,
transactional order creation, balanced ledger, order events audit trail).
Only the customer's cart/profile draft persists in `localStorage`; phone OTP
sign-in lands with the auth phase.

© Smadsoft Technology Limited
