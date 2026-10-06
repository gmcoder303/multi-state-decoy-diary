"use client";

import { useRef, useState } from "react";
import { Delete, Eye, EyeOff } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Factor 1 — Number password (custom keypad)                          */
/* ------------------------------------------------------------------ */

export function NumberFactorInput({
  value,
  onChange,
  onEnter,
}: {
  value: string;
  onChange: (v: string) => void;
  onEnter?: () => void;
}) {
  const push = (d: string) => {
    if (value.length < 12) onChange(value + d);
  };
  return (
    <div className="w-full">
      <div className="mx-auto mb-5 flex h-12 max-w-xs items-center justify-center gap-2 rounded border border-[#2a332f] bg-[#0d100e] px-4">
        {value.length === 0 ? (
          <span className="text-[11px] tracking-widest text-[#3f4a45]">
            ENTER NUMERIC KEY
          </span>
        ) : (
          <div className="flex gap-1.5">
            {value.split("").map((d, i) => (
              <span
                key={i}
                className="h-2.5 w-2.5 rounded-full bg-[#ffb648] shadow-[0_0_8px_rgba(255,182,72,0.6)]"
                title={d}
              />
            ))}
          </div>
        )}
      </div>
      <div className="mx-auto grid max-w-xs grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <KeyButton key={d} label={d} onClick={() => push(d)} />
        ))}
        <KeyButton
          label="CLR"
          onClick={() => onChange("")}
          muted
        />
        <KeyButton label="0" onClick={() => push("0")} onDouble={onEnter} />
        <button
          onClick={() => onChange(value.slice(0, -1))}
          className="flex items-center justify-center rounded border border-[#2a332f] bg-[#101312] py-3 text-[#7b8a83] transition-colors hover:border-[#ffb648] hover:text-[#ffb648]"
          aria-label="backspace"
        >
          <Delete size={16} />
        </button>
      </div>
    </div>
  );
}

function KeyButton({
  label,
  onClick,
  muted,
  onDouble,
}: {
  label: string;
  onClick: () => void;
  muted?: boolean;
  onDouble?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      onDoubleClick={onDouble}
      className={`rounded border py-3 font-mono text-lg tracking-widest transition-colors ${
        muted
          ? "border-[#202724] bg-[#0d100e] text-[#4d5852] hover:border-[#3a443f]"
          : "border-[#2a332f] bg-[#101312] text-[#c9d4ce] hover:border-[#ffb648] hover:text-[#ffb648]"
      }`}
    >
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Factor 2 — Letter password                                          */
/* ------------------------------------------------------------------ */

export function LetterFactorInput({
  value,
  onChange,
  onEnter,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  onEnter?: () => void;
  autoFocus?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="w-full">
      <div className="relative mx-auto max-w-xs">
        <input
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value.slice(0, 40))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onEnter) onEnter();
          }}
          type={show ? "text" : "password"}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="linguistic key"
          aria-label="letter password"
          className="w-full rounded border border-[#2a332f] bg-[#0d100e] px-4 py-3.5 pr-11 text-center font-mono text-sm uppercase tracking-[0.5em] text-[#d7e0db] caret-[#ffb648] outline-none transition-colors placeholder:normal-case placeholder:tracking-widest placeholder:text-[#3f4a45] focus:border-[#ffb648]"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4d5852] transition-colors hover:text-[#ffb648]"
          aria-label={show ? "hide" : "show"}
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      <p className="mt-3 text-center text-[10px] tracking-widest text-[#3f4a45]">
        letters, any word only you would choose
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Factor 3 — Colour sequence                                          */
/* ------------------------------------------------------------------ */

export const PALETTE = [
  { id: "crimson", hex: "#e0503c" },
  { id: "azure", hex: "#4a7dd4" },
  { id: "jade", hex: "#43b06a" },
  { id: "violet", hex: "#9268d8" },
  { id: "amber", hex: "#e3a83b" },
  { id: "frost", hex: "#cfd8dc" },
];

export function ColorFactorInput({
  value,
  onChange,
  min = 4,
  max = 8,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  min?: number;
  max?: number;
}) {
  const [pulse, setPulse] = useState<string | null>(null);
  const pick = (id: string) => {
    if (value.length >= max) return;
    onChange([...value, id]);
    setPulse(id + value.length);
    setTimeout(() => setPulse(null), 350);
  };
  return (
    <div className="w-full">
      <div className="mx-auto mb-5 flex h-14 max-w-xs items-center justify-center gap-2 rounded border border-[#2a332f] bg-[#0d100e] px-4">
        {value.length === 0 ? (
          <span className="text-[11px] tracking-widest text-[#3f4a45]">
            PRESS {min}+ COLOURS IN ORDER
          </span>
        ) : (
          value.map((id, i) => {
            const c = PALETTE.find((p) => p.id === id);
            return (
              <span
                key={i}
                className={`h-4 w-4 rounded-full ${
                  pulse === id + i ? "scale-150" : ""
                } transition-transform duration-200`}
                style={{ background: c?.hex, boxShadow: `0 0 10px ${c?.hex}66` }}
              />
            );
          })
        )}
      </div>
      <div className="mx-auto grid max-w-xs grid-cols-3 gap-3">
        {PALETTE.map((c) => (
          <button
            key={c.id}
            onClick={() => pick(c.id)}
            aria-label={c.id}
            className="group flex items-center justify-center rounded border border-[#202724] bg-[#101312] py-3.5 transition-all hover:border-[#3a443f]"
          >
            <span
              className="h-7 w-7 rounded-full transition-transform duration-200 group-hover:scale-110 group-active:scale-90"
              style={{ background: c.hex, boxShadow: `0 0 16px ${c.hex}55` }}
            />
          </button>
        ))}
      </div>
      <div className="mx-auto mt-3 flex max-w-xs justify-between text-[10px]">
        <button
          onClick={() => onChange(value.slice(0, -1))}
          className="tracking-widest text-[#4d5852] transition-colors hover:text-[#ffb648]"
        >
          UNDO
        </button>
        <button
          onClick={() => onChange([])}
          className="tracking-widest text-[#4d5852] transition-colors hover:text-[#ffb648]"
        >
          CLEAR
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Factor 4 — Pattern lock (3×3)                                       */
/* ------------------------------------------------------------------ */

const DOTS = Array.from({ length: 9 }, (_, i) => ({
  x: 50 + (i % 3) * 100,
  y: 50 + Math.floor(i / 3) * 100,
}));

export function PatternFactorInput({
  onDraw,
  min = 4,
}: {
  onDraw: (seq: number[]) => void;
  min?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [seq, setSeq] = useState<number[]>([]);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const drawing = useRef(false);
  const liveSeq = useRef<number[]>([]);

  const toLocal = (e: React.PointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 300,
      y: ((e.clientY - rect.top) / rect.height) * 300,
    };
  };

  const hitDot = (p: { x: number; y: number }): number | null => {
    for (let i = 0; i < 9; i++) {
      const dx = DOTS[i].x - p.x;
      const dy = DOTS[i].y - p.y;
      if (Math.hypot(dx, dy) < 30) return i;
    }
    return null;
  };

  const start = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drawing.current = true;
    liveSeq.current = [];
    setSeq([]);
    const p = toLocal(e);
    setCursor(p);
    const hit = hitDot(p);
    if (hit !== null) {
      liveSeq.current = [hit];
      setSeq([hit]);
    }
  };

  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const p = toLocal(e);
    setCursor(p);
    const hit = hitDot(p);
    if (hit !== null && !liveSeq.current.includes(hit)) {
      liveSeq.current = [...liveSeq.current, hit];
      setSeq([...liveSeq.current]);
    }
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const result = [...liveSeq.current];
    setCursor(null);
    if (result.length > 0) {
      onDraw(result);
      window.setTimeout(() => {
        setSeq([]);
        liveSeq.current = [];
      }, 420);
    }
  };

  const has = (i: number) => seq.includes(i);

  return (
    <div className="w-full">
      <svg
        ref={svgRef}
        viewBox="0 0 300 300"
        className="mx-auto block w-full max-w-[280px] touch-none select-none rounded border border-[#2a332f] bg-[#0d100e]"
        style={{ touchAction: "none" }}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      >
        {seq.map((n, i) =>
          i === 0 ? null : (
            <line
              key={i}
              x1={DOTS[seq[i - 1]].x}
              y1={DOTS[seq[i - 1]].y}
              x2={DOTS[n].x}
              y2={DOTS[n].y}
              stroke="#ffb648"
              strokeWidth={3}
              strokeLinecap="round"
              opacity={0.75}
            />
          ),
        )}
        {drawing.current && cursor && seq.length > 0 && (
          <line
            x1={DOTS[seq[seq.length - 1]].x}
            y1={DOTS[seq[seq.length - 1]].y}
            x2={cursor.x}
            y2={cursor.y}
            stroke="#ffb648"
            strokeWidth={2}
            opacity={0.4}
          />
        )}
        {DOTS.map((d, i) => (
          <g key={i}>
            <circle
              cx={d.x}
              cy={d.y}
              r={has(i) ? 15 : 11}
              fill={has(i) ? "#ffb648" : "#101312"}
              stroke={has(i) ? "#ffb648" : "#3a443f"}
              strokeWidth={2}
              style={{
                transition: "all 120ms",
                filter: has(i) ? "drop-shadow(0 0 8px #ffb64888)" : undefined,
              }}
            />
          </g>
        ))}
      </svg>
      <p className="mt-3 text-center text-[10px] tracking-widest text-[#3f4a45]">
        DRAW A SHAPE THROUGH {min}+ POINTS · {seq.length} RECORDED
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Factor 5 — Personal question                                        */
/* ------------------------------------------------------------------ */

export function QuestionFactorInput({
  mode,
  question,
  answer,
  onQuestion,
  onAnswer,
  onEnter,
  autoFocus,
}: {
  mode: "setup" | "unlock";
  question: string;
  answer: string;
  onQuestion: (v: string) => void;
  onAnswer: (v: string) => void;
  onEnter?: () => void;
  autoFocus?: boolean;
}) {
  return (
    <div className="mx-auto w-full max-w-sm space-y-4">
      {mode === "setup" ? (
        <>
          <input
            value={question}
            onChange={(e) => onQuestion(e.target.value.slice(0, 200))}
            autoFocus={autoFocus}
            placeholder="a question only you would ask yourself"
            aria-label="personal question"
            autoComplete="off"
            className="w-full rounded border border-[#2a332f] bg-[#0d100e] px-4 py-3 text-[13px] text-[#d7e0db] caret-[#ffb648] outline-none transition-colors placeholder:text-[#3f4a45] focus:border-[#ffb648]"
          />
          <input
            value={answer}
            onChange={(e) => onAnswer(e.target.value.slice(0, 120))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && onEnter) onEnter();
            }}
            placeholder="the answer (never stored anywhere)"
            aria-label="personal answer"
            autoComplete="off"
            className="w-full rounded border border-[#2a332f] bg-[#0d100e] px-4 py-3 text-[13px] text-[#d7e0db] caret-[#ffb648] outline-none transition-colors placeholder:text-[#3f4a45] focus:border-[#ffb648]"
          />
        </>
      ) : (
        <>
          <div className="rounded border border-[#2a332f] bg-[#0d100e] px-4 py-3.5 text-[13px] italic leading-relaxed text-[#a8b5ae]">
            {question}
          </div>
          <input
            value={answer}
            autoFocus={autoFocus}
            onChange={(e) => onAnswer(e.target.value.slice(0, 120))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && onEnter) onEnter();
            }}
            placeholder="answer"
            aria-label="answer"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="w-full rounded border border-[#2a332f] bg-[#0d100e] px-4 py-3 text-[13px] text-[#d7e0db] caret-[#ffb648] outline-none transition-colors placeholder:text-[#3f4a45] focus:border-[#ffb648]"
          />
        </>
      )}
    </div>
  );
}
