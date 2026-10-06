"use client";

import { useState } from "react";
import {
  Download,
  Ghost,
  Lock,
  Moon,
  ShieldCheck,
  Skull,
  Sun,
} from "lucide-react";
import { useDiary } from "@/lib/store";
import { WipeFlow } from "./WipeFlow";

export function SettingsView() {
  const theme = useDiary((s) => s.theme);
  const setTheme = useDiary((s) => s.setTheme);
  const ghostMode = useDiary((s) => s.ghostMode);
  const setGhostMode = useDiary((s) => s.setGhostMode);
  const setExportOpen = useDiary((s) => s.setExportOpen);
  const entries = useDiary((s) => s.entries);
  const [wipeOpen, setWipeOpen] = useState(false);

  return (
    <div className="dj-scroll mx-auto w-full max-w-2xl overflow-y-auto px-5 py-8 sm:px-8">
      <p className="dj-faint text-[11px] tracking-[0.25em] uppercase">settings</p>
      <h1 className="dj-ink mt-2 mb-8 font-journal text-[26px] font-semibold sm:text-[30px]">
        The quiet machinery.
      </h1>

      {/* appearance */}
      <Section title="Appearance">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setTheme("dark")}
            className={`dj-line flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
              theme === "dark" ? "border-[var(--accent)]" : "hover:dj-panel2"
            }`}
          >
            <Moon size={16} className="dj-accent" />
            <span>
              <span className="dj-ink block text-[13px] font-medium">Ink</span>
              <span className="dj-faint text-[11px]">for the small hours</span>
            </span>
          </button>
          <button
            onClick={() => setTheme("light")}
            className={`dj-line flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
              theme === "light" ? "border-[var(--accent)]" : "hover:dj-panel2"
            }`}
          >
            <Sun size={16} className="dj-accent" />
            <span>
              <span className="dj-ink block text-[13px] font-medium">Paper</span>
              <span className="dj-faint text-[11px]">for morning pages</span>
            </span>
          </button>
        </div>
        {ghostMode && (
          <button
            onClick={() => setGhostMode(false)}
            className="dj-line dj-dim mt-3 flex w-full items-center gap-3 rounded-xl border border-dashed p-3 text-left text-[12px] transition-colors hover:dj-panel2"
          >
            <Ghost size={14} className="dj-accent" />
            Ghost mode is active — tap to become solid again.
          </button>
        )}
      </Section>

      {/* security model */}
      <Section title="How this diary protects you">
        <div className="dj-panel dj-line space-y-3 rounded-xl border p-4 text-[12.5px] leading-relaxed dj-dim">
          <p>
            Entries are encrypted in your browser with AES-256-GCM before they
            are sent anywhere. The server stores ciphertext it cannot read.
          </p>
          <p>
            The key is derived from your five factors with PBKDF2-SHA256. The
            factors are never stored — losing them seals the diary forever.
          </p>
          <p>
            Any failed unlock opens an empty decoy diary instead of an error.
            Nobody learns that they failed.
          </p>
          <p className="dj-faint flex items-center gap-2 border-t pt-3 text-[11.5px] dj-line">
            <Lock size={12} className="dj-accent" />
            Ctrl + Shift + L seals the diary instantly, anywhere.
          </p>
        </div>
      </Section>

      {/* export */}
      <Section title="Export">
        <button
          onClick={() => setExportOpen(true)}
          className="dj-panel dj-line flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors hover:border-[var(--accent)]"
        >
          <Download size={16} className="dj-accent" />
          <span>
            <span className="dj-ink block text-[13px] font-medium">
              Export diary data
            </span>
            <span className="dj-faint text-[11.5px]">
              {entries.length} {entries.length === 1 ? "entry" : "entries"} ·
              encrypted backup or plaintext
            </span>
          </span>
        </button>
      </Section>

      {/* danger */}
      <Section title="Danger zone">
        <div className="rounded-xl border border-[var(--danger)]/40 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck size={16} className="dj-accent mt-0.5" />
            <p className="dj-dim text-[12px] leading-relaxed">
              Panic lock hides the diary. Emergency wipe erases it. Wipe
              requires all five factors and five separate confirmations — it
              cannot happen by accident, and it cannot be undone.
            </p>
          </div>
          <button
            onClick={() => setWipeOpen(true)}
            className="mt-4 flex items-center gap-2 rounded-full border border-[var(--danger)] px-4 py-2 text-[12px] font-medium text-[var(--danger)] transition-colors hover:bg-[var(--danger)] hover:text-white"
          >
            <Skull size={13} /> Emergency wipe…
          </button>
        </div>
      </Section>

      <p className="dj-faint mt-10 text-center font-mono text-[10px] tracking-[0.3em]">
        STILLWATER · E2E AES-256-GCM · PBKDF2
      </p>

      {wipeOpen && <WipeFlow onClose={() => setWipeOpen(false)} />}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="dj-faint mb-3 text-[11px] font-medium tracking-[0.2em] uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}
