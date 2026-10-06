import type { DecryptedEntry } from "@/lib/types";
import { compareDateTimeDesc, MONTH_NAMES } from "@/lib/dates";

export interface DayNode {
  day: number;
  dateISO: string;
  entries: DecryptedEntry[];
}

export interface MonthNode {
  month: number; // 1-12
  label: string;
  days: DayNode[];
  count: number;
}

export interface YearNode {
  year: number;
  months: MonthNode[];
  count: number;
}

/** Year → Month → Day → Entry, all sorted newest-first. */
export function buildTree(entries: DecryptedEntry[]): YearNode[] {
  const years = new Map<number, Map<number, Map<number, DecryptedEntry[]>>>();

  for (const e of entries) {
    const [y, m, d] = e.date.split("-").map((x) => parseInt(x, 10));
    if (!y || !m || !d) continue;
    if (!years.has(y)) years.set(y, new Map());
    const months = years.get(y)!;
    if (!months.has(m)) months.set(m, new Map());
    const days = months.get(m)!;
    if (!days.has(d)) days.set(d, []);
    days.get(d)!.push(e);
  }

  const result: YearNode[] = [];
  for (const [year, months] of years) {
    const monthNodes: MonthNode[] = [];
    for (const [month, days] of months) {
      const dayNodes: DayNode[] = [];
      for (const [day, list] of days) {
        list.sort(compareDateTimeDesc);
        dayNodes.push({
          day,
          dateISO: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
          entries: list,
        });
      }
      dayNodes.sort((a, b) => b.day - a.day);
      monthNodes.push({
        month,
        label: MONTH_NAMES[month - 1] ?? `M${month}`,
        days: dayNodes,
        count: dayNodes.reduce((n, dn) => n + dn.entries.length, 0),
      });
    }
    monthNodes.sort((a, b) => b.month - a.month);
    result.push({
      year,
      months: monthNodes,
      count: monthNodes.reduce((n, mn) => n + mn.count, 0),
    });
  }
  result.sort((a, b) => b.year - a.year);
  return result;
}
