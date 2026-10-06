import type { DecryptedEntry } from "@/lib/types";
import { humanDate, MONTH_NAMES } from "@/lib/dates";

/**
 * Client-side search over decrypted entries (never touches the server).
 * Matches titles, body text, tags, moods, ISO dates, month names and years.
 */
export function searchEntries(
  entries: DecryptedEntry[],
  query: string,
): DecryptedEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;

  return entries.filter((e) => {
    const [y, m] = e.date.split("-").map((x) => parseInt(x, 10));
    const monthName = MONTH_NAMES[(m || 1) - 1] ?? "";
    const haystack = [
      e.title,
      e.content,
      e.mood,
      e.date,
      e.time,
      humanDate(e.date),
      monthName,
      `${monthName} ${y}`,
      String(y),
      ...e.tags.map((t) => `#${t} ${t}`),
    ]
      .join("\n")
      .toLowerCase();
    return q.split(/\s+/).every((tok) => haystack.includes(tok));
  });
}
