"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronRight, Feather, Plus, Search, Trash2 } from "lucide-react";
import { useDiary } from "@/lib/store";
import { parseCommand } from "@/lib/commands";

interface DecoyEntry {
  id: string;
  title: string;
  content: string;
  date: string;
}

const STORE_KEY = "diary.entries.v1";

/**
 * DIARY 2 — the decoy. Reached when ANY auth factor is wrong.
 * Deliberately ordinary: a friendly, empty, fully functional diary whose
 * entries live in plain local storage. The intruder believes they got in.
 */
export function DecoyDiary() {
  const beginGateway = useDiary((s) => s.beginGateway);
  const panicLock = useDiary((s) => s.panicLock);

  const [entries, setEntries] = useState<DecoyEntry[]>([]);
  const [draft, setDraft] = useState<DecoyEntry | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORE_KEY);
      if (raw) setEntries(JSON.parse(raw) as DecoyEntry[]);
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (next: DecoyEntry[]) => {
    setEntries(next);
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.title.toLowerCase().includes(q) || e.content.toLowerCase().includes(q),
    );
  }, [entries, query]);

  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const cmd = parseCommand(query);
    if (!cmd) return;
    setQuery("");
    if (cmd.name === "unlock") beginGateway();
    else if (cmd.name === "lock") panicLock();
  };

  const saveDraft = () => {
    if (!draft) return;
    if (!draft.title.trim() && !draft.content.trim()) {
      setDraft(null);
      return;
    }
    const existing = entries.find((e) => e.id === draft.id);
    const next = existing
      ? entries.map((e) => (e.id === draft.id ? draft : e))
      : [draft, ...entries];
    persist(next);
    setDraft(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500 text-white shadow-sm">
            <BookOpen size={17} />
          </span>
          <div>
            <h1 className="text-[17px] font-semibold leading-tight">My Diary</h1>
            <p className="text-[11px] text-slate-400">your private space</p>
          </div>
          <div className="ml-auto w-full max-w-44 sm:max-w-56">
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              <Search size={13} className="text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onSearchKey}
                placeholder="Search…"
                className="w-full bg-transparent text-[13px] outline-none placeholder:text-slate-400"
                aria-label="search entries"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {draft ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Entry title"
              className="mb-3 w-full border-b border-slate-100 pb-2 text-lg font-medium outline-none placeholder:text-slate-300"
              autoFocus
            />
            <textarea
              value={draft.content}
              onChange={(e) => setDraft({ ...draft, content: e.target.value })}
              placeholder="Write about your day…"
              rows={9}
              className="w-full resize-y rounded-lg bg-slate-50 p-3 text-[14px] leading-relaxed outline-none placeholder:text-slate-300"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setDraft(null)}
                className="rounded-full px-4 py-2 text-[13px] text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={saveDraft}
                className="rounded-full bg-sky-500 px-5 py-2 text-[13px] font-medium text-white shadow-sm hover:bg-sky-600"
              >
                Save entry
              </button>
            </div>
          </div>
        ) : entries.length === 0 ? (
          <div className="mt-10 text-center">
            <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-sky-400 shadow-sm">
              <Feather size={26} />
            </span>
            <h2 className="text-xl font-semibold">No entries yet</h2>
            <p className="mx-auto mt-2 max-w-xs text-[13.5px] leading-relaxed text-slate-400">
              Your diary is empty. Capture your first thought — it only takes a
              moment.
            </p>
            <button
              onClick={() =>
                setDraft({
                  id: Math.random().toString(36).slice(2),
                  title: "",
                  content: "",
                  date: new Date().toISOString().slice(0, 10),
                })
              }
              className="mx-auto mt-6 flex items-center gap-2 rounded-full bg-sky-500 px-6 py-2.5 text-[14px] font-medium text-white shadow transition-colors hover:bg-sky-600"
            >
              <Plus size={15} /> Create your first entry
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() =>
                setDraft({
                  id: Math.random().toString(36).slice(2),
                  title: "",
                  content: "",
                  date: new Date().toISOString().slice(0, 10),
                })
              }
              className="mb-4 flex items-center gap-2 rounded-full bg-sky-500 px-5 py-2 text-[13px] font-medium text-white shadow-sm hover:bg-sky-600"
            >
              <Plus size={14} /> New entry
            </button>
            <div className="space-y-3">
              {visible.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setDraft(e)}
                  className="group flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14.5px] font-medium">
                      {e.title || "Untitled"}
                    </div>
                    <div className="mt-0.5 truncate text-[12.5px] text-slate-400">
                      {e.content || "…"} · {e.date}
                    </div>
                  </div>
                  <span
                    onClick={(ev) => {
                      ev.stopPropagation();
                      persist(entries.filter((x) => x.id !== e.id));
                    }}
                    className="rounded-full p-2 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
                    aria-label="delete"
                  >
                    <Trash2 size={15} />
                  </span>
                  <ChevronRight size={15} className="text-slate-300" />
                </button>
              ))}
              {visible.length === 0 && (
                <p className="py-8 text-center text-[13px] text-slate-400">
                  Nothing matches that search.
                </p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
