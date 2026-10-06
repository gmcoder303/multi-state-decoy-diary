export interface CommandSpec {
  name: string;
  description: string;
  secret?: boolean;
}

export const COMMANDS: CommandSpec[] = [
  { name: "unlock", description: "initialize the archive (from the archive)" },
  { name: "lock", description: "seal the diary and return to the archive" },
  { name: "random", description: "surface a random memory" },
  { name: "today", description: "open today's entry" },
  { name: "oldest", description: "open your oldest entry" },
  { name: "latest", description: "open your most recent entry" },
  { name: "stats", description: "open writing statistics" },
  { name: "search", description: "focus the search bar" },
  { name: "settings", description: "open settings" },
  { name: "export", description: "export diary data" },
  { name: "help", description: "show available commands" },
  { name: "new", description: "create a new entry" },
];

export const EASTER_EGGS: Record<string, string> = {
  void: "you stare into the void. nothing stares back. probably.",
  ghost: "the diary grows quiet. translucent. watchful.",
  matrix: "follow the white rabbit.",
  forget: "nothing was forgotten. everything is as it was.",
  coffee: "the archive hums approvingly. caffeine levels acceptable.",
  "42": "the answer to life, the universe, and this diary.",
  hello: "hello, keeper of small hours.",
};

export interface ParsedCommand {
  name: string;
  args: string;
}

export function parseCommand(input: string): ParsedCommand | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith(":")) return null;
  const body = trimmed.slice(1).trim();
  if (!body) return { name: "", args: "" };
  const [name, ...rest] = body.split(/\s+/);
  return { name: name.toLowerCase(), args: rest.join(" ") };
}
