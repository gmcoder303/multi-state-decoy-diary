import { NextResponse } from "next/server";
import { db } from "@/db";
import { entries, vault } from "@/db/schema";
import { ensureSchema } from "@/db/migrate";
import { diag, errorCategory } from "@/lib/diag";

export const dynamic = "force-dynamic";

/**
 * GET /api/vault — returns key-derivation material + verifier.
 * This is safe to expose: it contains no credential and no hash of any
 * factor. Security rests on PBKDF2 over the five factors.
 */
export async function GET() {
  try {
    await ensureSchema();
    const rows = await db.select().from(vault).limit(1);
    if (rows.length === 0) {
      return NextResponse.json({ vault: null }, { status: 200 });
    }
    return NextResponse.json({ vault: rows[0] });
  } catch (err) {
    const category = errorCategory(err);
    diag("api:vault:get-failed", { category });
    return NextResponse.json({ error: category }, { status: 500 });
  }
}

/**
 * POST /api/vault — creates the vault during first-time setup.
 * Payload is KDF material only; all cryptographic work happened client-side.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const salt = String(b.salt ?? "");
  const verifierCiphertext = String(b.verifierCiphertext ?? "");
  const verifierIv = String(b.verifierIv ?? "");
  const iterations = Number(b.iterations ?? 0);
  const question = String(b.question ?? "");

  if (
    !salt ||
    salt.length > 128 ||
    !verifierCiphertext ||
    verifierCiphertext.length > 1024 ||
    !verifierIv ||
    verifierIv.length > 64 ||
    !Number.isInteger(iterations) ||
    iterations < 50_000 ||
    iterations > 5_000_000 ||
    !question ||
    question.length > 300
  ) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  try {
    await ensureSchema();
    // Single-vault application: refuse to overwrite an existing vault.
    const existing = await db.select({ id: vault.id }).from(vault).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: "vault exists" }, { status: 409 });
    }

    const inserted = await db
      .insert(vault)
      .values({ salt, verifierCiphertext, verifierIv, iterations, question })
      .returning();
    diag("api:vault:created", { id: inserted[0].id });
    return NextResponse.json({ vault: inserted[0] }, { status: 201 });
  } catch (err) {
    const category = errorCategory(err);
    diag("api:vault:create-failed", { category });
    return NextResponse.json({ error: category }, { status: 500 });
  }
}

/**
 * DELETE /api/vault — EMERGENCY WIPE.
 * Destroys the vault and every encrypted entry. The heavy confirmation
 * ritual is enforced client-side; the server simply executes the wipe of
 * what it stores (ciphertext only — nothing readable ever existed here).
 */
export async function DELETE() {
  try {
    await ensureSchema();
    await db.delete(entries);
    await db.delete(vault);
    diag("api:vault:wiped", {});
    return NextResponse.json({ ok: true });
  } catch (err) {
    const category = errorCategory(err);
    diag("api:vault:wipe-failed", { category });
    return NextResponse.json({ error: category }, { status: 500 });
  }
}
