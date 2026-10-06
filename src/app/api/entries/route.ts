import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { entries } from "@/db/schema";

export const dynamic = "force-dynamic";

/** GET /api/entries — every row is ciphertext; the server cannot read it. */
export async function GET() {
  const rows = await db
    .select()
    .from(entries)
    .orderBy(desc(entries.createdAt));
  return NextResponse.json({ entries: rows });
}

/** POST /api/entries — stores one client-side-encrypted entry. */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const id = String(b.id ?? "");
  const ciphertext = String(b.ciphertext ?? "");
  const iv = String(b.iv ?? "");
  const clue =
    typeof b.clue === "string" && b.clue.trim() !== ""
      ? b.clue.slice(0, 400)
      : null;

  if (
    !/^[0-9a-f-]{36}$/i.test(id) ||
    !ciphertext ||
    ciphertext.length > 400_000 ||
    !iv ||
    iv.length > 64
  ) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const inserted = await db
    .insert(entries)
    .values({ id, ciphertext, iv, clue })
    .returning();
  return NextResponse.json({ entry: inserted[0] }, { status: 201 });
}
