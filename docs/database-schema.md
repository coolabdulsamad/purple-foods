# Purple Foods — Database Schema (Phase 1)

Target: **Neon Postgres 16+**. Migrations live in `infra/db/migrations/` and run in
filename order. The typed mirror for API code is `packages/db/src/schema.ts` (Drizzle).

## Conventions (never break these)

- **Money is always kobo** in `bigint` (`price_kobo`, `total_kobo`, …). NGN 2,800.00 = `280000`. Never float, never naira.
- **Ids are `uuid`** v4 (`gen_random_uuid()`). Seed rows use deterministic uuid5 so re-running a seed is a no-op.
- **Customer-facing refs** are separate: `orders.human_ref` (`PF-1234`).
- **Order lines are snapshots** — name and price copy into `order_items` at purchase; later menu edits never rewrite sold history.
- **Delivery address is snapshotted** onto the order as text for the same reason.
- **`ledger_entries` is append-only.** Corrections are new signed rows, never UPDATEs.
- **`order_events` records every status transition** with actor — powers the customer timeline and the admin audit view.
- Status/payment enums are `CHECK` constraints, not lookup tables, until the admin slice needs them editable.

## Tables

| Table | Purpose | Key relations |
|---|---|---|
| `users` | One row per human across all four sides; `role` gates surface (customer/rider/merchant/admin) | referenced everywhere |
| `cities` | Launch cities | parent of `areas` |
| `areas` | Delivery zones; zone default fee + ETA window | `city_id` |
| `merchants` | Restaurants/bukas (grocery/pharmacy later via `kind`); approval + listing flags | `area_id`, `owner_user_id` |
| `menu_items` | Menu with `photo_url` NULL = DishArt placeholder until merchant photos | `merchant_id` |
| `riders` | Rider profile on top of a `users` row | `user_id`, `home_area_id` |
| `orders` | The order: pipeline `status` + separate `payment_status` | customer, merchant, rider, area |
| `order_items` | Snapshotted lines | `order_id`, `menu_item_id` |
| `order_events` | Status audit trail | `order_id` |
| `ledger_entries` | Append-only money movements per entity | `order_id` (nullable) |

## Merchant lifecycle flags

`is_approved` (admin vetted) and `is_listed` (visible on storefront) are separate so
the admin can approve without listing, or delist without un-approving. Storefront
queries filter `is_listed AND is_open`.

## Migrations

| File | Contents |
|---|---|
| `0001_init.sql` | Extensions (pgcrypto, postgis), all 10 tables, checks, hot-path indexes |
| `0002_seed_lagos.sql` | Lagos city, 6 launch areas, 8 merchants, 42 menu items (mirrors `apps/web/src/data.ts`, naira converted to kobo) |

Run order is filename order, inside each file's own transaction. Seeds are idempotent
(`ON CONFLICT DO NOTHING`).

## Deliberately deferred

- PostGIS `geography` columns on merchants/riders (extension enabled now, columns land with dispatch in Phase 2)
- Ratings pipeline replacing ops-maintained `rating`/`review_count`
- Fine-grained admin RBAC tables (permissions, approval chains) — admin slice
- Row-level security — with the auth graft

© Smadsoft Technology Limited
