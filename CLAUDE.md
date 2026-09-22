# CLAUDE.md — Snap

> **Snap: Launch your entire desktop workspace with one shortcut.**
> Group apps into a *Workspace*, assign a global shortcut, launch them all at once.
> Windows-first desktop utility. Runs in the system tray and listens for global shortcuts.

This file is the quick-reference context for the project. The full rulebook lives in the
project's custom instructions — read that for the detailed reasoning. Keep the **Current
Status** section at the bottom up to date; it's the part that changes.

---

## Stack (locked in — do not swap without being asked)

| Layer      | Tech                          |
| ---------- | ----------------------------- |
| Shell      | Tauri 2                       |
| Frontend   | React + TypeScript + Tailwind |
| Backend    | Rust                          |
| Target OS  | Windows (primary)             |

Not Electron, WPF, WinForms, or Flutter.

---

## Architecture

```
React / TypeScript      ← UI, state, user interaction
      │  invoke("command_name", args)     // React asks Rust to do something
      ▼
Tauri Commands (Rust)   ← the bridge; each command is one focused function
      ▼
Rust                    ← process launching, OS work
      ▼
Windows APIs / OS
```

**invoke()** = React asking the Rust side to perform an operation, and awaiting a result.
Rust returns `Ok(value)` → resolves the promise, or `Err(message)` → rejects it.

### What lives where

| Frontend (React/TS)                         | Backend (Rust/Tauri)                          |
| ------------------------------------------- | --------------------------------------------- |
| UI and layout                               | Launching applications                        |
| Workspace management screens                | Global keyboard shortcuts                     |
| Application-selection UI                    | System tray                                   |
| Settings                                    | Windows API / native calls                    |
| State management                            | Window detection / positioning / resizing     |

Rule: **no Windows-specific logic in React.** If it touches the OS, it goes in Rust behind a command.

---

## Workspace data model

Stored locally (simple file for the MVP — no database unless there's a real reason).

```json
{
  "id": "gaming",
  "name": "Gaming",
  "shortcut": "Ctrl+Alt+1",
  "applications": [
    { "name": "Discord", "path": "C:\\Path\\To\\Discord.exe" }
  ]
}
```

---

## Roadmap

```
[1] Project setup            ← CURRENT PHASE
[2] Basic UI
[3] Workspace creation
[4] Local workspace storage
[5] Application launching
[6] Global shortcuts
[7] System tray / background
[8] Window positioning
[9] Multi-monitor
[10] Polish + packaging
```

**Immediate goal:** a working Tauri + React + TS + Rust project, and a clear understanding
of how the frontend and Rust backend communicate (one round-trip through `invoke()`).

**MVP done =** create/name a workspace → add apps → save → list → launch all → assign a
global shortcut → launch by shortcut → run in the tray. Nothing past step [7] until the
MVP is stable.

---

## Working agreement (how to help on this project)

- **Explain before coding.** For each feature: what we're building, why, which layer,
  how React talks to Rust, key decisions, likely problems, how to test.
- **Small increments.** Smallest implementation that works. One feature at a time; don't
  start the next until the current one runs.
- **Don't overbuild.** No advanced features before the basics work. No design pattern just
  because it's popular — simplest thing that solves the problem.
- **Don't make unrequested changes.** No rewriting unrelated code, swapping libraries, or
  refactoring working code. Flag and *ask* before any large architectural change.
- **Teaching audience:** comfortable with programming and web dev; newer to Rust, Tauri,
  Windows APIs, and desktop architecture. Explain those; skip basic React.
- **Dependencies:** before adding one — what it does, why the stack can't handle it, whether
  Tauri already provides it. No libraries for trivial convenience.
- **Code quality:** TS strict mode, strong types, avoid `any`, small focused functions,
  clear names, validate input, handle errors, keep the frontend/native boundary clean.

---

## Windows gotchas to keep in mind

Not every app is a plain `.exe`: launcher-based apps (Steam, Roblox), shortcut targets,
apps already running, apps needing admin, differing install locations. Handle a missing
executable gracefully (clear message + "Locate" / "Remove" — never silent failure). Pass
Rust errors back to the frontend as useful messages, not raw technical dumps.

**Shortcuts:** global (must work unfocused), eventually user-configurable. Pick a safe
default — **not** `Ctrl + C + C` (collides with copy). `Ctrl + Alt + <number>` is the
working default.

---

## UI direction

Modern desktop utility: clean layout, good spacing, clear hierarchy, keyboard-friendly,
light theme first. Avoid excessive animation, gradients, rounded cards, clutter. Function
over decoration.

---

## Current Status  *(keep this updated)*

- **Phases done:** [1]–[7] ALL DONE (setup, UI, create, storage, launch, global
  shortcuts, system tray). Plus extras: app detection, real .exe icons, edit/delete.
  **🎉 Core MVP complete.** Next: the "later" list — launch-on-startup, packaging/
  installer, then window positioning / multi-monitor.
- **Tray behavior:** window close HIDES to tray (on_window_event → prevent_close),
  Snap keeps running so shortcuts work with no window. Tray menu = Show Snap / Quit Snap.
  Dev note: window X no longer stops `tauri dev` — use tray Quit or Ctrl+C. Needs tauri
  `features = ["tray-icon","image-png"]`.
- **Environment:** Windows dev machine. Node v24.18.0, Rust 1.98.1. Project at
  `C:\Projects\snap`. Gotchas learned:
  - `cargo` is only on PATH in **cmd**, not Git Bash — run `npm run tauri dev` from cmd.
  - Windows 11 **Smart App Control** blocked the unsigned dev exe (os error 4551);
    turned OFF (one-way switch) so dev builds run.
- **Dependencies added:** JS: `react-icons`, `@tailwindcss/vite`/`tailwindcss`,
  `@tauri-apps/plugin-global-shortcut`. Rust: `systemicons` (exe icons), `base64`,
  `tauri-plugin-global-shortcut`. Global-shortcut needs capability perms in
  `capabilities/default.json` (`global-shortcut:allow-*`).
- **Frontend (`src/`):** Tailwind v4 (no config file). Structure:
  `pages/WorkspacesPage` (smart, owns state) · `components/` (WorkspaceList,
  WorkspaceDetail, WorkspaceModal [create+edit], ShortcutBadge, LaunchToast,
  WorkspaceIcon, AppIcon) · `lib/tauri.ts` (ALL invoke() calls) · `lib/shortcuts.ts`
  (global shortcuts) · `lib/icons.ts` (workspace icon key→component registry) ·
  `lib/appIcons.ts` (per-path exe-icon cache) · `lib/workspaceUtils.ts` · `types/workspace.ts`.
  Dead files safe to delete: `lib/sampleData.ts`, `components/NewWorkspaceModal.tsx`.
- **Backend (`src-tauri/src/lib.rs`):** commands `load_workspaces`, `save_workspaces`,
  `launch_workspace(id)`, `detect_apps`, `get_app_icon(path)`, `greet`. Storage = pretty
  JSON at `%APPDATA%\com.snap.app\workspaces.json`. `detect_apps` = PowerShell scan of
  Start Menu .lnk → exe targets. `get_app_icon` = systemicons → base64 data URL.
  Global-shortcut plugin loaded in `.setup()`; shortcuts registered from frontend.
- **Data model notes:** workspace `icon` field stores an ICON KEY (e.g. "gamepad"), not an
  emoji — mapped to components in `lib/icons.ts` (has emoji back-compat shim). Editing keeps
  the original `id`; only create generates a new id.
- **Decisions made:** stack locked (Vite+React, no Next). Storage = plain JSON, no DB.
  Shortcuts = `Ctrl+Alt+<number>`, taken ones blocked in UI. One modal serves create+edit
  via a `mode` prop. Shortcuts registered from JS (reuses `launchWorkspace`).
- **Command checklist (every new Rust command):** tag `#[tauri::command]` AND add to
  `generate_handler![...]`. React arg keys camelCase, Rust params snake_case (auto).
  Rust `Result<T,String>`: Ok → resolves promise, Err → throws in `await`.
- **Known limitations:** launcher/`.lnk` apps (Steam, Roblox) & UWP/Store apps may not
  spawn/detect via direct `.exe`; admin apps won't elevate. Global shortcuts only work
  while Snap's process runs (no tray yet, so closing the window quits it → shortcuts stop).
- **Next step:** [7] system tray — keep Snap running in the background on window close,
  with a tray icon + menu, so global shortcuts keep working after closing the window.

_Last updated: 2026-09-22_
