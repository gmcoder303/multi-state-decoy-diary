import type { DecryptedEntry } from "@/lib/types";
import { compareDateTimeDesc, daysBetween, todayISO } from "@/lib/dates";

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export interface DiaryStats {
  totalEntries: number;
  totalWords: number;
  longest: DecryptedEntry | null;
  longestWords: number;
  first: DecryptedEntry | null;
  latest: DecryptedEntry | null;
  activeDays: number;
  streak: number;
  writingSince: number; // days since first entry
  topTags: { tag: string; count: number }[];
  starred: number;
}

export function computeStats(entries: DecryptedEntry[]): DiaryStats {
  const sorted = [...entries].sort(compareDateTimeDesc);
  const totalWords = entries.reduce((n, e) => n + wordCount(e.content), 0);

  let longest: DecryptedEntry | null = null;
  let longestWords = 0;
  for (const e of entries) {
    const w = wordCount(e.content);
    if (w > longestWords) {
      longest = e;
      longestWords = w;
    }
  }

  const daySet = new Set(entries.map((e) => e.date));
  const activeDays = daySet.size;

  // Streak: consecutive days ending at the most recent writing day.
  let streak = 0;
  if (sorted.length > 0) {
    const days = [...daySet].sort();
    streak = 1;
    for (let i = days.length - 1; i > 0; i--) {
      if (daysBetween(days[i - 1], days[i]) === 1) streak++;
      else break;
    }
  }

  const tagMap = new Map<string, number>();
  for (const e of entries)
    for (const t of e.tags) tagMap.set(t, (tagMap.get(t) ?? 0) + 1);
  const topTags = [...tagMap.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const first = sorted.length > 0 ? sorted[sorted.length - 1] : null;
  const latest = sorted.length > 0 ? sorted[0] : null;
  const writingSince = first ? daysBetween(first.date, todayISO()) : 0;

  return {
    totalEntries: entries.length,
    totalWords,
    longest,
    longestWords,
    first,
    latest,
    activeDays,
    streak,
    writingSince,
    topTags,
    starred: entries.filter((e) => e.starred).length,
  };
}
