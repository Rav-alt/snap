// Temporary in-memory sample data so we can build and see the UI before
// real saving/loading exists. This whole file gets deleted once workspaces
// are stored on disk (Phase 5). Paths here are illustrative, not real.

import type { Workspace } from "../types/workspace";

export const sampleWorkspaces: Workspace[] = [
  {
    id: "gaming",
    name: "Gaming",
    icon: "🎮",
    shortcut: "Ctrl+Alt+1",
    applications: [
      { name: "Discord", path: "C:\\Users\\Dev\\AppData\\Local\\Discord\\Discord.exe" },
      { name: "Spotify", path: "C:\\Users\\Dev\\AppData\\Roaming\\Spotify\\Spotify.exe" },
      { name: "Chrome", path: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" },
    ],
  },
  {
    id: "coding",
    name: "Coding",
    icon: "💻",
    shortcut: "Ctrl+Alt+2",
    applications: [
      { name: "VS Code", path: "C:\\Users\\Dev\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe" },
      { name: "Chrome", path: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" },
    ],
  },
  {
    id: "school",
    name: "School",
    icon: "📚",
    shortcut: "Ctrl+Alt+3",
    applications: [
      { name: "Chrome", path: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" },
    ],
  },
];
