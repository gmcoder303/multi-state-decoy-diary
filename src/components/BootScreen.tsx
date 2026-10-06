"use client";

import { useEffect, useState } from "react";

const LINES = [
  "ARCHIVE_7 NODE09 — cold start",
  "mounting /dev/sectors .......... OK",
  "crc index .................... DEGRADED",
  "restoring allocation table ... RETRY 3",
  "surface scan ................. 41%",
];

export function BootScreen() {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setInterval(
      () => setShown((n) => Math.min(n + 1, LINES.length)),
      240,
    );
    return () => clearInterval(t);
  }, []);

  return (
    <div className="archive-root scanlines flex min-h-screen flex-col justify-center p-8">
      <div className="mx-auto w-full max-w-xl">
        <pre className="text-[11px] leading-relaxed text-[#5f6b66] sm:text-xs">
          {LINES.slice(0, shown).join("\n")}
        </pre>
        <div className="mt-4 font-mono text-xs text-[#a8b5ae]">
          <span className="blink text-[#ffb648]">█</span>
        </div>
      </div>
    </div>
  );
}
