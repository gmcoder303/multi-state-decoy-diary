"use client";

import { Terminal, X, Keyboard } from "lucide-react";
import { COMMANDS } from "@/lib/commands";
import { useDiary } from "@/lib/store";

const SHORTCUTS: [string, string][] = [
  ["Ctrl/Cmd + Shift + L", "panic lock — instantly seals the diary"],
  ["Ctrl/Cmd + K", "focus the command bar"],
  ["Alt + N", "new entry"],
  ["Ctrl/Cmd + S", "save the current entry"],
  ["Esc", "close panels and dialogs"],
  ["Shift + / (?)", "this help"],
];

export function HelpOverlay() {
  const open = useDiary((s) => s.helpOpen);
  const setOpen = useDiary((s) => s.setHelpOpen);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="dj-panel dj-line fade-up max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border p-6 shadow-2xl dj-scroll"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="dj-ink flex items-center gap-2 text-[15px] font-semibold">
            <Terminal size={15} className="dj-accent" /> Commands
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="dj-faint rounded-full p-1.5 transition-colors hover:dj-dim"
            aria-label="close help"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mb-6 space-y-1.5">
          {COMMANDS.map((c) => (
            <div key={c.name} className="flex items-baseline gap-3 text-[13px]">
              <code className="dj-accent w-24 shrink-0 font-mono text-[12px]">
                :{c.name}
              </code>
              <span className="dj-dim">{c.description}</span>
            </div>
          ))}
          <div className="dj-faint mt-3 border-t pt-3 text-[11.5px] italic dj-line">
            …and a few commands this page refuses to document.
          </div>
        </div>

        <h3 className="dj-ink mb-3 flex items-center gap-2 text-[15px] font-semibold">
          <Keyboard size={15} className="dj-accent" /> Shortcuts
        </h3>
        <div className="space-y-2">
          {SHORTCUTS.map(([keys, desc]) => (
            <div key={keys} className="flex items-center gap-3 text-[13px]">
              <kbd className="dj-bg-soft dj-line dj-dim w-44 shrink-0 rounded-md border px-2 py-1 text-center font-mono text-[10.5px]">
                {keys}
              </kbd>
              <span className="dj-dim">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
