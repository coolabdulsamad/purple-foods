# Purple Foods — Phase 1 Foundation Spec

Source: Master Project Blueprint (merged edition), delivery plan + architecture sections.

## P1 scope (Weeks 1–4)

1. **Repo & CI** — this monorepo, GitHub Actions: lint → typecheck → build → test per app.
2. **Customer storefront (`apps/web`)** — first vertical slice: browse restaurants → restaurant detail → cart → checkout stub. PWA, mobile-primary, Purple design system.
3. **Database** — Neon serverless Postgres (production from day one); Drizzle migrations; PostGIS enabled for geo dispatch later. Core tables: users, merchants, menu_items, orders, order_items, ledger_entries (BIGINT kobo), riders, cities.
4. **Auth** — customer accounts.
5. **RBAC shell (`apps/admin`)** — roles, 120+ atomic permissions model, maker-checker approval chain scaffolding, append-only audit log table.

## Milestone gate (P1 exit)

Admin logs in, creates custom roles, defines city geofence polygons. Customer storefront browses real merchant data served from Postgres.

## Notes

- Preview environment builds `apps/web` via the platform pipeline; the same code pushes to GitHub as the source of truth.
- Neon provisioning happens via the Neon plugin (branch-per-feature workflow).
