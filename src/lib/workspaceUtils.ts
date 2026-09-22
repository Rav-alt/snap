// Small pure helpers for working with workspaces. "Pure" = no React, no side
// effects, just input → output. Easy to reason about and easy to test.

/** Turn a display name into a url-safe slug, e.g. "My Games!" -> "my-games". */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-") // non-alphanumeric runs become a single hyphen
    .replace(/^-+|-+$/g, ""); // trim leading/trailing hyphens
}

/**
 * Build a unique workspace id from its name, avoiding collisions with ids
 * that already exist (adds "-2", "-3", ... if needed).
 */
export function makeWorkspaceId(name: string, existingIds: string[]): string {
  const base = slugify(name) || "workspace";
  if (!existingIds.includes(base)) return base;

  let n = 2;
  while (existingIds.includes(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/** The numbers we offer for the default Ctrl+Alt+N shortcut scheme. */
export const SHORTCUT_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/** Format a number as its shortcut string, e.g. 1 -> "Ctrl+Alt+1". */
export function shortcutForNumber(n: number): string {
  return `Ctrl+Alt+${n}`;
}

/** Pick the first Ctrl+Alt+N shortcut not already taken. */
export function firstFreeShortcut(taken: string[]): string {
  for (const n of SHORTCUT_NUMBERS) {
    const candidate = shortcutForNumber(n);
    if (!taken.includes(candidate)) return candidate;
  }
  return shortcutForNumber(1); // fallback if somehow all are taken
}
