"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  BookLock,
  ChevronDown,
  ChevronRight,
  FileText,
  HelpCircle,
  Moon,
  Settings,
  Star,
  Sun,
} from "lucide-react";
import { useDiary } from "@/lib/store";
import { buildTree } from "@/lib/tree";
import { todayISO } from "@/lib/dates";
import { MOOD_COLORS } from "@/lib/types";

const DAY_PAD = (d: number) => String(d).padStart(2, "0");

/** Diary 3 sidebar — brand, hierarchical tree, discreet lock control. */
export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const entries = useDiary((s) => s.entries);
  const selectedId = useDiary((s) => s.selectedId);
  const select = useDiary((s) => s.select);
  const panicLock = useDiary((s) => s.panicLock);
  const setDiaryView = useDiary((s) => s.setDiaryView);
  const diaryView = useDiary((s) => s.diaryView);
  const theme = useDiary((s) => s.theme);
  const setTheme = useDiary((s) => s.setTheme);
  const setHelpOpen = useDiary((s) => s.setHelpOpen);

  const tree = useMemo(() => buildTree(entries), [entries]);
  const today = todayISO();

  const [closedYears, setClosedYears] = useState<Set<number>>(new Set());
  const [closedMonths, setClosedMonths] = useState<Set<string>>(new Set());
  const [closedDays, setClosedDays] = useState<Set<string>>(new Set());

  const toggle = <T,>(set: Set<T>, v: T, apply: (s: Set<T>) => void) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    apply(next);
  };

  const openEntry = (id: string) => {
    select(id);
    onNavigate?.();
  };

  const goView = (v: "write" | "stats" | "settings") => {
    setDiaryView(v);
    onNavigate?.();
  };

  return (
    <div className="flex h-full flex-col">
      {/* brand */}
      <div className="dj-line flex items-center gap-2.5 border-b px-4 py-4">
        <span className="dj-accent-soft dj-accent flex h-8 w-8 items-center justify-center rounded-lg">
          <BookLock size={15} />
        </span>
        <div>
          <div className="dj-ink text-[14px] font-semibold tracking-wide">
            Stillwater
          </div>
          <div className="dj-faint text-[10px] tracking-[0.2em] uppercase">
            private journal
          </div>
        </div>
      </div>

      {/* quick nav */}
      <div className="dj-line flex gap-1 border-b px-3 py-2.5">
        <NavBtn
          icon={BarChart3}
          label="Stats"
          active={diaryView === "stats"}
          onClick={() => goView("stats")}
        />
        <NavBtn
          icon={Settings}
          label="Settings"
          active={diaryView === "settings"}
          onClick={() => goView("settings")}
        />
        <NavBtn
          icon={theme === "dark" ? Sun : Moon}
          label={theme === "dark" ? "Light" : "Dark"}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        />
        <NavBtn icon={HelpCircle} label="Help" onClick={() => setHelpOpen(true)} />
      </div>

      {/* hierarchical tree */}
      <div className="dj-scroll flex-1 overflow-y-auto px-2 py-3">
        {tree.length === 0 && (
          <p className="dj-faint px-2 py-6 text-center text-[12px] leading-relaxed">
            No entries yet.
            <br />
            Write the first one.
          </p>
        )}
        {tree.map((year) => {
          const yearClosed = closedYears.has(year.year);
          return (
            <div key={year.year}>
              <button
                onClick={() => toggle(closedYears, year.year, setClosedYears)}
                className="dj-dim hover:dj-ink flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-[12.5px] font-semibold transition-colors"
              >
                {yearClosed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                {year.year}
                <span className="dj-faint ml-auto text-[10.5px] font-normal">
                  {year.count}
                </span>
              </button>
              {!yearClosed &&
                year.months.map((month) => {
                  const mKey = `${year.year}-${month.month}`;
                  const monthClosed = closedMonths.has(mKey);
                  return (
                    <div key={mKey} className="ml-2.5">
                      <button
                        onClick={() =>
                          toggle(closedMonths, mKey, setClosedMonths)
                        }
                        className="dj-dim hover:dj-ink flex w-full items-center gap-1 rounded-md px-2 py-1 text-[12px] transition-colors"
                      >
                        {monthClosed ? (
                          <ChevronRight size={11} />
                        ) : (
                          <ChevronDown size={11} />
                        )}
                        {month.label}
                        <span className="dj-faint ml-auto text-[10px]">
                          {month.count}
                        </span>
                      </button>
                      {!monthClosed &&
                        month.days.map((day) => {
                          const dKey = day.dateISO;
                          const dayClosed = closedDays.has(dKey);
                          const isToday = dKey === today;
                          return (
                            <div key={dKey} className="ml-3">
                              <button
                                onClick={() =>
                                  toggle(closedDays, dKey, setClosedDays)
                                }
                                className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] transition-colors ${
                                  isToday
                                    ? "dj-accent font-medium"
                                    : "dj-dim hover:dj-ink"
                                }`}
                              >
                                {dayClosed ? (
                                  <ChevronRight size={10} />
                                ) : (
                                  <ChevronDown size={10} />
                                )}
                                {DAY_PAD(day.day)}
                                {isToday && (
                                  <span className="dj-faint text-[9px] tracking-widest uppercase">
                                    today
                                  </span>
                                )}
                              </button>
                              {!dayClosed &&
                                day.entries.map((e) => (
                                  <button
                                    key={e.id}
                                    onClick={() => openEntry(e.id)}
                                    className={`ml-3 flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[12px] transition-colors ${
                                      selectedId === e.id
                                        ? "dj-accent-soft dj-accent font-medium"
                                        : "dj-dim hover:dj-panel2 hover:dj-ink"
                                    }`}
                                  >
                                    <FileText size={11} className="shrink-0 opacity-60" />
                                    <span className="min-w-0 flex-1 truncate">
                                      {e.title || "Untitled"}
                                    </span>
                                    {e.starred && (
                                      <Star
                                        size={10}
                                        className="shrink-0 fill-amber-400 text-amber-400"
                                      />
                                    )}
                                    {e.mood && MOOD_COLORS[e.mood] && (
                                      <span
                                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                                        style={{ background: MOOD_COLORS[e.mood] }}
                                        title={e.mood}
                                      />
                                    )}
                                  </button>
                                ))}
                            </div>
                          );
                        })}
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>

      {/* footer — the discreet lock control */}
      <div className="dj-line flex items-center justify-between border-t px-4 py-3">
        <span className="dj-faint font-mono text-[9px] tracking-[0.25em]">
          E2E · AES-256-GCM
        </span>
        <button
          onClick={panicLock}
          title="seal"
          aria-label="seal the diary"
          className="group flex items-center gap-2"
        >
          <span className="dj-faint hidden text-[9.5px] tracking-widest group-hover:dj-dim sm:inline">
            ⌃⇧L
          </span>
          <span className="h-2 w-2 rounded-full bg-emerald-600/70 transition-colors group-hover:bg-[var(--danger)]" />
        </button>
      </div>
    </div>
  );
}

function NavBtn({
  icon: Icon,
  label,
  onClick,
  active,
}: {
  icon: typeof Sun;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] transition-colors ${
        active ? "dj-accent-soft dj-accent" : "dj-faint hover:dj-panel2 hover:dj-dim"
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}
