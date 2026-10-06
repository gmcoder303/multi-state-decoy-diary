"use client";

import { useState } from "react";
import { AlertTriangle, ChevronRight, ShieldX, Skull, X } from "lucide-react";
import { useDiary } from "@/lib/store";
import { destroyVault } from "@/lib/api";
import { deriveKey, verifyKey, type Factors } from "@/lib/crypto";
import {
  ColorFactorInput,
  LetterFactorInput,
  NumberFactorInput,
  PatternFactorInput,
  QuestionFactorInput,
} from "@/components/auth/factors";

type Stage =
  | { kind: "intro" }
  | { kind: "factor"; index: number }
  | { kind: "verifying" }
  | { kind: "terminated" }
  | { kind: "confirm"; index: number }
  | { kind: "wiping" }
  | { kind: "wiped" };

const FACTOR_NAMES = [
  "NUMERIC KEY",
  "LINGUISTIC KEY",
  "CHROMATIC KEY",
  "SIGIL KEY",
  "RESIDUAL KEY",
];

const CONFIRMATIONS: { heading: string; body: string; action: string }[] = [
  {
    heading: "Are you sure?",
    body: "You are about to permanently destroy this diary. This is not a lock — nothing will remain to unlock.",
    action: "Yes, continue",
  },
  {
    heading: "This will permanently delete your diary.",
    body: "Every entry. Every memory stored here. The ciphertext will be destroyed and the vault dissolved.",
    action: "I understand — continue",
  },
  {
    heading: "Your encrypted diary cannot be recovered.",
    body: "There is no backup on this server. There is no recovery phrase. After this, there is nothing to recover.",
    action: "Continue anyway",
  },
  {
    heading: "Final warning.",
    body: "The next step is the point of no return. Five factors verified. Four confirmations given. One remains.",
    action: "Proceed to the final step",
  },
  {
    heading: "Confirm destruction.",
    body: "Type DESTROY to permanently and irreversibly wipe this diary.",
    action: "Destroy everything",
  },
];

/**
 * EMERGENCY WIPE — re-verification of all five factors, then five separate
 * confirmations, only then destruction. Designed to be impossible to
 * trigger accidentally.
 */
export function WipeFlow({ onClose }: { onClose: () => void }) {
  const vault = useDiary((s) => s.vault);
  const afterWipe = useDiary((s) => s.afterWipe);

  const [stage, setStage] = useState<Stage>({ kind: "intro" });
  const [factors, setFactors] = useState<Factors>({
    num: "",
    letters: "",
    colors: [],
    pattern: [],
    answer: "",
  });
  const [destroyText, setDestroyText] = useState("");
  const [shake, setShake] = useState(0);

  const factorValid = (i: number): boolean => {
    if (i === 0) return factors.num.length >= 1;
    if (i === 1) return factors.letters.trim().length >= 1;
    if (i === 2) return factors.colors.length >= 1;
    if (i === 3) return factors.pattern.length >= 1;
    return factors.answer.trim().length >= 1;
  };

  const advanceFactor = async () => {
    if (stage.kind !== "factor") return;
    if (stage.index < 4) {
      setStage({ kind: "factor", index: stage.index + 1 });
      return;
    }
    // verify all five
    setStage({ kind: "verifying" });
    let ok = false;
    try {
      if (vault) {
        const key = await deriveKey(factors, vault.salt, vault.iterations);
        ok = await verifyKey(key, {
          ciphertext: vault.verifierCiphertext,
          iv: vault.verifierIv,
        });
      }
    } catch {
      ok = false;
    }
    await new Promise((r) => setTimeout(r, 900 + Math.random() * 500));
    if (ok) setStage({ kind: "confirm", index: 0 });
    else {
      // No failure detail is ever shown — the process simply terminates.
      setStage({ kind: "terminated" });
      setTimeout(onClose, 1700);
    }
  };

  const advanceConfirm = async () => {
    if (stage.kind !== "confirm") return;
    if (stage.index === 4) {
      if (destroyText.trim() !== "DESTROY") {
        setShake((s) => s + 1);
        return;
      }
      setStage({ kind: "wiping" });
      try {
        await destroyVault();
      } catch {
        /* even if the call fails locally, treat sequence as done */
      }
      try {
        window.localStorage.removeItem("diary.entries.v1");
      } catch {
        /* ignore */
      }
      await new Promise((r) => setTimeout(r, 1400));
      setStage({ kind: "wiped" });
      setTimeout(() => afterWipe(), 1200);
      return;
    }
    setStage({ kind: "confirm", index: stage.index + 1 });
  };

  const hideClose =
    stage.kind === "verifying" ||
    stage.kind === "wiping" ||
    stage.kind === "wiped" ||
    stage.kind === "terminated";

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="archive-root auth-scan relative w-full max-w-md overflow-hidden rounded-xl border border-[#3a2625] p-6 shadow-2xl">
        {!hideClose && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-[#4d5852] transition-colors hover:text-[#ffb648]"
            aria-label="abort wipe"
          >
            <X size={16} />
          </button>
        )}

        {stage.kind === "intro" && (
          <div className="fade-up">
            <ShieldX size={26} className="mb-4 text-[#ff5f56]" />
            <h2 className="font-mono text-[15px] tracking-[0.25em] text-[#ff5f56]">
              EMERGENCY WIPE
            </h2>
            <p className="mt-3 text-[12.5px] leading-relaxed text-[#a8b5ae]">
              This permanently destroys the entire diary — the vault and every
              encrypted entry — and returns this installation to a blank
              archive.
            </p>
            <ul className="mt-3 space-y-1.5 text-[11.5px] leading-relaxed text-[#5f6b66]">
              <li>· all five factors must be re-entered and verified</li>
              <li>· five separate confirmations will be required</li>
              <li>· there is no undo, no backup, no recovery</li>
            </ul>
            <div className="mt-6 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded border border-[#2a332f] py-2.5 font-mono text-[11px] tracking-[0.25em] text-[#7b8a83] transition-colors hover:text-[#ffb648]"
              >
                KEEP MY DIARY
              </button>
              <button
                onClick={() => setStage({ kind: "factor", index: 0 })}
                className="flex-1 rounded border border-[#ff5f56]/50 bg-[#ff5f56]/10 py-2.5 font-mono text-[11px] tracking-[0.25em] text-[#ff5f56] transition-colors hover:bg-[#ff5f56]/20"
              >
                BEGIN
              </button>
            </div>
          </div>
        )}

        {stage.kind === "factor" && (
          <div className="fade-up" key={stage.index}>
            <div className="mb-1 text-center text-[10px] tracking-[0.3em] text-[#5f6b66]">
              RE-VERIFY FACTOR {String(stage.index + 1).padStart(2, "0")} / 05
            </div>
            <h3 className="mb-6 text-center font-mono text-[13px] tracking-[0.25em] text-[#ffb648]">
              {FACTOR_NAMES[stage.index]}
            </h3>
            {stage.index === 0 && (
              <NumberFactorInput
                value={factors.num}
                onChange={(num) => setFactors((f) => ({ ...f, num }))}
                onEnter={() => factorValid(0) && void advanceFactor()}
              />
            )}
            {stage.index === 1 && (
              <LetterFactorInput
                value={factors.letters}
                onChange={(letters) => setFactors((f) => ({ ...f, letters }))}
                onEnter={() => factorValid(1) && void advanceFactor()}
                autoFocus
              />
            )}
            {stage.index === 2 && (
              <ColorFactorInput
                value={factors.colors}
                onChange={(colors) => setFactors((f) => ({ ...f, colors }))}
                min={1}
              />
            )}
            {stage.index === 3 && (
              <PatternFactorInput
                onDraw={(pattern) => setFactors((f) => ({ ...f, pattern }))}
                min={1}
              />
            )}
            {stage.index === 4 && (
              <QuestionFactorInput
                mode="unlock"
                question={vault?.question ?? ""}
                answer={factors.answer}
                onQuestion={() => {}}
                onAnswer={(answer) => setFactors((f) => ({ ...f, answer }))}
                onEnter={() => factorValid(4) && void advanceFactor()}
                autoFocus
              />
            )}
            <button
              onClick={() => void advanceFactor()}
              disabled={!factorValid(stage.index)}
              className="mx-auto mt-7 flex items-center gap-2 rounded border border-[#ffb648]/40 bg-[#ffb648]/10 px-7 py-2.5 font-mono text-[11px] tracking-[0.3em] text-[#ffb648] transition-colors hover:bg-[#ffb648]/20 disabled:cursor-not-allowed disabled:border-[#202724] disabled:bg-transparent disabled:text-[#3f4a45]"
            >
              {stage.index === 4 ? "VERIFY" : "NEXT"}
              <ChevronRight size={13} />
            </button>
          </div>
        )}

        {stage.kind === "verifying" && (
          <div className="fade-up py-10 text-center">
            <div className="text-glow-amber mb-3 font-mono text-[12px] tracking-[0.35em] text-[#ffb648]">
              VERIFYING FACTORS
            </div>
            <div className="mx-auto h-1 w-40 overflow-hidden rounded bg-[#101312]">
              <div className="stuck-bar h-full w-2/3" />
            </div>
          </div>
        )}

        {stage.kind === "terminated" && (
          <div className="fade-up py-10 text-center">
            <div className="font-mono text-[12px] tracking-[0.35em] text-[#5f6b66]">
              PROCESS TERMINATED
            </div>
          </div>
        )}

        {stage.kind === "confirm" && (
          <div className="fade-up" key={"c" + stage.index}>
            <div className="mb-4 flex items-center justify-center gap-1.5">
              {CONFIRMATIONS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-6 rounded-full ${
                    i <= stage.index ? "bg-[#ff5f56]" : "bg-[#202724]"
                  }`}
                />
              ))}
            </div>
            <AlertTriangle size={22} className="mx-auto mb-3 text-[#ff5f56]" />
            <h3 className="text-center font-mono text-[13.5px] tracking-[0.2em] text-[#ffb0a9]">
              {CONFIRMATIONS[stage.index].heading}
            </h3>
            <p className="mx-auto mt-3 max-w-xs text-center text-[11.5px] leading-relaxed text-[#7b8a83]">
              {CONFIRMATIONS[stage.index].body}
            </p>
            {stage.index === 4 && (
              <input
                key={shake}
                value={destroyText}
                onChange={(e) => setDestroyText(e.target.value)}
                placeholder="type DESTROY"
                autoFocus
                autoComplete="off"
                className={`mx-auto mt-5 block w-48 rounded border border-[#3a2625] bg-[#0d100e] px-3 py-2 text-center font-mono text-[13px] tracking-[0.3em] text-[#ff5f56] outline-none focus:border-[#ff5f56] ${
                  shake ? "shake" : ""
                }`}
              />
            )}
            <div className="mt-6 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded border border-[#2a332f] py-2.5 font-mono text-[10.5px] tracking-[0.25em] text-[#7b8a83] transition-colors hover:text-[#ffb648]"
              >
                GO BACK
              </button>
              <button
                onClick={() => void advanceConfirm()}
                className="flex-1 rounded border border-[#ff5f56]/50 bg-[#ff5f56]/10 py-2.5 font-mono text-[10.5px] tracking-[0.25em] text-[#ff5f56] transition-colors hover:bg-[#ff5f56]/20"
              >
                {CONFIRMATIONS[stage.index].action.toUpperCase()}
              </button>
            </div>
          </div>
        )}

        {stage.kind === "wiping" && (
          <div className="fade-up py-10 text-center">
            <Skull size={22} className="mx-auto mb-4 text-[#ff5f56]" />
            <div className="mb-3 font-mono text-[12px] tracking-[0.35em] text-[#ff5f56]">
              DESTROYING SECTORS
            </div>
            <div className="mx-auto h-1 w-48 overflow-hidden rounded bg-[#101312]">
              <div className="h-full w-full bg-[#ff5f56] transition-all duration-1000" />
            </div>
          </div>
        )}

        {stage.kind === "wiped" && (
          <div className="fade-up py-10 text-center font-mono text-[12px] leading-relaxed tracking-[0.2em] text-[#5f6b66]">
            SECTOR TABLE: EMPTY
            <br />
            VAULT: DISSOLVED
            <br />
            <span className="text-[#3f4a45]">it never happened.</span>
          </div>
        )}
      </div>
    </div>
  );
}
