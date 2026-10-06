import type { CipherPayload } from "@/lib/crypto";
import type { EncEntryRow, VaultRow } from "@/lib/types";

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `request failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) msg = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export async function fetchVault(): Promise<VaultRow | null> {
  const res = await fetch("/api/vault", { cache: "no-store" });
  const data = await j<{ vault: VaultRow | null }>(res);
  return data.vault;
}

export async function createVault(payload: {
  salt: string;
  verifierCiphertext: string;
  verifierIv: string;
  iterations: number;
  question: string;
}): Promise<VaultRow> {
  const res = await fetch("/api/vault", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await j<{ vault: VaultRow }>(res);
  return data.vault;
}

export async function destroyVault(): Promise<void> {
  const res = await fetch("/api/vault", { method: "DELETE" });
  await j<{ ok: boolean }>(res);
}

export async function fetchEntryRows(): Promise<EncEntryRow[]> {
  const res = await fetch("/api/entries", { cache: "no-store" });
  const data = await j<{ entries: EncEntryRow[] }>(res);
  return data.entries;
}

export async function createEntryRow(
  id: string,
  payload: CipherPayload,
  clue: string | null,
): Promise<EncEntryRow> {
  const res = await fetch("/api/entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...payload, clue }),
  });
  const data = await j<{ entry: EncEntryRow }>(res);
  return data.entry;
}

export async function updateEntryRow(
  id: string,
  payload: CipherPayload,
  clue: string | null,
): Promise<EncEntryRow> {
  const res = await fetch(`/api/entries/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, clue }),
  });
  const data = await j<{ entry: EncEntryRow }>(res);
  return data.entry;
}

export async function deleteEntryRow(id: string): Promise<void> {
  const res = await fetch(`/api/entries/${id}`, { method: "DELETE" });
  await j<{ ok: boolean }>(res);
}
