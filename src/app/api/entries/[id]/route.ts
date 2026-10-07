import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { entries } from "@/db/schema";
import { ensureSchema } from "@/db/migrate";
import { diag, errorCategory } from "@/lib/diag";

export const dynamic = "force-dynamic";

/** PUT /api/entries/:id — replaces ciphertext + clue for an entry. */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const ciphertext = String(b.ciphertext ?? "");
  const iv = String(b.iv ?? "");
  const clue =
    b.clue === null
      ? null
      : typeof b.clue === "string"
        ? b.clue.slice(0, 400)
        : undefined;

  if (!ciphertext || ciphertext.length > 400_000 || !iv || iv.length > 64) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  try {
    await ensureSchema();
    const updated = await db
      .update(entries)
      .set({
        ciphertext,
        iv,
        ...(clue !== undefined ? { clue } : {}),
        updatedAt: new Date(),
      })
      .where(eq(entries.id, id))
      .returning();
    if (updated.length === 0) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ entry: updated[0] });
  } catch (err) {
    const category = errorCategory(err);
    diag("api:entries:update-failed", { category });
    return NextResponse.json({ error: category }, { status: 500 });
  }
}

/** DELETE /api/entries/:id — destroys one encrypted entry. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  try {
    await ensureSchema();
    await db.delete(entries).where(eq(entries.id, id));
    diag("api:entries:deleted", {});
    return NextResponse.json({ ok: true });
  } catch (err) {
    const category = errorCategory(err);
    diag("api:entries:delete-failed", { category });
    return NextResponse.json({ error: category }, { status: 500 });
  }
}
