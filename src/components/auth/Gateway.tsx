"use client";

import { useEffect, useRef, useState } from "react";
import { useDiary } from "@/lib/store";

const SEQUENCE = [
  { text: "COMMAND ACCEPTED", pause: 420 },
  { text: "elevating shell :: operator channel", pause: 300 },
  { text: "resolving key material ............", pause: 480 },
  { text: "entropy pool OK", pause: 260 },
  { text: "INITIALIZING", pause: 900 },
];

/** The mysterious terminal transition between the archive and the gate. */
export function Gateway() {
  const enterAuth = useDiary((s) => s.enterAuth);
  const cancelAuth = useDiary((s) => s.cancelAuth);
  const [lines, setLines] = useState<string[]>([]);
  const [dots, setDots] = useState("");
  const cancelRef = useRef(false);

  useEffect(() => {
    cancelRef.current = false;
    let cancelled = false;
    (async () => {
      for (const step of SEQUENCE) {
        if (cancelled) return;
        setLines((l) => [...l, step.text]);
        await new Promise((r) => setTimeout(r, step.pause));
      }
      for (let i = 0; i < 10; i++) {
        if (cancelled) return;
        setDots((d) => d + ".");
        await new Promise((r) => setTimeout(r, 90));
      }
      if (!cancelled && !cancelRef.current) void enterAuth();
    })();
    return () => {
      cancelled = true;
    };
  }, [enterAuth]);

  return (
    <div
      className="archive-root scanlines flex min-h-screen items-center justify-center p-6"
      onClick={() => {
        cancelRef.current = true;
        cancelAuth();
      }}
      title="abandon"
    >
      <div className="w-full max-w-lg rounded border border-[#2a332f] bg-[#0d100e]/90 p-6 shadow-[0_0_80px_rgba(255,182,72,0.05)]">
        <div className="mb-4 flex items-center justify-between text-[10px] tracking-[0.3em] text-[#5f6b66]">
          <span>GATEWAY.NODE09</span>
          <span className="text-[#ffb648]">CHANNEL 0x2F</span>
        </div>
        <div className="min-h-40 space-y-1.5 font-mono text-[12px] leading-relaxed sm:text-[13px]">
          {lines.map((l, i) => (
            <div
              key={i}
              className={i === 0 || i === 4 ? "text-[#ffb648] text-glow-amber" : "text-[#7b8a83]"}
            >
              {l}
              {i === 4 && lines.length === SEQUENCE.length && (
                <span className="text-[#5f6b66]">{dots}</span>
              )}
            </div>
          ))}
          <span className="blink text-[#ffb648]">█</span>
        </div>
        <div className="mt-4 text-[10px] text-[#3f4a45]">
          click anywhere to abandon
        </div>
      </div>
    </div>
  );
}
