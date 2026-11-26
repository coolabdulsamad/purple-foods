// Boot-time schema self-heal.
//
// Why this exists: this deployable unit (apps/web) can land on an environment
// whose DATABASE_URL points at a FRESH, empty Postgres (e.g. a platform-
// provisioned database that never saw the Neon guided-migration flow). Every
// catalog/auth query then 500s with "relation does not exist" and the
// storefront spins on "Loading…" forever. The canonical migrations now ship
// inside the API bundle (db/migrations/*.sql via esbuild's text loader), so
// at boot we check for the schema and apply whatever is missing.
//
// Safety on the existing Neon database: 0001/0002 predate the _pf_migrations
// ledger and use bare CREATE TABLE / CREATE INDEX (no IF NOT EXISTS), so they
// must never be blindly re-run. If the `areas` table already exists, the
// database predates this runner — we baseline (record every known migration
// as applied) and touch nothing else.
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { env } from "./env";
import { log } from "./logger";
import m0001 from "../../db/migrations/0001_init.sql";
import m0002 from "../../db/migrations/0002_seed_lagos.sql";
import m0003 from "../../db/migrations/0003_abuja.sql";
import m0004 from "../../db/migrations/0004_auth.sql";
import m0005 from "../../db/migrations/0005_full_auth.sql";

neonConfig.webSocketConstructor = ws;

const MIGRATIONS: ReadonlyArray<readonly [string, string]> = [
  ["0001_init.sql", m0001],
  ["0002_seed_lagos.sql", m0002],
  ["0003_abuja.sql", m0003],
  ["0004_auth.sql", m0004],
  ["0005_full_auth.sql", m0005],
];

export async function ensureSchema(): Promise<void> {
  if (!env.databaseUrl) {
    log.error("ensureSchema skipped — DATABASE_URL is not set");
    return;
  }
  const pool = new Pool({ connectionString: env.databaseUrl });
  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS _pf_migrations (
         name text PRIMARY KEY,
         applied_at timestamptz NOT NULL DEFAULT now()
       )`,
    );
    const { rows } = await pool.query<{ name: string }>(
      `SELECT name FROM _pf_migrations`,
    );
    const applied = new Set(rows.map((r) => r.name));

    if (applied.size === 0) {
      const reg = await pool.query<{ t: string | null }>(
        `SELECT to_regclass('public.areas') AS t`,
      );
      if (reg.rows[0]?.t) {
        // Pre-existing database migrated through the Neon flow: record the
        // baseline so future migrations can apply incrementally, and stop.
        for (const [name] of MIGRATIONS) {
          await pool.query(
            `INSERT INTO _pf_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING`,
            [name],
          );
        }
        log.info("db schema already present — baselined migration ledger", {
          count: MIGRATIONS.length,
        });
        return;
      }
    }

    let ran = 0;
    for (const [name, sqlText] of MIGRATIONS) {
      if (applied.has(name)) continue;
      log.info("applying migration", { name });
      // Each file carries its own BEGIN/COMMIT; the driver runs the whole
      // file as one simple-protocol multi-statement query.
      await pool.query(sqlText);
      await pool.query(`INSERT INTO _pf_migrations (name) VALUES ($1)`, [name]);
      ran += 1;
    }
    log.info("schema ensured", { applied: ran, total: MIGRATIONS.length });
  } catch (err) {
    // Never take the server down over this: statics must still serve and
    // /api/health must stay up to report the failure.
    log.error("ensureSchema failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  } finally {
    await pool.end().catch(() => {});
  }
}
