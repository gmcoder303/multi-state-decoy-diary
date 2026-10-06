"use client";

import { useEffect, useRef } from "react";

/** :matrix — terminal rain, fades itself out. */
export function MatrixRain({ done }: { done: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const cols = Math.ceil(canvas.width / 16);
    const drops = Array.from({ length: cols }, () =>
      Math.floor(Math.random() * (canvas.height / 16)),
    );
    const glyphs = "アカサタナハマヤラワ0123456789▓▒░<>/\\";
    let raf = 0;
    let last = 0;
    const draw = (t: number) => {
      if (t - last > 42) {
        last = t;
        ctx.fillStyle = "rgba(5, 8, 6, 0.16)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = "14px monospace";
        for (let i = 0; i < cols; i++) {
          ctx.fillStyle = Math.random() > 0.975 ? "#b6ffb0" : "#2f9e57";
          ctx.fillText(
            glyphs[Math.floor(Math.random() * glyphs.length)],
            i * 16,
            drops[i] * 16,
          );
          if (drops[i] * 16 > canvas.height && Math.random() > 0.98) drops[i] = 0;
          drops[i]++;
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    const t = setTimeout(done, 11800);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [done]);

  return (
    <canvas
      ref={ref}
      className="matrix-overlay pointer-events-none fixed inset-0 z-[80]"
    />
  );
}

/** :void — everything goes black for a moment. */
export function VoidOverlay({ line, done }: { line: string; done: () => void }) {
  useEffect(() => {
    const t = setTimeout(done, 3300);
    return () => clearTimeout(t);
  }, [done]);
  return (
    <div className="void-overlay pointer-events-none fixed inset-0 z-[80] flex items-center justify-center bg-black">
      <p className="max-w-md px-8 text-center font-mono text-[13px] leading-relaxed text-neutral-500">
        {line}
      </p>
    </div>
  );
}

/** Konami — a burst of approval from the archive. */
export function KonamiBurst({ done }: { done: () => void }) {
  useEffect(() => {
    const t = setTimeout(done, 2500);
    return () => clearTimeout(t);
  }, [done]);
  return (
    <div className="konami-burst pointer-events-none fixed inset-0 z-[80]">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(600px 300px at 50% 50%, rgba(211,162,86,0.22), transparent 70%)",
        }}
      />
      <div className="flex h-full items-center justify-center">
        <div className="border border-[#d3a256]/60 bg-black/60 px-8 py-4 text-center backdrop-blur-sm">
          <div className="font-mono text-[11px] tracking-[0.4em] text-[#d3a256]">
            ↑ ↑ ↓ ↓ ← → ← → B A
          </div>
          <div className="mt-2 text-[12px] text-[#e9e4da]">
            observer protocol accepted
          </div>
        </div>
      </div>
    </div>
  );
}
