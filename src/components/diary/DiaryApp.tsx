"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  Feather,
  Menu,
  PenLine,
  Search,
  SquareTerminal,
  X,
} from "lucide-react";
import { useDiary } from "@/lib/store";
import { EASTER_EGGS, parseCommand } from "@/lib/commands";
import { searchEntries } from "@/lib/search";
import { compareDateTimeDesc, humanDate, todayISO, weekdayOf, daysBetween, nowTime } from "@/lib/dates";
import { computeStats, wordCount } from "@/lib/stats";
import { Sidebar } from "./Sidebar";
import { Editor } from "./Editor";
import { StatsView } from "./StatsView";
import { SettingsView } from "./SettingsView";
import { HelpOverlay } from "./HelpOverlay";
import { ExportDialog } from "./ExportDialog";
import { KonamiBurst, MatrixRain, VoidOverlay } from "./Effects";
import type { DecryptedEntry } from "@/lib/types";
import { MOOD_COLORS } from "@/lib/types";

export function DiaryApp() {
  const entries = useDiary((s) => s.entries);
  const theme = useDiary((s) => s.theme);
  const selectedId = useDiary((s) => s.selectedId);
  const select = useDiary((s) => s.select);
  const diaryView = useDiary((s) => s.diaryView);
  const setDiaryView = useDiary((s) => s.setDiaryView);
  const searchQuery = useDiary((s) => s.searchQuery);
  const setSearchQuery = useDiary((s) => s.setSearchQuery);
  const panicLock = useDiary((s) => s.panicLock);
  const toast = useDiary((s) => s.toast);
  const setHelpOpen = useDiary((s) => s.setHelpOpen);
  const setExportOpen = useDiary((s) => s.setExportOpen);
  const ghostMode = useDiary((s) => s.ghostMode);
  const setGhostMode = useDiary((s) => s.setGhostMode);
  const effect = useDiary((s) => s.effect);
  const triggerEffect = useDiary((s) => s.triggerEffect);
  const memoryFlash = useDiary((s) => s.memoryFlash);
  const setMemoryFlash = useDiary((s) => s.setMemoryFlash);

  const [draftNew, setDraftNew] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [barValue, setBarValue] = useState("");
  const barRef = useRef<HTMLInputElement>(null);

  const sorted = useMemo(
    () => [...entries].sort(compareDateTimeDesc),
    [entries],
  );
  const results = useMemo(
    () => (searchQuery ? searchEntries(entries, searchQuery) : null),
    [entries, searchQuery],
  );
  const selected = useMemo(
    () => entries.find((e) => e.id === selectedId) ?? null,
    [entries, selectedId],
  );
  const stats = useMemo(() => computeStats(entries), [entries]);

  const clearEffect = () => triggerEffect(null);

  /* ---------------- effects timers ---------------- */
  useEffect(() => {
    if (effect === "forget") {
      const t = setTimeout(() => {
        clearEffect();
        toast("nothing was forgotten. everything is as it was.", "ghost");
      }, 1650);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effect]);

  useEffect(() => {
    if (memoryFlash) {
      const t = setTimeout(() => setMemoryFlash(false), 950);
      return () => clearTimeout(t);
    }
  }, [memoryFlash, setMemoryFlash]);

  /* ---------------- keyboard shortcuts ---------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        barRef.current?.focus();
        return;
      }
      if (e.altKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        newEntry();
        return;
      }
      if (e.key === "Escape") {
        const s = useDiary.getState();
        if (s.helpOpen) s.setHelpOpen(false);
        else if (s.exportOpen) s.setExportOpen(false);
        else {
          setDrawerOpen(false);
          setDraftNew(false);
          if (s.selectedId) s.select(null);
        }
        return;
      }
      if (e.key === "?" && !typing) {
        e.preventDefault();
        useDiary.getState().setHelpOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- actions ---------------- */
  const newEntry = () => {
    select(null);
    setDraftNew(true);
    setDiaryView("write");
    setDrawerOpen(false);
  };

  const openRandom = () => {
    if (entries.length === 0) {
      toast("the archive holds nothing yet — write first", "info");
      return;
    }
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    const pick = entries[buf[0] % entries.length];
    setDraftNew(false);
    select(pick.id);
    setMemoryFlash(true);
    toast("a memory resurfaces", "shuffle");
  };

  const openToday = () => {
    const today = todayISO();
    const todays = entries
      .filter((e) => e.date === today)
      .sort(compareDateTimeDesc);
    if (todays.length === 0) {
      toast("nothing written today — yet", "info");
      return;
    }
    setDraftNew(false);
    select(todays[0].id);
  };

  const openEdge = (which: "oldest" | "latest") => {
    if (sorted.length === 0) {
      toast("no entries yet", "info");
      return;
    }
    setDraftNew(false);
    select(which === "oldest" ? sorted[sorted.length - 1].id : sorted[0].id);
  };

  const runCommand = (raw: string) => {
    const cmd = parseCommand(raw);
    if (!cmd) return false;
    switch (cmd.name) {
      case "":
        return true;
      case "lock":
        panicLock();
        return true;
      case "random":
        openRandom();
        return true;
      case "today":
        openToday();
        return true;
      case "oldest":
        openEdge("oldest");
        return true;
      case "latest":
        openEdge("latest");
        return true;
      case "stats":
        setDraftNew(false);
        select(null);
        setDiaryView("stats");
        return true;
      case "settings":
        setDraftNew(false);
        select(null);
        setDiaryView("settings");
        return true;
      case "search":
        if (cmd.args) setSearchQuery(cmd.args);
        setTimeout(() => barRef.current?.focus(), 30);
        return true;
      case "export":
        setExportOpen(true);
        return true;
      case "help":
        setHelpOpen(true);
        return true;
      case "new":
        newEntry();
        return true;
      case "unlock":
        toast("the diary is already open", "info");
        return true;
      case "void":
        triggerEffect("void");
        return true;
      case "ghost":
        setGhostMode(!ghostMode);
        toast(
          ghostMode ? "the diary solidifies" : EASTER_EGGS.ghost,
          "ghost",
        );
        return true;
      case "matrix":
        triggerEffect("matrix");
        return true;
      case "forget":
        triggerEffect("forget");
        return true;
      case "coffee":
      case "42":
      case "hello":
        toast(EASTER_EGGS[cmd.name], "sparkles");
        return true;
      default:
        toast(`unrecognized directive — try :help`, "terminal");
        return true;
    }
  };

  const submitBar = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = barValue;
    if (raw.trim().startsWith(":")) {
      setBarValue("");
      barRef.current?.blur();
      runCommand(raw);
      return;
    }
    setSearchQuery(raw);
    if (selected) select(null);
    setDraftNew(false);
  };

  const showEditor = diaryView === "write" && (selected || draftNew);
  const showResults =
    diaryView === "write" && !selected && !draftNew && results !== null;
  const showOverview =
    diaryView === "write" && !selected && !draftNew && results === null;

  /* ---------------- render ---------------- */
  return (
    <div
      className={`diary-root ${theme} ${ghostMode ? "ghost" : ""} ${
        effect === "forget" ? "forget-glitch" : ""
      } flex h-screen flex-col overflow-hidden`}
    >
      {/* top bar */}
      <header className="dj-panel dj-line flex shrink-0 items-center gap-2 border-b px-3 py-2.5 sm:px-4">
        <button
          onClick={() => setDrawerOpen(true)}
          className="dj-faint rounded-lg p-2 transition-colors hover:dj-panel2 hover:dj-dim lg:hidden"
          aria-label="open navigation"
        >
          <Menu size={17} />
        </button>

        <div className="dj-faint hidden min-w-0 flex-1 items-center gap-2 truncate text-[12px] sm:flex">
          {selected ? (
            <>
              <button
                onClick={() => {
                  select(null);
                  setDraftNew(false);
                }}
                className="dj-faint -ml-1 rounded-md p-1 transition-colors hover:dj-panel2 hover:dj-dim"
                aria-label="back to overview"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="truncate">
                {weekdayOf(selected.date)}, {humanDate(selected.date)} ·{" "}
                {selected.time}
              </span>
            </>
          ) : draftNew ? (
            <span>{weekdayOf(todayISO())}, {humanDate(todayISO())} — new entry</span>
          ) : diaryView === "stats" ? (
            <span>Statistics</span>
          ) : diaryView === "settings" ? (
            <span>Settings</span>
          ) : (
            <span>
              {entries.length} {entries.length === 1 ? "entry" : "entries"} ·{" "}
              {stats.totalWords.toLocaleString()} words
            </span>
          )}
        </div>

        {/* command / search bar */}
        <form
          onSubmit={submitBar}
          className="dj-bg-soft dj-line mx-auto flex w-full max-w-md flex-1 items-center gap-2 rounded-full border px-3.5 py-1.5 transition-colors focus-within:border-[var(--accent)] sm:flex-none"
        >
          {barValue.trim().startsWith(":") ? (
            <SquareTerminal size={13} className="dj-accent shrink-0" />
          ) : (
            <Search size={13} className="dj-faint shrink-0" />
          )}
          <input
            ref={barRef}
            value={barValue}
            onChange={(e) => {
              setBarValue(e.target.value);
              if (!e.target.value.trim().startsWith(":")) {
                setSearchQuery(e.target.value);
              }
            }}
            placeholder="Search, or :command — :help"
            aria-label="search or command"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="dj-ink journal-placeholder w-full bg-transparent text-[13px] outline-none"
          />
          {(searchQuery || barValue) && (
            <button
              type="button"
              onClick={() => {
                setBarValue("");
                setSearchQuery("");
                barRef.current?.focus();
              }}
              className="dj-faint transition-colors hover:dj-dim"
              aria-label="clear"
            >
              <X size={13} />
            </button>
          )}
          <kbd className="dj-faint hidden font-mono text-[9.5px] md:inline">
            ⌃K
          </kbd>
        </form>

        <div className="flex flex-1 items-center justify-end gap-1">
          <button
            onClick={newEntry}
            className="dj-accent-soft dj-accent flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-all hover:brightness-110"
          >
            <PenLine size={13} />
            <span className="hidden sm:inline">Write</span>
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* desktop sidebar */}
        <aside className="dj-panel dj-line hidden w-72 shrink-0 border-r lg:block">
          <Sidebar />
        </aside>

        {/* mobile drawer */}
        {drawerOpen && (
          <div
            className="fixed inset-0 z-[65] bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setDrawerOpen(false)}
          >
            <div
              className="dj-panel h-full w-72 max-w-[85vw] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Sidebar onNavigate={() => setDrawerOpen(false)} />
            </div>
          </div>
        )}

        {/* main area */}
        <main className="dj-bg min-w-0 flex-1 overflow-y-auto dj-scroll">
          {showEditor && (
            <Editor
              key={selected?.id ?? "new"}
              entry={selected ?? undefined}
              flash={memoryFlash}
              onSaved={(id) => {
                setDraftNew(false);
                select(id);
              }}
              onDeleted={() => select(null)}
            />
          )}

          {showResults && (
            <ResultsPanel
              results={results!}
              query={searchQuery}
              onOpen={(id) => select(id)}
              onClear={() => {
                setSearchQuery("");
                setBarValue("");
              }}
            />
          )}

          {showOverview && (
            <Overview
              sorted={sorted}
              stats={stats}
              onOpen={(id) => select(id)}
              onWrite={newEntry}
            />
          )}

          {diaryView === "stats" && <StatsView />}
          {diaryView === "settings" && <SettingsView />}
        </main>
      </div>

      {/* overlays & effects */}
      <HelpOverlay />
      <ExportDialog />
      {effect === "matrix" && <MatrixRain done={clearEffect} />}
      {effect === "void" && (
        <VoidOverlay line={EASTER_EGGS.void} done={clearEffect} />
      )}
      {effect === "konami" && <KonamiBurst done={clearEffect} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ResultsPanel({
  results,
  query,
  onOpen,
  onClear,
}: {
  results: DecryptedEntry[];
  query: string;
  onOpen: (id: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-8">
      <div className="mb-5 flex items-center gap-3">
        <p className="dj-dim text-[13px]">
          {results.length} {results.length === 1 ? "result" : "results"} for{" "}
          <span className="dj-accent">“{query.trim()}”</span>
        </p>
        <button
          onClick={onClear}
          className="dj-faint dj-line ml-auto rounded-full border px-3 py-1 text-[11px] transition-colors hover:dj-dim"
        >
          clear
        </button>
      </div>
      {results.length === 0 && (
        <p className="dj-faint py-10 text-center text-[13px] leading-relaxed">
          Nothing in the diary matches that.
          <br />
          Titles, words, tags, moods, months and years are all searchable.
        </p>
      )}
      <div className="space-y-2">
        {results.map((e) => (
          <EntryRow key={e.id} entry={e} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

function EntryRow({
  entry,
  onOpen,
}: {
  entry: DecryptedEntry;
  onOpen: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onOpen(entry.id)}
      className="dj-panel dj-line group flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors hover:border-[var(--accent)]"
    >
      <div className="dj-faint w-12 shrink-0 text-center">
        <div className="dj-ink font-journal text-[19px] font-semibold leading-none">
          {entry.date.slice(8, 10)}
        </div>
        <div className="mt-1 text-[9.5px] tracking-widest uppercase">
          {entry.date.slice(5, 7)}/{entry.date.slice(0, 4)}
        </div>
      </div>
      <div className="dj-line min-w-0 flex-1 border-l pl-4">
        <div className="dj-ink flex items-center gap-2 text-[13.5px] font-medium">
          <span className="truncate">{entry.title || "Untitled"}</span>
          {entry.starred && <span className="dj-accent shrink-0">★</span>}
        </div>
        <div className="dj-faint mt-0.5 truncate text-[12px]">
          {entry.content.replace(/\n+/g, " ").slice(0, 90) || "…"}
        </div>
        <div className="dj-faint mt-1 flex items-center gap-2 text-[10.5px]">
          <span>
            {wordCount(entry.content)} words · {entry.time}
          </span>
          {entry.mood && MOOD_COLORS[entry.mood] && (
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: MOOD_COLORS[entry.mood] }}
            />
          )}
          {entry.tags.slice(0, 4).map((t) => (
            <span key={t} className="dj-accent">
              #{t}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

function Overview({
  sorted,
  stats,
  onOpen,
  onWrite,
}: {
  sorted: DecryptedEntry[];
  stats: ReturnType<typeof computeStats>;
  onOpen: (id: string) => void;
  onWrite: () => void;
}) {
  const hour = new Date().getHours();
  const greeting =
    hour < 5
      ? "the small hours"
      : hour < 12
        ? "good morning"
        : hour < 18
          ? "good afternoon"
          : "good evening";

  const last = sorted[0] ?? null;
  const gap = last ? daysBetween(last.date, todayISO()) : null;

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-8">
      <p className="dj-faint text-[11px] tracking-[0.25em] uppercase">
        {weekdayOf(todayISO())} · {humanDate(todayISO())} · {nowTime()}
      </p>
      <h1 className="dj-ink mt-2 font-journal text-[26px] font-semibold leading-snug sm:text-[30px]">
        {greeting}.
      </h1>
      <p className="dj-dim mt-1 text-[13px]">
        {last
          ? gap === 0
            ? "You already wrote today. The streak breathes."
            : gap === 1
              ? "Your last entry was yesterday."
              : `Your last entry was ${gap} days ago.`
          : "This diary is waiting for its first entry."}
      </p>

      <button
        onClick={onWrite}
        className="dj-accent-soft dj-line dj-accent mt-6 flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all hover:brightness-110"
      >
        <Feather size={17} />
        <span>
          <span className="block text-[13.5px] font-medium">
            Write today's entry
          </span>
          <span className="dj-faint text-[11.5px]">
            encrypted in this browser before it ever leaves
          </span>
        </span>
      </button>

      {sorted.length > 0 && (
        <>
          <div className="mt-8 flex items-center justify-between">
            <p className="dj-faint text-[10.5px] tracking-widest uppercase">
              recent entries
            </p>
            <p className="dj-faint font-mono text-[10px]">
              streak {stats.streak}d · {stats.activeDays} active days
            </p>
          </div>
          <div className="mt-3 space-y-2">
            {sorted.slice(0, 5).map((e) => (
              <EntryRow key={e.id} entry={e} onOpen={onOpen} />
            ))}
          </div>
        </>
      )}

      <p className="dj-faint mt-10 text-center font-mono text-[10px]">
        :help for commands · ⌃⇧L seals instantly
      </p>
    </div>
  );
}
