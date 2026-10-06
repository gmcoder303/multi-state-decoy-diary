"use client";

import { useMemo } from "react";
import {
  CalendarDays,
  Feather,
  FileText,
  Flame,
  Hash,
  Hourglass,
  Star,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { useDiary } from "@/lib/store";
import { computeStats } from "@/lib/stats";
import { humanDate, weekdayOf } from "@/lib/dates";

export function StatsView() {
  const entries = useDiary((s) => s.entries);
  const select = useDiary((s) => s.select);
  const stats = useMemo(() => computeStats(entries), [entries]);

  if (entries.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <Feather size={26} className="dj-faint mx-auto mb-4" />
        <p className="dj-dim text-[14px]">
          Nothing to measure yet — statistics appear after your first entry.
        </p>
      </div>
    );
  }

  return (
    <div className="dj-scroll mx-auto w-full max-w-2xl overflow-y-auto px-5 py-8 sm:px-8">
      <p className="dj-faint text-[11px] tracking-[0.25em] uppercase">
        statistics
      </p>
      <h1 className="dj-ink mt-2 font-journal text-[26px] font-semibold leading-snug sm:text-[30px]">
        You&apos;ve been writing for{" "}
        <span className="dj-accent">{stats.writingSince}</span>{" "}
        {stats.writingSince === 1 ? "day" : "days"}.
      </h1>
      <p className="dj-faint mt-1 text-[13px]">
        since {stats.first ? humanDate(stats.first.date) : "—"}
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard icon={FileText} label="entries" value={stats.totalEntries} />
        <StatCard icon={Hash} label="words" value={stats.totalWords} />
        <StatCard icon={CalendarDays} label="active days" value={stats.activeDays} />
        <StatCard icon={Flame} label="day streak" value={stats.streak} />
        <StatCard icon={Star} label="starred" value={stats.starred} />
        <StatCard
          icon={TrendingUp}
          label="words / entry"
          value={
            stats.totalEntries
              ? Math.round(stats.totalWords / stats.totalEntries)
              : 0
          }
        />
      </div>

      <div className="mt-6 space-y-3">
        {stats.longest && (
          <button
            onClick={() => select(stats.longest!.id)}
            className="dj-panel dj-line dj-scroll flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors hover:border-[var(--accent)]"
          >
            <span className="dj-accent-soft dj-accent flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
              <Feather size={15} />
            </span>
            <span className="min-w-0">
              <span className="dj-faint block text-[10.5px] tracking-widest uppercase">
                longest entry
              </span>
              <span className="dj-ink mt-0.5 block truncate text-[13.5px] font-medium">
                {stats.longest.title || "Untitled"} — {stats.longestWords} words
              </span>
              <span className="dj-faint text-[11.5px]">
                {humanDate(stats.longest.date)}
              </span>
            </span>
          </button>
        )}
        {stats.latest && (
          <div className="dj-panel dj-line dj-scroll flex w-full items-center gap-4 rounded-xl border p-4">
            <span className="dj-accent-soft dj-accent flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
              <Hourglass size={15} />
            </span>
            <span>
              <span className="dj-faint block text-[10.5px] tracking-widest uppercase">
                latest entry
              </span>
              <span className="dj-ink mt-0.5 block text-[13.5px] font-medium">
                {weekdayOf(stats.latest.date)}, {humanDate(stats.latest.date)}
              </span>
            </span>
          </div>
        )}
      </div>

      {stats.topTags.length > 0 && (
        <div className="mt-6">
          <p className="dj-faint mb-2.5 text-[10.5px] tracking-widest uppercase">
            most-used tags
          </p>
          <div className="flex flex-wrap gap-2">
            {stats.topTags.map(({ tag, count }) => (
              <span
                key={tag}
                className="dj-accent-soft dj-accent rounded-full px-3 py-1 text-[12px]"
              >
                #{tag}
                <span className="dj-faint ml-1.5">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="dj-panel dj-line rounded-xl border p-4">
      <Icon size={15} className="dj-accent mb-2" />
      <div className="dj-ink text-[22px] font-semibold leading-none">
        {value.toLocaleString()}
      </div>
      <div className="dj-faint mt-1.5 text-[10.5px] tracking-wider uppercase">
        {label}
      </div>
    </div>
  );
}
