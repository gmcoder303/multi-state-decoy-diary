"use client";

import { create } from "zustand";
import {
  decryptJSON,
  encryptJSON,
  randomId,
  type CipherPayload,
} from "@/lib/crypto";
import {
  createEntryRow,
  deleteEntryRow,
  fetchEntryRows,
  fetchVault,
  updateEntryRow,
} from "@/lib/api";
import { diag, errorCategory } from "@/lib/diag";
import type {
  AppPhase,
  DecryptedEntry,
  EncEntryRow,
  EntryPayload,
  VaultRow,
} from "@/lib/types";

export type EffectKind =
  | "void"
  | "matrix"
  | "forget"
  | "konami"
  | "gateway-done"
  | null;

export interface Toast {
  id: number;
  message: string;
  icon?: string;
}

interface DiaryState {
  phase: AppPhase;
  booted: boolean;
  vaultExists: boolean;
  authMode: "unlock" | "setup";

  /** Ciphertext rows — safe to hold; they power Diary 1's corrupted look. */
  archiveRows: EncEntryRow[];
  vault: VaultRow | null;

  /** The derived key. ONLY ever in memory, ONLY while unlocked. */
  masterKey: CryptoKey | null;
  /** Decrypted entries. ONLY in memory, ONLY while unlocked. */
  entries: DecryptedEntry[];

  selectedId: string | null;
  diaryView: "write" | "stats" | "settings";
  searchQuery: string;
  helpOpen: boolean;
  exportOpen: boolean;
  ghostMode: boolean;
  effect: EffectKind;
  memoryFlash: boolean;

  theme: "light" | "dark";

  toasts: Toast[];

  boot: () => Promise<void>;
  refreshArchive: () => Promise<void>;
  beginGateway: () => void;
  enterAuth: () => Promise<void>;
  cancelAuth: () => void;
  unlockSuccess: (
    key: CryptoKey,
    entries: DecryptedEntry[],
    rowsOverride?: EncEntryRow[],
  ) => void;
  authFailed: () => void;
  panicLock: () => void;
  afterWipe: () => void;

  setEntries: (entries: DecryptedEntry[]) => void;
  saveEntry: (
    payload: EntryPayload,
    clue: string,
    existingId?: string,
  ) => Promise<DecryptedEntry>;
  deleteEntry: (id: string) => Promise<void>;

  select: (id: string | null) => void;
  setDiaryView: (v: "write" | "stats" | "settings") => void;
  setSearchQuery: (q: string) => void;
  setHelpOpen: (open: boolean) => void;
  setExportOpen: (open: boolean) => void;
  setGhostMode: (on: boolean) => void;
  triggerEffect: (e: EffectKind) => void;
  setMemoryFlash: (on: boolean) => void;
  setTheme: (t: "light" | "dark") => void;
  toast: (message: string, icon?: string) => void;
  dismissToast: (id: number) => void;
}

let toastId = 0;

/**
 * Client-side "a vault has been created in this browser" marker.
 *
 * This is NOT a credential and NOT a substitute for the server: it only
 * records that setup completed, so a transient fetch failure during boot
 * can never downgrade an existing vault back to the SETUP screen. The
 * authoritative source remains GET /api/vault; the flag is only consulted * when that fetch fails, and it is cleared whenever the server *authoritatively* reports no vault (e.g. after an emergency wipe). * It reveals nothing the server's own GET response does not already reveal. */
const VAULT_SEEN_KEY = "archive.vault.seen";

function markVaultSeen(): void {
  try {
    window.localStorage.setItem(VAULT_SEEN_KEY, "1");
  } catch {
    /* private mode — ignore */
  }
}

function clearVaultSeen(): void {
  try {
    window.localStorage.removeItem(VAULT_SEEN_KEY);
  } catch {
    /* ignore */
  }
}

function vaultSeen(): boolean {
  try {
    return window.localStorage.getItem(VAULT_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

/** In-flight resolution of "does a vault exist?" started by :unlock. */
let modeResolution: Promise<void> | null = null;

export const useDiary = create<DiaryState>((set, get) => ({
  phase: "boot",
  booted: false,
  vaultExists: false,
  authMode: "unlock",
  archiveRows: [],
  vault: null,
  masterKey: null,
  entries: [],
  selectedId: null,
  diaryView: "write",
  searchQuery: "",
  helpOpen: false,
  exportOpen: false,
  ghostMode: false,
  effect: null,
  memoryFlash: false,
  theme: "dark",
  toasts: [],

  boot: async () => {
    let theme: "light" | "dark" = "dark";
    try {
      const saved = window.localStorage.getItem("archive.theme");
      if (saved === "light" || saved === "dark") theme = saved;
    } catch {
      /* private mode — ignore */
    }

    // Independent fetches: a failure of one must not discard the other's
    // result (previously Promise.all threw away the vault row when the    // entries fetch failed, which wrongly reset the app to SETUP mode).
    const [vaultRes, rowsRes] = await Promise.allSettled([
      fetchVault(),
      fetchEntryRows(),
    ]);

    if (vaultRes.status === "rejected") {
      diag("boot:vault-fetch-failed", {
        category: errorCategory(vaultRes.reason),
      });
    }
    if (rowsRes.status === "rejected") {
      diag("boot:entries-fetch-failed", {
        category: errorCategory(rowsRes.reason),
      });
    }

    let vaultRow: VaultRow | null | undefined; // undefined = unknown
    if (vaultRes.status === "fulfilled") {
      vaultRow = vaultRes.value;
      if (vaultRow === null) clearVaultSeen(); // server-authoritative: none
    }

    const rows =
      rowsRes.status === "fulfilled" ? rowsRes.value : ([] as EncEntryRow[]);

    set({
      phase: "archive",
      booted: true,
      ...(vaultRow !== undefined
        ? { vault: vaultRow, vaultExists: vaultRow !== null }
        : // fetch failed — fall back to the local marker so SETUP can        // never reappear on a browser that already completed setup
          { vaultExists: vaultSeen() }),
      archiveRows: rows,
      theme,
    });
  },

  refreshArchive: async () => {
    try {
      const rows = await fetchEntryRows();
      set({ archiveRows: rows });
    } catch (err) {
      /* corruption hides failures */
      diag("archive:refresh-failed", { category: errorCategory(err) });
    }
  },

  /**
   * :unlock — starts a FRESH vault lookup so setup-vs-unlock mode is
   * decided by the server's current state, not by whatever the boot
   * fetch managed to see (a boot-time network blip must never send an
   * existing vault back to the SETUP screen).
   */
  beginGateway: () => {
    set({ phase: "gateway" });
    modeResolution = (async () => {
      try {
        const row = await fetchVault();
        if (row === null) clearVaultSeen();
        set({ vault: row, vaultExists: row !== null });
        diag("gateway:vault-resolved", { exists: row !== null });
      } catch (err) {
        diag("gateway:vault-fetch-failed", {
          category: errorCategory(err),
        });
        // Keep last known state; only the local marker can assert existence.
        set({ vaultExists: get().vault !== null || vaultSeen() });
      }
    })();
  },

  enterAuth: async () => {
    if (modeResolution) {
      await Promise.race([
        modeResolution,
        new Promise((r) => setTimeout(r, 4000)),
      ]);
      modeResolution = null;
    }
    // Aborted (click-to-abandon) while the lookup was in flight.
    if (get().phase !== "gateway") return;
    const exists = get().vaultExists;
    diag("auth:mode", { mode: exists ? "unlock" : "setup" });
    set({ phase: "auth", authMode: exists ? "unlock" : "setup" });
  },

  cancelAuth: () => set({ phase: "archive" }),

  unlockSuccess: (key, entries, rowsOverride) => {
    // A successful unlock proves the vault exists server-side.
    markVaultSeen();
    return set({
      masterKey: key,
      entries,
      phase: "diary",
      ...(rowsOverride ? { archiveRows: rowsOverride } : {}),
      selectedId: null,
      diaryView: "write",
      searchQuery: "",
      helpOpen: false,
      exportOpen: false,
      ghostMode: false,
      effect: null,
    });
  },

  authFailed: () => {
    diag("auth:failed -> decoy", {});
    set({ phase: "decoy" });
  },

  /**
   * PANIC LOCK. Synchronous. No confirmation, no message.
   * Drops every reference to the key and all decrypted entries and
   * restores the corrupted archive instantly.
   */
  panicLock: () => {
    set({
      masterKey: null,
      entries: [],
      selectedId: null,
      searchQuery: "",
      helpOpen: false,
      exportOpen: false,
      ghostMode: false,
      effect: null,
      diaryView: "write",
      phase: "archive",
    });
  },

  afterWipe: () => {
    clearVaultSeen();
    set({
      masterKey: null,
      entries: [],
      archiveRows: [],
      vault: null,
      vaultExists: false,
      selectedId: null,
      searchQuery: "",
      helpOpen: false,
      exportOpen: false,
      ghostMode: false,
      effect: null,
      diaryView: "write",
      phase: "archive",
    });
  },

  setEntries: (entries) => set({ entries }),

  saveEntry: async (payload, clue, existingId) => {
    const key = get().masterKey;
    if (!key) throw new Error("locked");
    const encrypted = await encryptJSON(key, payload);
    const cleanClue = clue.trim() === "" ? null : clue.trim();

    if (existingId) {
      const row = await updateEntryRow(existingId, encrypted, cleanClue);
      const entry = rowToDecrypted(row, payload, cleanClue);
      set({
        entries: get()
          .entries.map((e) => (e.id === existingId ? entry : e)),
        archiveRows: get().archiveRows.map((r) =>
          r.id === existingId ? row : r,
        ),
      });
      return entry;
    }

    const id = randomId();
    const row = await createEntryRow(id, encrypted, cleanClue);
    const entry = rowToDecrypted(row, payload, cleanClue);
    set({
      entries: [entry, ...get().entries],
      archiveRows: [row, ...get().archiveRows],
    });
    return entry;
  },

  deleteEntry: async (id) => {
    await deleteEntryRow(id);
    set({
      entries: get().entries.filter((e) => e.id !== id),
      archiveRows: get().archiveRows.filter((r) => r.id !== id),
      selectedId: get().selectedId === id ? null : get().selectedId,
    });
  },

  select: (id) => set({ selectedId: id, diaryView: "write" }),
  setDiaryView: (v) => set({ diaryView: v }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setHelpOpen: (open) => set({ helpOpen: open }),
  setExportOpen: (open) => set({ exportOpen: open }),
  setGhostMode: (on) => set({ ghostMode: on }),
  triggerEffect: (e) => set({ effect: e }),
  setMemoryFlash: (on) => set({ memoryFlash: on }),
  setTheme: (t) => {
    try {
      window.localStorage.setItem("archive.theme", t);
    } catch {
      /* ignore */
    }
    set({ theme: t });
  },
  toast: (message, icon) => {
    const id = ++toastId;
    set({ toasts: [...get().toasts, { id, message, icon }] });
    setTimeout(() => {
      set({ toasts: get().toasts.filter((t) => t.id !== id) });
    }, 3400);
  },
  dismissToast: (id) =>
    set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

function rowToDecrypted(
  row: EncEntryRow,
  payload: EntryPayload,
  clue: string | null,
): DecryptedEntry {
  return {
    ...payload,
    id: row.id,
    clue: clue ?? "",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Decrypts every row with the given key. Rows that fail are skipped. */
export async function decryptAll(
  key: CryptoKey,
  rows: EncEntryRow[],
): Promise<DecryptedEntry[]> {
  const out: DecryptedEntry[] = [];
  let skipped = 0;
  for (const row of rows) {
    try {
      const payload = await decryptJSON<EntryPayload>(key, {
        ciphertext: row.ciphertext,
        iv: row.iv,
      });
      out.push({
        ...payload,
        id: row.id,
        clue: row.clue ?? "",
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
    } catch {
      /* undecryptable row — looks like corruption, skip silently */
      skipped++;
    }
  }
  if (skipped > 0) {
    // Count only — never row contents.
    diag("decrypt:rows-skipped", { skipped, total: rows.length });
  }
  return out;
}

export type { CipherPayload };
