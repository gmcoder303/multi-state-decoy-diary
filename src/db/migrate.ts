import { pool } from "@/db";
import { diag, errorCategory } from "@/lib/diag";

/**
 * Idempotent schema bootstrap.
 *
 * The schema lives in src/db/schema.ts (Drizzle models). This module
 * creates the two tables on first use if they do not exist, so a freshly
 * provisioned database (e.g. a new Vercel Postgres / Neon database) works
 * without a manual migration step. `npm run db:push` produces the same
 * schema for anyone who prefers an explicit migration.
 *
 * Runs at most once per server process: the promise is cached, and a
 * failure clears the cache so the next request can retry.
 */
const DDL = `
CREATE TABLE IF NOT EXISTS vault (
  id serial PRIMARY KEY,
  salt text NOT NULL,
  verifier_ciphertext text NOT NULL,
  verifier_iv text NOT NULL,
  iterations integer NOT NULL,
  question text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS diary_entries (
  id text PRIMARY KEY,
  ciphertext text NOT NULL,
  iv text NOT NULL,
  clue text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS diary_entries_created_at_idx
  ON diary_entries (created_at);
`;

let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = pool.query(DDL).then(
      () => {
        diag("db:schema-ready");
      },
      (err: unknown) => {
        diag("db:schema-ensure-failed", { category: errorCategory(err) });
        schemaReady = null;
        throw err;
      },
    );
  }
  return schemaReady;
}

/** Read-only schema presence check for the health endpoint. */
export async function schemaStatus(): Promise<{
  vault: boolean;
  diary_entries: boolean;
}> {
  const res = await pool.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN ('vault', 'diary_entries')`,
  );
  const names = new Set(res.rows.map((r) => r.table_name));
  return { vault: names.has("vault"), diary_entries: names.has("diary_entries") };
}
