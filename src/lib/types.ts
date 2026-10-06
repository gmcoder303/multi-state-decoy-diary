export interface VaultRow {
  id: number;
  salt: string;
  verifierCiphertext: string;
  verifierIv: string;
  iterations: number;
  question: string;
  createdAt: string;
}

export interface EncEntryRow {
  id: string;
  ciphertext: string;
  iv: string;
  clue: string | null;
  createdAt: string;
  updatedAt: string;
}

/** The plaintext shape that lives ONLY inside AES-GCM ciphertext. */
export interface EntryPayload {
  title: string;
  content: string;
  date: string; // ISO yyyy-mm-dd
  time: string; // HH:mm
  tags: string[];
  mood: string;
  starred: boolean;
}

/** A fully decrypted entry — exists only in browser memory. */
export interface DecryptedEntry extends EntryPayload {
  id: string;
  clue: string;
  createdAt: string;
  updatedAt: string;
}

export type AppPhase =
  | "boot"
  | "archive" // Diary 1 — corrupted archive
  | "gateway" // terminal transition after :unlock
  | "auth" // five-factor authentication (unlock or setup)
  | "decoy" // Diary 2 — blank decoy
  | "diary"; // Diary 3 — real unlocked diary

export const MOODS = [
  "calm",
  "content",
  "happy",
  "excited",
  "grateful",
  "tired",
  "anxious",
  "sad",
  "angry",
  "reflective",
] as const;

export const MOOD_COLORS: Record<string, string> = {
  calm: "#6fb3b8",
  content: "#8fbf8f",
  happy: "#f2c14e",
  excited: "#f2994a",
  grateful: "#c8a2e8",
  tired: "#9aa5b1",
  anxious: "#e08e8e",
  sad: "#7f9ccb",
  angry: "#d96a5b",
  reflective: "#a79f8f",
};
