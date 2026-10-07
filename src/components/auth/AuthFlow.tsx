"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Grid3X3,
  Hash,
  HelpCircle,
  Palette,
  ShieldCheck,
  Type,
  type LucideIcon,
} from "lucide-react";
import { useDiary, decryptAll } from "@/lib/store";
import {
  createVault,
  createEntryRow,
  fetchEntryRows,
  fetchVault,
  ApiError,
} from "@/lib/api";
import { diag, errorCategory } from "@/lib/diag";
import {
  KDF_ITERATIONS,
  VERIFIER_PLAINTEXT,
  deriveKey,
  encryptJSON,
  generateSalt,
  randomId,
  verifyKey,
  type Factors,
} from "@/lib/crypto";
import type {
  DecryptedEntry,
  EncEntryRow,
  EntryPayload,
  VaultRow,
} from "@/lib/types";
import { humanDate } from "@/lib/dates";
import {
  ColorFactorInput,
  LetterFactorInput,
  NumberFactorInput,
  PALETTE,
  PatternFactorInput,
  QuestionFactorInput,
} from "./factors";

const STEP_META: { icon: LucideIcon; name: string; hint: string }[] = [
  { icon: Hash, name: "NUMERIC KEY", hint: "the number only you keep" },
  { icon: Type, name: "LINGUISTIC KEY", hint: "the word only you chose" },
  { icon: Palette, name: "CHROMATIC KEY", hint: "the colours in your order" },
  { icon: Grid3X3, name: "SIGIL KEY", hint: "the shape you draw" },
  { icon: HelpCircle, name: "RESIDUAL KEY", hint: "the answer only you know" },
];

const PROCESSING_LINES = [
  "recombining factors",
  `stretching key :: ${KDF_ITERATIONS} rounds`,
  "unrolling ciphertext",
  "reconciling sectors",
];

function isoOffset(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function AuthFlow() {
  const authMode = useDiary((s) => s.authMode);
  const vault = useDiary((s) => s.vault);
  const cancelAuth = useDiary((s) => s.cancelAuth);
  const unlockSuccess = useDiary((s) => s.unlockSuccess);
  const authFailed = useDiary((s) => s.authFailed);
  const toast = useDiary((s) => s.toast);

  const isSetup = authMode === "setup";
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [procLine, setProcLine] = useState(0);
  const [factors, setFactors] = useState<Factors>({
    num: "",
    letters: "",
    colors: [],
    pattern: [],
    answer: "",
  });
  const [question, setQuestion] = useState("");
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const totalSteps = isSetup ? 6 : 5;
  const meta = STEP_META[Math.min(step, 4)];

  const stepValid = useMemo(() => {
    if (step === 0)
      return isSetup ? factors.num.length >= 4 : factors.num.length >= 1;
    if (step === 1)
      return isSetup ? factors.letters.trim().length >= 3 : factors.letters.trim().length >= 1;
    if (step === 2)
      return isSetup ? factors.colors.length >= 4 : factors.colors.length >= 1;
    if (step === 3)
      return isSetup ? factors.pattern.length >= 4 : factors.pattern.length >= 1;
    if (step === 4)
      return isSetup
        ? question.trim().length >= 4 && factors.answer.trim().length >= 1
        : factors.answer.trim().length >= 1;
    return true;
  }, [step, factors, question, isSetup]);

  const next = () => {
    if (!stepValid || busy) return;
    if (step === 4) {
      if (isSetup) setStep(5);
      else void finish();
      return;
    }
    setStep((s) => s + 1);
  };

  async function runProcessing(): Promise<void> {
    setProcLine(0);
    for (let i = 0; i < PROCESSING_LINES.length; i++) {
      if (!mounted.current) return;
      setProcLine(i);
      // jitter makes success/failure timing indistinguishable
      await new Promise((r) => setTimeout(r, 320 + Math.random() * 260));
    }
  }

  async function finish() {
    if (busy) return;
    setBusy(true);
    const started = Date.now();
    let ok = false;
    let key: CryptoKey | null = null;
    let entries: DecryptedEntry[] = [];
    let freshRows: EncEntryRow[] | undefined;

    if (isSetup) {
      let created: VaultRow | null = null;
      const salt = generateSalt();
      diag("setup:begin", {});

      try {
        key = await deriveKey(factors, salt, KDF_ITERATIONS);
      } catch (err) {
        diag("setup:derive-key-failed", { category: errorCategory(err) });
      }

      if (key) {
        try {
          const verifier = await encryptJSON(key, { v: VERIFIER_PLAINTEXT });
          created = await createVault({
            salt,
            verifierCiphertext: verifier.ciphertext,
            verifierIv: verifier.iv,
            iterations: KDF_ITERATIONS,
            question: question.trim(),
          });
          diag("setup:vault-created", { id: created.id });
        } catch (err) {
          if (err instanceof ApiError && err.status === 409) {
            // A vault already exists (e.g. setup finished in another tab).
            // Accept it ONLY if our just-derived key verifies against it.
            diag("setup:vault-already-exists", {});
            try {
              const existing = await fetchVault();
              if (
                existing &&
                (await verifyKey(key, {
                  ciphertext: existing.verifierCiphertext,
                  iv: existing.verifierIv,
                }))
              ) {
                created = existing;
              }
            } catch (err2) {
              diag("setup:recheck-failed", { category: errorCategory(err2) });
            }
          } else {
            diag("setup:create-vault-failed", {
              category: errorCategory(err),
              endpoint: err instanceof ApiError ? err.endpoint : undefined,
            });
          }
        }
      }

      if (created && key) {
        useDiary.setState({ vault: created, vaultExists: true });
        // Seeding welcome entries must never undo a successful setup: the
        // vault (the user's authentication configuration) is already safe.
        try {
          const seeded = await seedEntries(key);
          entries = seeded.entries;
          freshRows = seeded.rows;
        } catch (err) {
          diag("setup:seed-entries-failed", {
            category: errorCategory(err),
          });
        }
        ok = true;
      }
    } else {
      const v = vault;
      diag("unlock:begin", { hasVault: v !== null });
      if (!v) {
        diag("unlock:no-vault-loaded", {});
      } else {
        try {
          key = await deriveKey(factors, v.salt, v.iterations);
          const valid = await verifyKey(key, {
            ciphertext: v.verifierCiphertext,
            iv: v.verifierIv,
          });
          if (!valid) {
            // Wrong factors — expected for anyone who does not know them.
            // Silent decoy, exactly as designed.
            diag("unlock:verifier-mismatch", {});
          } else {
            try {
              const rows = await fetchEntryRows();
              entries = await decryptAll(key, rows);
              freshRows = rows;
              ok = true;
            } catch (err) {
              diag("unlock:entries-fetch-failed", {
                category: errorCategory(err),
                endpoint: err instanceof ApiError ? err.endpoint : undefined,
              });
            }
          }
        } catch (err) {
          diag("unlock:derive-key-failed", { category: errorCategory(err) });
        }
      }
    }

    await runProcessing();

    // uniform minimum duration — prevents timing oracles
    const elapsed = Date.now() - started;
    const minTotal = 1900 + Math.random() * 500;
    if (elapsed < minTotal) {
      await new Promise((r) => setTimeout(r, minTotal - elapsed));
    }
    if (!mounted.current) return;

    if (ok && key) {
      diag(isSetup ? "setup:success" : "unlock:success", {
        entries: entries.length,
      });
      unlockSuccess(key, entries, freshRows);
      if (isSetup) toast("the archive remembers you now", "lock");
    } else {
      // ANY failure — wrong factor, network fault, anything — silently
      // lands in the empty decoy diary. No error is ever displayed.
      diag(isSetup ? "setup:failed -> decoy" : "unlock:failed -> decoy", {});
      authFailed();
    }
  }

  /** First-run welcome entries, encrypted before upload. */
  async function seedEntries(
    key: CryptoKey,
  ): Promise<{ entries: DecryptedEntry[]; rows: EncEntryRow[] }> {
    const seeds: { payload: EntryPayload; clue: string }[] = [
      {
        payload: {
          title: "The archive is awake",
          content:
            "If you can read this, the five keys aligned and the encryption held.\n\nA few things worth remembering:\n\n— Type :help in the search bar to see every command.\n— Ctrl+Shift+L seals the diary instantly, from anywhere. No confirmation, no trace.\n— Everything you write is encrypted in this browser before it touches the server. The database only ever holds ciphertext.\n— Anyone who fails even one key lands in an empty decoy diary and never knows.\n\nThis place is yours.",
          date: isoOffset(0),
          time: "21:47",
          tags: ["welcome"],
          mood: "calm",
          starred: true,
        },
        clue: "it begins where it always begins",
      },
      {
        payload: {
          title: "On hiding in plain sight",
          content:
            "The corrupted archive everyone sees is real — those garbled records are your entries, wearing their ciphertext like armour.\n\nIf you ever fear forgetting a key, write a hint on any entry using the archive hint field. It appears in the archive as a fragment only you would understand. Never write the key itself — a shape of a memory, a street, a song. Enough for you, nothing for anyone else.",
          date: isoOffset(1),
          time: "23:12",
          tags: ["welcome", "ritual"],
          mood: "reflective",
          starred: false,
        },
        clue: "",
      },
      {
        payload: {
          title: "A small test of time",
          content:
            "This entry was dated in the past so the hierarchy has something to hold: years unfold into months, months into days, days into entries.\n\nTry :random sometime. The archive likes to resurface memories when you least expect them.",
          date: isoOffset(12),
          time: "08:03",
          tags: ["welcome"],
          mood: "grateful",
          starred: false,
        },
        clue: "",
      },
    ];

    const entries: DecryptedEntry[] = [];
    const rows: EncEntryRow[] = [];
    for (const seed of seeds) {
      const id = randomId();
      const enc = await encryptJSON(key, seed.payload);
      const row = await createEntryRow(id, enc, seed.clue || null);
      rows.push(row);
      entries.push({
        ...seed.payload,
        id: row.id,
        clue: seed.clue,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
    }
    return { entries, rows };
  }

  return (
    <div className="archive-root scanlines auth-scan relative flex min-h-screen flex-col overflow-hidden">
      {/* header */}
      <div className="flex items-center justify-between border-b border-[#202724] px-4 py-3 text-[10px] tracking-[0.3em] text-[#5f6b66] sm:px-6">
        <button
          onClick={cancelAuth}
          disabled={busy}
          className="flex items-center gap-1.5 transition-colors hover:text-[#ffb648] disabled:opacity-40"
        >
          <ArrowLeft size={12} /> ABORT
        </button>
        <span>GATEWAY.NODE09</span>
        <span className="text-[#ffb648]">{isSetup ? "INITIALIZATION" : "VERIFICATION"}</span>
      </div>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        {!busy ? (
          <div className="w-full max-w-md">
            {/* progress diamonds */}
            <div className="mb-8 flex items-center justify-center gap-2.5">
              {STEP_META.map((s, i) => {
                const Icon = s.icon;
                const active = i === Math.min(step, 4);
                const done = i < step;
                return (
                  <div
                    key={i}
                    className={`flex h-9 w-9 items-center justify-center rounded-sm border transition-all duration-300 ${
                      active
                        ? "rotate-45 border-[#ffb648] text-[#ffb648] shadow-[0_0_16px_rgba(255,182,72,0.25)]"
                        : done
                          ? "border-[#4d6b5a] text-[#7fae94]"
                          : "border-[#202724] text-[#3f4a45]"
                    }`}
                  >
                    <Icon size={14} className={active ? "-rotate-45" : ""} />
                  </div>
                );
              })}
            </div>

            <div key={step} className="fade-up">
              {step < 5 ? (
                <>
                  <div className="mb-2 text-center text-[10px] tracking-[0.35em] text-[#5f6b66]">
                    FACTOR {String(Math.min(step + 1, 5)).padStart(2, "0")} / 05
                  </div>
                  <h2 className="text-glow-amber mb-1 text-center font-mono text-lg tracking-[0.25em] text-[#ffb648]">
                    {meta.name}
                  </h2>
                  <p className="mb-8 text-center text-[11px] text-[#5f6b66]">
                    {isSetup ? `define ${meta.hint}` : `reproduce ${meta.hint}`}
                  </p>

                  {step === 0 && (
                    <NumberFactorInput
                      value={factors.num}
                      onChange={(num) => setFactors((f) => ({ ...f, num }))}
                      onEnter={next}
                    />
                  )}
                  {step === 1 && (
                    <LetterFactorInput
                      value={factors.letters}
                      onChange={(letters) => setFactors((f) => ({ ...f, letters }))}
                      onEnter={next}
                      autoFocus
                    />
                  )}
                  {step === 2 && (
                    <ColorFactorInput
                      value={factors.colors}
                      onChange={(colors) => setFactors((f) => ({ ...f, colors }))}
                    />
                  )}
                  {step === 3 && (
                    <PatternFactorInput
                      onDraw={(pattern) => setFactors((f) => ({ ...f, pattern }))}
                    />
                  )}
                  {step === 4 && (
                    <QuestionFactorInput
                      mode={isSetup ? "setup" : "unlock"}
                      question={isSetup ? question : (vault?.question ?? "")}
                      answer={factors.answer}
                      onQuestion={setQuestion}
                      onAnswer={(answer) => setFactors((f) => ({ ...f, answer }))}
                      onEnter={next}
                      autoFocus
                    />
                  )}

                  <button
                    onClick={next}
                    disabled={!stepValid}
                    className="mx-auto mt-8 flex items-center gap-2 rounded border border-[#ffb648]/50 bg-[#ffb648]/10 px-8 py-3 font-mono text-[12px] tracking-[0.3em] text-[#ffb648] transition-all hover:bg-[#ffb648]/20 hover:shadow-[0_0_24px_rgba(255,182,72,0.2)] disabled:cursor-not-allowed disabled:border-[#202724] disabled:bg-transparent disabled:text-[#3f4a45]"
                  >
                    {step === 4 ? (isSetup ? "REVIEW" : "COMMIT") : "CONTINUE"}
                    <ChevronRight size={14} />
                  </button>
                </>
              ) : (
                <>
                  <div className="mb-2 text-center text-[10px] tracking-[0.35em] text-[#5f6b66]">
                    FINAL REVIEW
                  </div>
                  <h2 className="text-glow-amber mb-6 text-center font-mono text-lg tracking-[0.25em] text-[#ffb648]">
                    SEAL THE ARCHIVE
                  </h2>
                  <div className="mx-auto mb-6 max-w-sm space-y-2.5 rounded border border-[#2a332f] bg-[#0d100e] p-4 text-[11.5px] leading-relaxed text-[#7b8a83]">
                    <div className="flex justify-between">
                      <span className="text-[#4d5852]">numeric</span>
                      <span>{factors.num.length} digits</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#4d5852]">linguistic</span>
                      <span>{factors.letters.trim().length} letters</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#4d5852]">chromatic</span>
                      <span className="flex gap-1">
                        {factors.colors.map((c, i) => (
                          <span
                            key={i}
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ background: PALETTE.find((p) => p.id === c)?.hex }}
                          />
                        ))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#4d5852]">sigil</span>
                      <span>{factors.pattern.length} points</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#4d5852]">residual</span>
                      <span className="italic">“{question.trim()}”</span>
                    </div>
                  </div>
                  <p className="mx-auto mb-6 max-w-sm text-center text-[10.5px] leading-relaxed text-[#5f6b66]">
                    Memorize all five. They are never written to any disk,
                    anywhere. Lose them and this diary is permanently sealed.
                  </p>
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => setStep(0)}
                      className="rounded border border-[#2a332f] px-6 py-3 font-mono text-[11px] tracking-[0.3em] text-[#7b8a83] transition-colors hover:text-[#ffb648]"
                    >
                      REDEFINE
                    </button>
                    <button
                      onClick={() => void finish()}
                      className="flex items-center gap-2 rounded border border-[#ffb648]/50 bg-[#ffb648]/10 px-6 py-3 font-mono text-[12px] tracking-[0.3em] text-[#ffb648] transition-all hover:bg-[#ffb648]/20"
                    >
                      <ShieldCheck size={14} /> SEAL
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="fade-up w-full max-w-sm text-center">
            <div className="text-glow-amber mb-6 font-mono text-sm tracking-[0.35em] text-[#ffb648]">
              DECRYPTING SECTORS
            </div>
            <div className="mx-auto mb-6 h-1 w-full max-w-xs overflow-hidden rounded bg-[#101312]">
              <div
                className="h-full bg-[#ffb648] transition-all duration-500"
                style={{ width: `${((procLine + 1) / PROCESSING_LINES.length) * 100}%` }}
              />
            </div>
            <div className="space-y-1.5 text-[11px] text-[#5f6b66]">
              {PROCESSING_LINES.slice(0, procLine + 1).map((l, i) => (
                <div key={i}>{l}</div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-[#202724] px-4 py-2.5 text-center text-[9.5px] tracking-widest text-[#3f4a45]">
        five factors · one key · zero stored · {humanDate(isoOffset(0))}
      </footer>
    </div>
  );
}
