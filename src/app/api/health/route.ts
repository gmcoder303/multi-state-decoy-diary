import { db } from "@/db";
import { sql } from "drizzle-orm";
import { ensureSchema, schemaStatus } from "@/db/migrate";
import { diag, errorCategory } from "@/lib/diag";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — safe liveness/readiness probe.
 *
 * Reports ONLY booleans and coarse categories:
 *   { ok, db, schema: { vault, diary_entries }, error? }
 * It never exposes credentials, configuration, or any data content.
 *
 * Status gradient:
 *   200 — database reachable AND schema present (app fully functional)
 *   503 — database reachable but schema missing (self-heal attempted+failed)
 *   500 — database unreachable (or DATABASE_URL unset: empty body, because
 *         the db module fails to load in that case)
 *
 * Also attempts the idempotent schema self-heal (CREATE TABLE IF NOT
 * EXISTS) so this endpoint doubles as a one-command post-deploy check.
 */
export async function GET() {
  try {
    await db.execute(sql`select 1`);
  } catch (err) {
    const category = errorCategory(err);
    diag("api:health:db-unreachable", { category });
    return Response.json(
      { ok: false, db: false, schema: false, error: category },
      { status: 500 },
    );
  }

  try {
    await ensureSchema();
    const status = await schemaStatus();
    const ok = status.vault && status.diary_entries;
    if (!ok) {
      diag("api:health:schema-missing", status);
    }
    return Response.json(
      { ok, db: true, schema: status },
      { status: ok ? 200 : 503 },
    );
  } catch (err) {
    const category = errorCategory(err);
    diag("api:health:schema-check-failed", { category });
    return Response.json(
      { ok: false, db: true, schema: false, error: category },
      { status: 503 },
    );
  }
}
