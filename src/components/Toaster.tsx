"use client";

import {
  Bell,
  Check,
  Eye,
  Ghost,
  Info,
  Lock,
  Shuffle,
  Sparkles,
  Terminal,
  Trash2,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useDiary } from "@/lib/store";

const ICONS: Record<string, LucideIcon> = {
  bell: Bell,
  check: Check,
  eye: Eye,
  ghost: Ghost,
  info: Info,
  lock: Lock,
  shuffle: Shuffle,
  sparkles: Sparkles,
  terminal: Terminal,
  trash: Trash2,
  zap: Zap,
};

export function Toaster() {
  const toasts = useDiary((s) => s.toasts);
  const phase = useDiary((s) => s.phase);
  if (toasts.length === 0) return null;

  const corrupted = phase === "archive" || phase === "gateway" || phase === "auth";

  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-[90] flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-2 px-4">
      {toasts.map((t) => {
        const Icon = (t.icon && ICONS[t.icon]) || Info;
        return (
          <div
            key={t.id}
            className={
              corrupted
                ? "fade-up flex w-fit max-w-full items-center gap-2 border border-[#3a443f] bg-[#101312] px-4 py-2 font-mono text-[11px] tracking-wider text-[#a8b5ae] shadow-[0_0_24px_rgba(0,0,0,0.6)]"
                : "fade-up flex w-fit max-w-full items-center gap-2 rounded-full border border-black/10 bg-[#1a1713] px-4 py-2 text-[13px] text-[#e9e4da] shadow-xl dark:border-white/10"
            }
          >
            <Icon size={13} className="shrink-0 opacity-70" />
            <span className="truncate">{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
