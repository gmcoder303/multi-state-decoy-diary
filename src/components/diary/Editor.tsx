"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CloudUpload,
  Loader2,
  Star,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useDiary } from "@/lib/store";
import type { DecryptedEntry, EntryPayload } from "@/lib/types";
import { MOODS, MOOD_COLORS } from "@/lib/types";
import { humanDate, nowTime, todayISO, weekdayOf } from "@/lib/dates";
import { wordCount } from "@/lib/stats";

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export function Editor({
  entry,
  onSaved,
  onDeleted,
  flash,
}: {
  entry?: DecryptedEntry;
  onSaved: (id: string) => void;
  onDeleted: () => void;
  flash: boolean;
}) {
  const saveEntry = useDiary((s) => s.saveEntry);
  const deleteEntry = useDiary((s) => s.deleteEntry);
  const toast = useDiary((s) => s.toast);
  const theme = useDiary((s) => s.theme);

  const [title, setTitle] = useState(entry?.title ?? "");
  const [content, setContent] = useState(entry?.content ?? "");
  const [date, setDate] = useState(entry?.date ?? todayISO());
  const [time, setTime] = useState(entry?.time ?? nowTime());
  const [tags, setTags] = useState<string[]>(entry?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [mood, setMood] = useState(entry?.mood ?? "");
  const [starred, setStarred] = useState(entry?.starred ?? false);
  const [clue, setClue] = useState(entry?.clue ?? "");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [confirmDel, setConfirmDel] = useState(false);

  const contentRef = useRef<HTMLTextAreaElement>(null);
  const firstRender = useRef(true);
  const payload = useMemo<EntryPayload>(
    () => ({ title, content, date, time, tags, mood, starred }),
    [title, content, date, time, tags, mood, starred],
  );
  const payloadRef = useRef(payload);
  payloadRef.current = payload;
  const clueRef = useRef(clue);
  clueRef.current = clue;

  const isNew = !entry;
  const words = wordCount(content);

  const autosize = useCallback(() => {
    const ta = contentRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.max(ta.scrollHeight, 320) + "px";
  }, []);
  useEffect(() => {
    autosize();
  }, [content, autosize]);

  const doSave = useCallback(
    async (quiet = false) => {
      const p = payloadRef.current;
      if (!p.title.trim() && !p.content.trim()) {
        if (isNew) return;
      }
      setSaveState("saving");
      try {
        const saved = await saveEntry(p, clueRef.current, entry?.id);
        setSaveState("saved");
        if (!quiet) toast("entry sealed & synced", "check");
        if (isNew) onSaved(saved.id);
        window.setTimeout(() => {
          setSaveState((s) => (s === "saved" ? "idle" : s));
        }, 2000);
      } catch {
        setSaveState("error");
        if (!quiet) toast("sync fault — retrying is safe", "info");
      }
    },
    [entry?.id, isNew, onSaved, saveEntry, toast],
  );
  const doSaveRef = useRef(doSave);
  doSaveRef.current = doSave;

  // mark dirty on edits
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setSaveState((s) => (s === "saving" ? s : "dirty"));
  }, [payload, clue]);

  // autosave existing entries after a pause
  useEffect(() => {
    if (isNew) return;
    if (saveState !== "dirty") return;
    const t = setTimeout(() => void doSaveRef.current(true), 1600);
    return () => clearTimeout(t);
  }, [saveState, isNew, payload, clue]);

  // Ctrl/Cmd+S
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void doSaveRef.current(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, "").toLowerCase();
    if (t && !tags.includes(t) && tags.length < 12) setTags([...tags, t]);
    setTagInput("");
  };

  const remove = async () => {
    if (!entry) return;
    if (!confirmDel) {
      setConfirmDel(true);
      setTimeout(() => setConfirmDel(false), 3500);
      return;
    }
    try {
      await deleteEntry(entry.id);
      toast("entry destroyed", "trash");
      onDeleted();
    } catch {
      toast("deletion fault — entry intact", "info");
    }
  };

  return (
    <div
      className={`mx-auto w-full max-w-2xl px-5 py-8 sm:px-8 ${
        flash ? "memory-flash" : ""
      }`}
    >
      {/* metadata strip */}
      <div
        className="dj-faint mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11.5px]"
        style={{ colorScheme: theme }}
      >
        <input
          type="date"
          value={date}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="dj-panel2 dj-line dj-dim rounded-md border px-2 py-1 text-[11.5px] outline-none focus:border-[var(--accent)]"
          aria-label="entry date"
        />
        <input
          type="time"
          value={time}
          onChange={(e) => e.target.value && setTime(e.target.value)}
          className="dj-panel2 dj-line dj-dim rounded-md border px-2 py-1 text-[11.5px] outline-none focus:border-[var(--accent)]"
          aria-label="entry time"
        />
        <span className="hidden sm:inline">
          {weekdayOf(date)} · {humanDate(date)}
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <SaveIndicator state={saveState} />
        </span>
      </div>

      {/* title + star */}
      <div className="mb-1 flex items-start gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled"
          aria-label="entry title"
          className="dj-ink journal-placeholder w-full bg-transparent font-journal text-[26px] font-semibold leading-snug outline-none sm:text-[30px]"
        />
        <button
          onClick={() => setStarred(!starred)}
          aria-label="toggle importance"
          title={starred ? "important" : "mark important"}
          className={`mt-2 shrink-0 rounded-full p-1.5 transition-colors ${
            starred ? "text-amber-400" : "dj-faint hover:dj-dim"
          }`}
        >
          <Star size={18} className={starred ? "fill-amber-400" : ""} />
        </button>
      </div>

      {/* content */}
      <textarea
        ref={contentRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Begin writing…"
        aria-label="entry content"
        className="entry-content-editor dj-ink journal-placeholder mt-2 w-full resize-none bg-transparent outline-none"
        autoFocus={isNew}
      />

      {/* footer metadata */}
      <div className="dj-line mt-8 space-y-4 border-t pt-5">
        {/* mood */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="dj-faint mr-1 text-[10.5px] tracking-widest uppercase">
            mood
          </span>
          {MOODS.map((m) => (
            <button
              key={m}
              onClick={() => setMood(mood === m ? "" : m)}
              title={m}
              aria-label={`mood ${m}`}
              className={`h-5 w-5 rounded-full transition-all ${
                mood === m ? "ring-2 ring-offset-2 ring-[var(--accent)] scale-110" : "opacity-40 hover:opacity-90"
              }`}
              style={{
                background: MOOD_COLORS[m],
                ["--tw-ring-offset-color" as string]: "var(--bg)",
              }}
            />
          ))}
          {mood && (
            <span className="dj-faint ml-1 text-[11px] italic">{mood}</span>
          )}
        </div>

        {/* tags */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Tag size={12} className="dj-faint" />
          {tags.map((t) => (
            <span
              key={t}
              className="dj-accent-soft dj-accent flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px]"
            >
              #{t}
              <button
                onClick={() => setTags(tags.filter((x) => x !== t))}
                aria-label={`remove tag ${t}`}
                className="opacity-60 hover:opacity-100"
              >
                <X size={10} />
              </button>
            </span>
          ))}
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag();
              }
            }}
            onBlur={addTag}
            placeholder="add tag…"
            aria-label="add tag"
            className="dj-dim journal-placeholder w-24 bg-transparent px-1 py-0.5 text-[12px] outline-none"
          />
        </div>

        {/* archive clue */}
        <div>
          <input
            value={clue}
            onChange={(e) => setClue(e.target.value.slice(0, 300))}
            placeholder="archive hint — a fragment visible on the corrupted archive (optional)"
            aria-label="archive hint"
            className="dj-faint journal-placeholder w-full bg-transparent text-[12px] italic outline-none focus:dj-dim"
          />
          <p className="dj-faint mt-1 text-[10px] leading-relaxed">
            Hints appear beside this entry&apos;s corrupted record in the
            archive — write something only you would understand. Never the keys
            themselves.
          </p>
        </div>

        {/* actions */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={() => void doSave(false)}
            disabled={saveState === "saving"}
            className="dj-accent-bg flex items-center gap-2 rounded-full px-5 py-2 text-[12.5px] font-medium text-[#141210] transition-all hover:brightness-110 disabled:opacity-50"
          >
            {saveState === "saving" ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Check size={13} />
            )}
            {isNew ? "Seal entry" : "Save"}
          </button>
          <span className="dj-faint text-[11.5px]">
            {words} {words === 1 ? "word" : "words"}
          </span>
          {entry && (
            <button
              onClick={() => void remove()}
              className={`ml-auto flex items-center gap-1.5 rounded-full px-3 py-2 text-[11.5px] transition-colors ${
                confirmDel
                  ? "bg-[var(--danger)] text-white"
                  : "dj-faint hover:text-[var(--danger)]"
              }`}
            >
              <Trash2 size={13} />
              {confirmDel ? "confirm — permanent" : "delete"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "saving")
    return (
      <span className="flex items-center gap-1.5">
        <Loader2 size={11} className="animate-spin" /> encrypting…
      </span>
    );
  if (state === "saved")
    return (
      <span className="flex items-center gap-1.5 text-emerald-500">
        <Check size={11} /> sealed
      </span>
    );
  if (state === "dirty")
    return (
      <span className="flex items-center gap-1.5">
        <CloudUpload size={11} /> unsaved
      </span>
    );
  if (state === "error")
    return <span className="text-[var(--danger)]">sync fault</span>;
  return null;
}
