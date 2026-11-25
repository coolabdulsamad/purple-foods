// Seeding is done via the canonical SQL migrations in the purple-foods repo:
//   infra/db/migrations/0001_init.sql        (schema)
//   infra/db/migrations/0002_seed_lagos.sql  (Lagos launch data, idempotent)
// They are applied through the Neon guided-migration flow, not from the app,
// so this script intentionally does nothing. Keeping the file preserves the
// `npx tsx db/seed.ts` convention for future ops-side seeds (riders, admins).

async function seed() {
  console.log(
    "No app-side seed. Canonical seeds live in infra/db/migrations/ (repo root) and are already applied to Neon.",
  );
  process.exit(0);
}

seed();
