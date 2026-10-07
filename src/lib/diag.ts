/**
 * SAFE development diagnostics.
 *
 * Logs only *categories* of failures: stage names, API endpoints, HTTP
 * status codes, and coarse database/crypto error classes. It NEVER logs
 * authentication factors, passwords, question answers, derived keys,
 * encryption keys, or plaintext diary content.
 *
 * Enabled when either:
 *  - running a development build (`next dev`), or
 *  - the user opts in at runtime via `localStorage["archive.debug"] = "1"`.
 *
 * Diagnostics go to the browser/server console ONLY. The user-facing
 * authentication flow is unchanged: any failure still lands silently in
 * the decoy diary and no error is ever shown to a visitor.
 */

export type DiagDetail = Record<
  string,
  string | number | boolean | null | undefined
>;

let cachedEnabled: boolean | undefined;

function enabled(): boolean {
  if (cachedEnabled !== undefined) return cachedEnabled;
  const dev = process.env.NODE_ENV !== "production";
  if (typeof window === "undefined") {
    cachedEnabled = dev;
    return cachedEnabled;
  }
  try {
    cachedEnabled =
      dev || window.localStorage.getItem("archive.debug") === "1";
  } catch {
    cachedEnabled = dev;
  }
  return cachedEnabled;
}

export function diag(stage: string, detail?: DiagDetail): void {
  if (!enabled()) return;
  try {
    console.warn(`[diary-debug] ${stage}`, detail ?? "");
  } catch {
    /* console unavailable — diagnostics must never break the app */
  }
}

/**
 * Coarse, safe failure category for any thrown value.
 * Only uses error *names*, HTTP statuses, and SQLSTATE/errno codes —
 * never error messages (which could embed data).
 */
export function errorCategory(err: unknown): string {
  if (typeof err === "object" && err !== null) {
    const e = err as {
      name?: string;
      code?: unknown;
      status?: unknown;
      errors?: unknown;
    };
    if (e.name === "ApiError" && typeof e.status === "number") {
      return `http_${e.status}`;
    }
    if (e.name === "TypeError") return "network_failure";
    if (e.name === "OperationError") return "crypto_verification";
    if (typeof e.code === "string") {
      const mapped = mapCode(e.code);
      if (mapped) return mapped;
    }
    if (e.name === "DatabaseError") return "db_error";
    // Node wraps multi-address connection attempts in an AggregateError;
    // inspect the inner codes before giving up.
    if (Array.isArray(e.errors)) {
      for (const inner of e.errors) {
        const code = (inner as { code?: unknown })?.code;
        if (typeof code === "string") {
          const mapped = mapCode(code);
          if (mapped) return mapped;
        }
      }
      return "db_unreachable";
    }
  }
  if (err instanceof Error && err.name === "AbortError") return "aborted";
  return "unknown_failure";
}

function mapCode(code: string): string | null {
  // SQLSTATE codes from postgres (5 chars, digits/uppercase letters)
  if (/^[0-9A-Z]{5}$/.test(code)) {
    if (code === "42P01" || code === "42P06" || code === "42704") {
      return "schema_missing";
    }
    if (code === "3D000") return "database_missing";
    if (code === "42501") return "schema_permission_denied";
    if (code.startsWith("23")) return "db_constraint_violation";
    if (code.startsWith("08")) return "db_connection_failed";
    return "db_error";
  }
  // OS-level errno from the pg driver (ECONNREFUSED, ENOTFOUND, …)
  if (
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "ETIMEDOUT" ||
    code === "EAI_AGAIN" ||
    code === "ECONNRESET"
  ) {
    return "db_unreachable";
  }
  return null;
}
