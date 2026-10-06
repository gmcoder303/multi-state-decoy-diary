"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  FileX2,
  HardDrive,
  Search,
  Skull,
  TerminalSquare,
  XOctagon,
} from "lucide-react";
import { useDiary } from "@/lib/store";
import { parseCommand } from "@/lib/commands";
import {
  corruptRecord,
  corruptedStamp,
  glitchWord,
  sectorLabel,
} from "@/lib/corrupt";

const BOOT_LINES = [
  "[ 0.0013] archive7: kernel snapshot recovered (partial)",
  "[ 0.0219] mount: /sectors/node09 — 0x3D1 blocks unrecoverable",
  "[ 0.0422] indexd: checksum mismatch — attempting soft rebuild",
  "[ 0.0901] WARN: glyph table spill at 0x00F3; continuing degraded",
  "[ 0.9977] console: interactive shell attached (read-only?)",
];

const TICKER =
  "SECTOR 7G UNREADABLE ░░ INDEX REBUILD STALLED AT 47% ░░ NODE09 HEARTBEAT LOST ░░ crc fail crc fail crc fail ░░ QUERY DAEMON: zombie ░░ allocation table: 61% hypothetical ░░ do not power off ░░ do not power on ░░ ";

interface LogLine {
  id: number;
  text: string;
  tone: "dim" | "amber" | "red";
}

let logId = 0;

export function CorruptedArchive() {
  const archiveRows = useDiary((s) => s.archiveRows);
  const beginGateway = useDiary((s) => s.beginGateway);
  const toast = useDiary((s) => s.toast);

  const [query, setQuery] = useState("");
  const [log, setLog] = useState<LogLine[]>([]);
  const [bootShown, setBootShown] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setInterval(
      () => setBootShown((n) => Math.min(n + 1, BOOT_LINES.length)),
      300,
    );
    return () => clearInterval(t);
  }, []);

  const pushLog = (text: string, tone: LogLine["tone"] = "dim") =>
    setLog((l) => [...l.slice(-14), { id: ++logId, text, tone }]);

  const records = useMemo(
    () =>
      archiveRows.map((row) => ({
        row,
        sector: sectorLabel(row.id),
        stamp: corruptedStamp(row.createdAt, row.id),
        corrupt: corruptRecord(row.ciphertext, row.id),
      })),
    [archiveRows],
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = query.trim();
    setQuery("");
    if (!raw) return;

    const cmd = parseCommand(raw);
    if (cmd) {
      if (cmd.name === "unlock") {
        pushLog("> command accepted", "amber");
        beginGateway();
      } else if (cmd.name === "help") {
        pushLog("> parsing…", "dim");
        pushLog("▓▒░ USAGE: [REDACTED] ░▒▓", "amber");
        pushLog("most commands were lost with sector 7G", "dim");
      } else {
        pushLog(`> ${raw}`, "dim");
        pushLog("SYNTAX ERR 0x0C :: unknown directive", "red");
      }
      return;
    }

    pushLog(`> ${raw}`, "dim");
    const replies = [
      "QUERY RETURNED 0 SECTORS :: index unreadable",
      "SEARCH DAEMON NOT RESPONDING (dead since 09:41)",
      "MATCH BUFFER OVERRUN :: results discarded",
      "0x0 RECORDS FOUND :: allocation fault",
    ];
    pushLog(replies[raw.length % replies.length], "red");
    inputRef.current?.focus();
  };

  const fakeNav = (label: string) => {
    pushLog(`> open ${label}`, "dim");
    pushLog(`403 FORBIDDEN :: ${glitchWord(label, "nav")} refused the request`, "red");
    toast("RESOURCE UNAVAILABLE", "terminal");
  };

  return (
    <div className="archive-root scanlines crt-flicker min-h-screen">
      {/* top status strip */}
      <div className="flex items-center justify-between border-b border-[#202724] bg-[#0d100e]/80 px-3 py-1.5 text-[10px] tracking-widest text-[#5f6b66] sm:px-5">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#ff5f56] flicker-dim" />
            NODE09
          </span>
          <span className="hidden sm:inline">UPS: NONE</span>
          <span className="hidden md:inline">MEM: 611MB / ???</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[#ffb648] text-glow-amber glitch-jump inline-block">
            REBUILDING INDEX… 47%
          </span>
          <span className="hidden sm:inline">UTC+??</span>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-3 pb-28 pt-6 sm:px-5">
        {/* brand */}
        <header className="mb-5">
          <h1 className="text-lg font-bold tracking-[0.2em] text-[#a8b5ae] sm:text-xl">
            <span className="glitch-jump inline-block">
              A̶R̸C̷H̴I̵V̶E̷_̸7̵
            </span>{" "}
            <span className="text-[#3f4a45]">// sys.console</span>
          </h1>
          <p className="mt-1 text-[11px] text-[#5f6b66]">
            mounted read-only · integrity <span className="text-[#ff5f56]">COMPROMISED</span> ·{" "}
            <span className="line-through">diary</span> subsystem offline
          </p>
        </header>

        {/* boot log */}
        <div className="mb-4 rounded border border-[#202724] bg-[#0d100e]/70 p-3 text-[10.5px] leading-relaxed text-[#4d5852] sm:text-[11px]">
          {BOOT_LINES.slice(0, bootShown).map((l, i) => (
            <div key={i} className={i === 4 ? "text-[#ffb648]" : ""}>
              {l}
            </div>
          ))}
        </div>

        {/* fake nav */}
        <nav className="mb-5 flex flex-wrap gap-2 text-[11px]">
          {["sectors", "rebuild", "console", "users", "export"].map((n, i) => (
            <button
              key={n}
              onClick={() => fakeNav(n)}
              className={`border border-[#202724] bg-[#101312] px-3 py-1.5 tracking-widest text-[#7b8a83] transition-colors hover:border-[#3a443f] hover:text-[#ffb648] ${
                i === 2 ? "-translate-y-px rotate-[0.6deg]" : ""
              } ${i === 4 ? "opacity-40 line-through" : ""}`}
            >
              {glitchWord(n.toUpperCase(), n)}
            </button>
          ))}
        </nav>

        {/* stuck progress */}
        <div
          className="mb-6 h-2 w-full overflow-hidden rounded-sm border border-[#202724] bg-[#0d100e]"
          title="index rebuild"
        >
          <div className="stuck-bar h-full w-[47%]" />
        </div>

        {/* command/search bar */}
        <form
          onSubmit={submit}
          className="mb-7 flex items-center gap-2 rounded border border-[#2a332f] bg-[#0d100e] px-3 py-2.5 shadow-[0_0_30px_rgba(0,0,0,0.5)_inset]"
        >
          <Search size={14} className="shrink-0 text-[#4d5852]" />
          <span className="select-none text-[11px] text-[#4d5852]">query&gt;</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent font-mono text-[13px] tracking-wide text-[#d7e0db] caret-[#ffb648] outline-none placeholder:text-[#3f4a45]"
            placeholder="s̵e̸a̶r̷c̴h̵ sectors…"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-label="archive query"
          />
          <span className="blink select-none text-[#ffb648]">█</span>
        </form>

        {/* interactive log */}
        {log.length > 0 && (
          <div className="mb-7 space-y-0.5 text-[11px] leading-relaxed">
            {log.map((l) => (
              <div
                key={l.id}
                className={
                  l.tone === "red"
                    ? "text-[#ff5f56]"
                    : l.tone === "amber"
                      ? "text-glow-amber text-[#ffb648]"
                      : "text-[#5f6b66]"
                }
              >
                {l.text}
              </div>
            ))}
          </div>
        )}

        {/* corrupted records */}
        <section aria-label="corrupted records">
          <div className="mb-3 flex items-center gap-2 text-[11px] tracking-widest text-[#5f6b66]">
            <HardDrive size={12} />
            <span>
              RECORD STORE — {records.length || "0"} objects,{" "}
              <span className="text-[#ff5f56]">
                {records.length || "all"} unreadable
              </span>
            </span>
          </div>

          {records.length === 0 && (
            <div className="rounded border border-dashed border-[#2a332f] bg-[#0d100e]/60 p-8 text-center">
              <Skull size={22} className="mx-auto mb-3 text-[#3f4a45]" />
              <p className="text-[12px] text-[#5f6b66]">
                NO SECTORS FOUND
              </p>
              <p className="mt-1 text-[10.5px] text-[#3f4a45]">
                the archive does not remember being empty.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {records.map(({ row, sector, stamp, corrupt }, idx) => (
              <article
                key={row.id}
                className={`group rounded border border-[#202724] bg-[#0e1210]/90 p-4 transition-colors hover:border-[#2f3a35] ${
                  idx % 3 === 1 ? "-rotate-[0.3deg]" : idx % 3 === 2 ? "rotate-[0.25deg]" : ""
                }`}
              >
                <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] tracking-wider">
                  <span className="text-[#ffb648] text-glow-amber">{sector}</span>
                  <span className="text-[#5f6b66]">mtime {stamp}</span>
                  <span className="ml-auto flex items-center gap-1 text-[#ff5f56]">
                    <AlertTriangle size={10} />
                    integrity {corrupt.integrity}%
                  </span>
                </div>

                <pre className="overflow-x-auto whitespace-pre-wrap break-all text-[11px] leading-relaxed text-[#6c7a73]">
                  {corrupt.lines.join("\n")}
                </pre>

                <pre className="mt-2 overflow-x-auto text-[10px] leading-relaxed text-[#39433e]">
                  {corrupt.hex.join("\n")}
                </pre>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {corrupt.badges.map((b) => (
                    <span
                      key={b}
                      className="flex items-center gap-1 border border-[#3a2625] bg-[#1b1211] px-1.5 py-0.5 text-[9.5px] tracking-widest text-[#c96a60]"
                    >
                      <XOctagon size={9} />
                      {b}
                    </span>
                  ))}
                  {row.clue && (
                    <span
                      tabIndex={0}
                      className="hint-clue ml-auto flex max-w-full cursor-help items-center gap-1.5 truncate text-[10.5px] text-[#8a7f63]"
                      title="attached note (unrecoverable fragment)"
                    >
                      <FileX2 size={10} className="shrink-0" />
                      <span className="truncate">note ▸ {row.clue}</span>
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* footer diagnostics */}
        <footer className="mt-10 border-t border-[#202724] pt-4 text-[10px] text-[#3f4a45]">
          <div className="flex items-center gap-2">
            <TerminalSquare size={11} />
            <span>
              archive7 build 0.9.3-degraded · support: none · uptime:{" "}
              {("00" + ((Math.PI * 1000) | 0)).slice(-5)}? ·{" "}
              <span className="line-through">it was a diary once</span>
            </span>
          </div>
        </footer>
      </main>

      {/* ticker */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#202724] bg-[#0b0d0c]/95 py-1.5 text-[10px] tracking-widest text-[#4d5852]">
        <div className="ticker-track">
          {TICKER}
          {TICKER}
        </div>
      </div>
    </div>
  );
}
