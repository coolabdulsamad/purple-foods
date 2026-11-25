import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import { env } from "../lib/env";
import * as schema from "@db/schema";

// Neon Postgres over the WebSocket pool — chosen over neon-http because order
// creation spans orders + order_items + order_events + ledger_entries and
// MUST run inside a real transaction (neon-http has no transaction support).
neonConfig.webSocketConstructor = ws;

let instance: ReturnType<typeof createDb> | undefined;

function createDb() {
  const pool = new Pool({ connectionString: env.databaseUrl });
  return drizzle(pool, { schema });
}

export function getDb() {
  if (!instance) {
    instance = createDb();
  }
  return instance;
}
