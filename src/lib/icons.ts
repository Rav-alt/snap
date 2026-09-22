// The workspace icon registry.
//
// A workspace stores an icon KEY (a plain string like "gamepad") in its data,
// NOT a React component — because the key is what gets saved to JSON. This
// file maps each key to its react-icons component, and resolves a key back to
// a component when rendering.

import type { IconType } from "react-icons";
import {
  FaGamepad,
  FaCode,
  FaBook,
  FaBriefcase,
  FaPalette,
  FaMusic,
  FaWrench,
  FaGlobe,
  FaRegStickyNote,
  FaFilm,
  FaRocket,
  FaTerminal,
  FaLayerGroup,
} from "react-icons/fa";

/** key -> icon component. Add a row here to offer a new icon. */
export const WORKSPACE_ICONS: Record<string, IconType> = {
  gamepad: FaGamepad,
  code: FaCode,
  book: FaBook,
  briefcase: FaBriefcase,
  palette: FaPalette,
  music: FaMusic,
  wrench: FaWrench,
  globe: FaGlobe,
  note: FaRegStickyNote,
  film: FaFilm,
  rocket: FaRocket,
  terminal: FaTerminal,
};

/** The keys in the order the picker shows them. */
export const ICON_KEYS = Object.keys(WORKSPACE_ICONS);

/** The icon a brand-new workspace starts with. */
export const DEFAULT_ICON_KEY = ICON_KEYS[0];

/** Shown when a saved key isn't recognized. */
const FALLBACK: IconType = FaLayerGroup;

// Back-compat: workspaces created before this change stored an emoji in the
// `icon` field. Map those old emojis to the new keys so they still look right.
const EMOJI_COMPAT: Record<string, string> = {
  "🎮": "gamepad",
  "💻": "code",
  "📚": "book",
  "💼": "briefcase",
  "🎨": "palette",
  "🎵": "music",
  "🛠️": "wrench",
  "🌐": "globe",
  "📝": "note",
  "🎬": "film",
};

/** Resolve an icon key (or a legacy emoji) to its component. */
export function iconFor(key: string): IconType {
  if (WORKSPACE_ICONS[key]) return WORKSPACE_ICONS[key];

  const migrated = EMOJI_COMPAT[key];
  if (migrated && WORKSPACE_ICONS[migrated]) return WORKSPACE_ICONS[migrated];

  return FALLBACK;
}
