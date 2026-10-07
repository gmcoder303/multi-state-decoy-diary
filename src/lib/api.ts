import type { CipherPayload } from "@/lib/crypto";
import type { EncEntryRow, VaultRow } from "@/lib/types";
import { diag } from "@/lib/diag";

/**
 * Carries only the endpoint path and HTTP status — never any payload —
 * so callers can produce safe development diagnostics.
 */
export class ApiError extends Error {
  readonly endpoint: string;
  readonly status: number;

  constructor(endpoint: string, status: number, serverMessage?: string) {
    super(serverMessage ?? `request failed (${status})`);
    this.name = "ApiError";
    this.endpoint = endpoint;
    this.status = status;
  }
}

async function j<T>(res: Response, endpoint: string): Promise<T> {
  if (!res.ok) {
    let msg: string | undefined;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) msg = data.error;
    } catch {
      /* non-JSON error body (e.g. framework 500) — ignore */
    }
    // Safe categories only: endpoint + status + our own coarse server error.
    diag(`api-error:${endpoint}`, { status: res.status, serverError: msg });
    throw new ApiError(endpoint, res.status, msg);
  }
  return (await res.json()) as T;
}

export async function fetchVault(): Promise<VaultRow | null> {
  const res = await fetch("/api/vault", { cache: "no-store" });
  const data = await j<{ vault: VaultRow | null }>(res, "/api/vault");
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
  const data = await j<{ vault: VaultRow }>(res, "POST /api/vault");
  return data.vault;
}

export async function destroyVault(): Promise<void> {
  const res = await fetch("/api/vault", { method: "DELETE" });
  await j<{ ok: boolean }>(res, "DELETE /api/vault");
}

export async function fetchEntryRows(): Promise<EncEntryRow[]> {
  const res = await fetch("/api/entries", { cache: "no-store" });
  const data = await j<{ entries: EncEntryRow[] }>(res, "/api/entries");
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
  const data = await j<{ entry: EncEntryRow }>(res, "POST /api/entries");
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
  const data = await j<{ entry: EncEntryRow }>(res, `PUT /api/entries/:id`);
  return data.entry;
}

export async function deleteEntryRow(id: string): Promise<void> {
  const res = await fetch(`/api/entries/${id}`, { method: "DELETE" });
  await j<{ ok: boolean }>(res, `DELETE /api/entries/:id`);
}
