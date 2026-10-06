/**
 * Client-side cryptography for the secret diary.
 *
 * Design:
 *  - The five authentication factors are normalized and combined into a
 *    single secret material string. No factor is ever stored anywhere.
 *  - A 256-bit AES-GCM key is derived with PBKDF2-SHA256 (Web Crypto).
 *  - Every entry is encrypted in the browser BEFORE it is sent to the
 *    server. The database only ever holds ciphertext + IV.
 *  - A "verifier" (a known plaintext encrypted with the derived key) is
 *    used to check whether the factors were correct, without storing any
 *    credential. Wrong key -> decryption throws -> silent decoy diary.
 *
 * No custom cryptographic constructions are used anywhere.
 */

export const KDF_ITERATIONS = 150_000;
export const VERIFIER_PLAINTEXT = "DIARY_VAULT_OK";

export interface Factors {
  num: string;
  letters: string;
  colors: string[];
  pattern: number[];
  answer: string;
}

export interface CipherPayload {
  ciphertext: string;
  iv: string;
}

const te = new TextEncoder();
const td = new TextDecoder();

export function b64encode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let out = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    out += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(out);
}

export function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
}

export function generateSalt(): string {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return b64encode(salt);
}

export function randomId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
    .slice(6, 8)
    .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

/**
 * Normalization makes authentication forgiving about casing/whitespace
 * while remaining fully deterministic.
 */
export function serializeFactors(f: Factors): string {
  const num = f.num.replace(/\D/g, "").trim();
  const letters = f.letters.trim().toUpperCase();
  const colors = f.colors.map((c) => c.trim().toLowerCase()).join(",");
  const pattern = f.pattern.map((n) => String(n)).join("-");
  const answer = f.answer.trim().toLowerCase().replace(/\s+/g, " ");
  return `v1::${num}::${letters}::${colors}::${pattern}::${answer}`;
}

export async function deriveKey(
  factors: Factors,
  saltB64: string,
  iterations: number,
): Promise<CryptoKey> {
  const material = serializeFactors(factors);
  const baseKey = await crypto.subtle.importKey(
    "raw",
    te.encode(material),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: toArrayBuffer(b64decode(saltB64)),
      iterations,
    },
    baseKey,
    256,
  );
  return crypto.subtle.importKey("raw", bits, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptJSON(
  key: CryptoKey,
  value: unknown,
): Promise<CipherPayload> {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    te.encode(JSON.stringify(value)),
  );
  return { ciphertext: b64encode(ct), iv: b64encode(iv) };
}

/**
 * Throws when the key is wrong (AES-GCM auth tag mismatch) — the caller
 * treats "throws" as "authentication factors were not all correct".
 */
export async function decryptJSON<T>(
  key: CryptoKey,
  payload: CipherPayload,
): Promise<T> {
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(b64decode(payload.iv)) },
    key,
    toArrayBuffer(b64decode(payload.ciphertext)),
  );
  return JSON.parse(td.decode(pt)) as T;
}

export async function verifyKey(
  key: CryptoKey,
  verifier: CipherPayload,
): Promise<boolean> {
  try {
    const data = await decryptJSON<{ v?: string }>(key, verifier);
    return data.v === VERIFIER_PLAINTEXT;
  } catch {
    return false;
  }
}
