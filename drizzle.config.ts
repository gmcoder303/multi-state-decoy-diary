import "dotenv/config";
import { defineConfig } from "drizzle-kit";

/**
 * Uses DATABASE_URL when set (production database), otherwise falls back
 * to the local development database.
 *
 * Push the schema explicitly with:  npm run db:push
 * (The API routes also self-heal an empty database via CREATE TABLE IF
 * NOT EXISTS — see src/db/migrate.ts — so this is a belt-and-braces
 * procedure, not a requirement.)
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
  },
});
