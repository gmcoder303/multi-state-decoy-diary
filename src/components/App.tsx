"use client";

import { useEffect, useRef } from "react";
import { useDiary } from "@/lib/store";
import { CorruptedArchive } from "@/components/corrupted/CorruptedArchive";
import { Gateway } from "@/components/auth/Gateway";
import { AuthFlow } from "@/components/auth/AuthFlow";
import { DecoyDiary } from "@/components/decoy/DecoyDiary";
import { DiaryApp } from "@/components/diary/DiaryApp";
import { Toaster } from "@/components/Toaster";
import { BootScreen } from "@/components/BootScreen";

const KONAMI = [
  "arrowup",
  "arrowup",
  "arrowdown",
  "arrowdown",
  "arrowleft",
  "arrowright",
  "arrowleft",
  "arrowright",
  "b",
  "a",
];

export function App() {
  const phase = useDiary((s) => s.phase);
  const boot = useDiary((s) => s.boot);
  const booted = useDiary((s) => s.booted);
  const panicLock = useDiary((s) => s.panicLock);
  const refreshArchive = useDiary((s) => s.refreshArchive);
  const konamiBuf = useRef<string[]>([]);

  useEffect(() => {
    boot();
    // Register the PWA service worker (cache-first for static, never /api).
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, [boot]);

  // Keep the corrupted archive in sync after returning from the diary.
  useEffect(() => {
    if (phase === "archive" && booted) refreshArchive();
  }, [phase, booted, refreshArchive]);

  useEffect(() => {
    const titles: Record<string, string> = {
      archive: "ARCHIVE_7 // node09",
      gateway: "ARCHIVE_7 // node09",
      auth: "ARCHIVE_7 // node09",
      decoy: "My Diary",
      diary: "Stillwater",
    };
    document.title = titles[phase] ?? "ARCHIVE_7 // node09";
  }, [phase]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      // PANIC LOCK — Ctrl/Cmd + Shift + L. Instant. Everywhere.
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === "l") {
        e.preventDefault();
        const p = useDiary.getState().phase;
        if (p === "diary" || p === "decoy") panicLock();
        return;
      }

      // Konami code
      konamiBuf.current = [...konamiBuf.current, key].slice(-KONAMI.length);
      if (konamiBuf.current.join(",") === KONAMI.join(",")) {
        const s = useDiary.getState();
        if (s.phase === "diary") {
          s.triggerEffect("konami");
          s.toast("observer protocol accepted", "eye");
        } else if (s.phase === "archive") {
          s.toast("30 SECONDS OF EXTRA LIFE. SPEND THEM WISELY.", "zap");
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panicLock]);

  if (!booted || phase === "boot") return <BootScreen />;

  return (
    <>
      {phase === "archive" && <CorruptedArchive />}
      {phase === "gateway" && <Gateway />}
      {phase === "auth" && <AuthFlow />}
      {phase === "decoy" && <DecoyDiary />}
      {phase === "diary" && <DiaryApp />}
      <Toaster />
    </>
  );
}
