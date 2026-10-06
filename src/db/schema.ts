import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/**
 * The vault holds ONLY key-derivation material and a verifier.
 * The verifier is a known plaintext encrypted with the derived key —
 * it lets the client check a key without storing any credential or hash
 * of an individual factor. No factor is ever stored, in any form.
 */
export const vault = pgTable("vault", {
  id: serial("id").primaryKey(),
  salt: text("salt").notNull(),
  verifierCiphertext: text("verifier_ciphertext").notNull(),
  verifierIv: text("verifier_iv").notNull(),
  iterations: integer("iterations").notNull(),
  question: text("question").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/**
 * Diary entries are stored exclusively as AEAD ciphertext (AES-256-GCM),
 * encrypted in the browser before upload. The server never sees plaintext.
 * `clue` is an OPTIONAL, user-authored hint that is intentionally visible
 * in the corrupted archive — users are warned to write hints only they
 * understand, never credentials themselves.
 * Timestamps are the minimum metadata required for synchronization.
 */
export const entries = pgTable("diary_entries", {
  id: text("id").primaryKey(),
  ciphertext: text("ciphertext").notNull(),
  iv: text("iv").notNull(),
  clue: text("clue"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
