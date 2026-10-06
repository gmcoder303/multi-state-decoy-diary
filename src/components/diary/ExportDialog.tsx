"use client";

import { useState } from "react";
import { Download, FileLock2, FileWarning, X } from "lucide-react";
import { useDiary } from "@/lib/store";
import { todayISO } from "@/lib/dates";

function download(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function ExportDialog() {
  const open = useDiary((s) => s.exportOpen);
  const setOpen = useDiary((s) => s.setExportOpen);
  const entries = useDiary((s) => s.entries);
  const archiveRows = useDiary((s) => s.archiveRows);
  const vault = useDiary((s) => s.vault);
  const toast = useDiary((s) => s.toast);
  const [ack, setAck] = useState(false);

  if (!open) return null;

  const close = () => {
    setAck(false);
    setOpen(false);
  };

  const exportEncrypted = () => {
    download(`stillwater-backup-encrypted-${todayISO()}.json`, {
      format: "stillwater/encrypted-v1",
      exportedAt: new Date().toISOString(),
      vault: vault && {
        salt: vault.salt,
        iterations: vault.iterations,
        question: vault.question,
        verifierCiphertext: vault.verifierCiphertext,
        verifierIv: vault.verifierIv,
      },
      entries: archiveRows,
    });
    toast("encrypted backup downloaded", "check");
    close();
  };

  const exportPlain = () => {
    download(
      `stillwater-PLAINTEXT-${todayISO()}.json`,
      entries.map((e) => ({
        title: e.title,
        content: e.content,
        date: e.date,
        time: e.time,
        tags: e.tags,
        mood: e.mood,
        starred: e.starred,
      })),
    );
    toast("plaintext export downloaded — protect it", "eye");
    close();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="dj-panel dj-line fade-up w-full max-w-md rounded-2xl border p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="dj-ink flex items-center gap-2 text-[15px] font-semibold">
            <Download size={15} className="dj-accent" /> Export diary data
          </h2>
          <button
            onClick={close}
            className="dj-faint rounded-full p-1.5 transition-colors hover:dj-dim"
            aria-label="close export"
          >
            <X size={16} />
          </button>
        </div>

        <button
          onClick={exportEncrypted}
          className="dj-bg-soft dj-line group mb-3 flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors hover:border-[var(--accent)]"
        >
          <FileLock2 size={18} className="dj-accent mt-0.5 shrink-0" />
          <span>
            <span className="dj-ink block text-[13.5px] font-medium">
              Encrypted backup
            </span>
            <span className="dj-faint mt-0.5 block text-[12px] leading-relaxed">
              Ciphertext exactly as stored in the cloud, plus key-derivation
              parameters. Safe to store anywhere; useless without your five
              factors.
            </span>
          </span>
        </button>

        <div className="dj-bg-soft dj-line rounded-xl border p-4">
          <div className="flex items-start gap-3">
            <FileWarning size={18} className="mt-0.5 shrink-0 text-[var(--danger)]" />
            <div>
              <div className="dj-ink text-[13.5px] font-medium">
                Decrypted plaintext export
              </div>
              <p className="dj-faint mt-0.5 text-[12px] leading-relaxed">
                Your entries, fully readable. Anyone holding this file can read
                your diary.
              </p>
              <label className="dj-dim mt-3 flex cursor-pointer items-center gap-2 text-[12px]">
                <input
                  type="checkbox"
                  checked={ack}
                  onChange={(e) => setAck(e.target.checked)}
                  className="accent-[#d3a256]"
                />
                I understand this file is unencrypted.
              </label>
              <button
                onClick={exportPlain}
                disabled={!ack}
                className="mt-3 rounded-full border border-[var(--danger)] px-4 py-1.5 text-[12px] text-[var(--danger)] transition-colors enabled:hover:bg-[var(--danger)] enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Export plaintext
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
