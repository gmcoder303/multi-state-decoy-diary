/**
 * Deterministic corruption rendering for Diary 1 ("the archive").
 *
 * ONE consistent corruption format for every entry — the garbled body is
 * derived from the real ciphertext, so each corrupted record is stable and
 * visually unique (the owner learns to recognise their entries).
 */

const GLYPHS =
  "▓▒░█▄▀■□▪▫◊◘◙╳╱╲╴╵╶╷┆┊┄┈╍╎%#@$&*+=~^?!§¤×÷01".split("");

function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function sectorLabel(id: string): string {
  const hex = id.replace(/-/g, "").toUpperCase();
  return `SEC-0x${hex.slice(0, 4)}·${hex.slice(4, 8)}`;
}

export function corruptedStamp(iso: string, seedStr: string): string {
  const rng = mulberry32(fnv1a(seedStr + iso));
  const d = new Date(iso);
  const base = isNaN(d.getTime()) ? "0000-00-00" : iso.slice(0, 10);
  const chars = base.split("");
  // corrupt 2-4 characters deterministically
  const n = 2 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(rng() * chars.length);
    if (chars[idx] !== "-") chars[idx] = rng() > 0.5 ? "▒" : "�";
  }
  const suffix = ["ERR", "NA", "0x0F", "NULL", "??"][Math.floor(rng() * 5)];
  return `${chars.join("")} ${suffix}`;
}

function glyphLine(rng: () => number, source: string, len: number): string {
  let out = "";
  for (let i = 0; i < len; i++) {
    const r = rng();
    if (r < 0.42) {
      out += GLYPHS[Math.floor(rng() * GLYPHS.length)];
    } else if (r < 0.86 && source.length > 0) {
      out += source[Math.floor(rng() * source.length)];
    } else if (r < 0.92) {
      out += " ";
    } else {
      out += String.fromCharCode(33 + Math.floor(rng() * 90));
    }
  }
  return out;
}

export interface CorruptRecord {
  lines: string[];
  hex: string[];
  badges: string[];
  integrity: number;
}

/** The ONE corruption format used for every archive entry. */
export function corruptRecord(
  ciphertext: string,
  seed: string,
): CorruptRecord {
  const rng = mulberry32(fnv1a(seed + ciphertext.slice(0, 40)));
  const lineCount = 3 + Math.floor(rng() * 3);
  const lines: string[] = [];
  for (let i = 0; i < lineCount; i++) {
    lines.push(glyphLine(rng, ciphertext, 34 + Math.floor(rng() * 22)));
  }
  const hex: string[] = [];
  for (let r = 0; r < 2; r++) {
    let row = `0x${(Math.floor(rng() * 0xffff) + 0x1000)
      .toString(16)
      .toUpperCase()
      .padStart(4, "0")}: `;
    for (let c = 0; c < 8; c++) {
      row +=
        (rng() < 0.2
          ? "??"
          : Math.floor(rng() * 255)
              .toString(16)
              .toUpperCase()
              .padStart(2, "0")) + " ";
    }
    hex.push(row.trimEnd());
  }
  const pool = [
    "CRC FAIL",
    "DATA CORRUPTED",
    "SECTOR UNREADABLE",
    "ERR 0xC1",
    "PARITY LOST",
    "ENCODING UNKNOWN",
    "SIG MISSING",
  ];
  const badges: string[] = [];
  const bCount = 1 + Math.floor(rng() * 3);
  for (let i = 0; i < bCount; i++) {
    const b = pool[Math.floor(rng() * pool.length)];
    if (!badges.includes(b)) badges.push(b);
  }
  const integrity = 3 + Math.floor(rng() * 24);
  return { lines, hex, badges, integrity };
}

/** Short garbled system log lines for ambience. */
export function glitchWord(word: string, seed: string): string {
  const rng = mulberry32(fnv1a(seed + word));
  return word
    .split("")
    .map((ch) => (rng() < 0.22 ? GLYPHS[Math.floor(rng() * GLYPHS.length)] : ch))
    .join("");
}
