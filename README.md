<div align="center">

# ⚡ Snap

**Launch your entire desktop workspace with one keyboard shortcut.**

Group your apps into *workspaces* and open them all at once — a lightweight Windows tray utility built with Tauri, React & Rust.

</div>

---

## What is Snap?

Snap lets you bundle a set of applications into a **workspace** and launch them together with a single global shortcut. Press `Ctrl + Alt + 1` and your *Gaming* setup — Discord, Spotify, Chrome, your game — all open at once. Press `Ctrl + Alt + 2` for *Coding*. It lives quietly in the system tray, so your shortcuts work anytime, without keeping a window open.

```
Gaming        ▶  Discord · Spotify · Chrome · Roblox
Coding        ▶  VS Code · Chrome · Terminal
School        ▶  Chrome (Classroom, Drive, Docs)
```

## Features

- 🚀 **One-shortcut launch** — open a whole group of apps with a single global hotkey that works even when Snap isn't focused.
- 🔍 **App auto-detection** — pick from a searchable list of your installed apps instead of typing file paths.
- 🖼️ **Real app icons** — each app shows its actual icon, extracted straight from the executable.
- 🌐 **Chrome tabs & profiles** — a Chrome-aware editor to open specific tabs and choose which Chrome profile to launch.
- ⚙️ **Per-app arguments** — pass command-line flags to any app.
- 🗂️ **Create, edit & delete** workspaces with custom names, icons, and shortcuts (with conflict prevention).
- 💾 **Local persistence** — workspaces are saved to a simple JSON file; no account, no cloud.
- 🪟 **System tray** — runs in the background; closing the window minimizes to the tray.

## Screenshots

> _Add screenshots here_ — e.g. the workspace list, the create/edit modal, and the Chrome options panel.

<!--
![Main window](docs/main.png)
![New workspace](docs/new-workspace.png)
-->

## Tech stack

| Layer     | Technology                    |
| --------- | ----------------------------- |
| Shell     | [Tauri 2](https://tauri.app)  |
| Frontend  | React + TypeScript + Tailwind CSS |
| Backend   | Rust                          |
| Platform  | Windows                       |

The frontend handles all UI and state; Rust handles the native work — launching processes, global shortcuts, the system tray, reading app icons, and detecting installed apps and Chrome profiles.

## Getting started

### Prerequisites

- **[Node.js](https://nodejs.org)** 18+
- **[Rust](https://rustup.rs)** (install via `rustup` — this also installs `cargo`)
- **Microsoft C++ Build Tools** and **WebView2** (WebView2 ships with modern Windows; the MSVC build tools come with the Rust MSVC toolchain / Visual Studio Build Tools)

### Run in development

```bash
git clone https://github.com/<your-username>/snap.git
cd snap
npm install
npm run tauri dev
```

The first run compiles the Rust backend from scratch and takes a few minutes; subsequent runs are fast.

### Build a release

```bash
npm run tauri build
```

This produces an installer / executable in `src-tauri/target/release/`.

### Windows notes

- **Run from Command Prompt**, not Git Bash — `cargo` may not be on Git Bash's `PATH` even when Rust is installed.
- If a dev build won't launch with **"An Application Control policy has blocked this file"**, Windows 11 **Smart App Control** is blocking the unsigned build. Turn it off in *Windows Security → App & browser control → Smart App Control* (note: this is a one-way switch), or use a properly signed release build.

## Project structure

```
snap/
├─ src/                      # React + TypeScript frontend
│  ├─ pages/                 # top-level screens (owns state)
│  ├─ components/            # UI pieces
│  ├─ lib/                   # invoke() wrappers, shortcuts, icon helpers
│  └─ types/                 # shared TypeScript types
└─ src-tauri/                # Rust backend
   ├─ src/lib.rs             # Tauri commands (launch, save/load, detect, tray)
   └─ capabilities/          # plugin permissions
```

Workspaces are stored at `%APPDATA%\com.snap.app\workspaces.json`.

## How it works

React never touches the operating system directly. When you launch a workspace, the frontend calls a Rust **command** through Tauri's `invoke()`, and Rust does the native work:

```
React (UI)  ──invoke("launch_workspace", { id })──▶  Rust  ──▶  Windows
```

The same pattern powers saving to disk, detecting installed apps, reading `.exe` icons, listing Chrome profiles, and registering global shortcuts.

## Roadmap

- [ ] Launch on Windows startup
- [ ] Packaged, signed installer
- [ ] Remember & restore window positions / sizes
- [ ] Multi-monitor placement
- [ ] Import / export workspaces

## Author

Built by **Jhon Raven Cadiz**.

## License

_Choose a license (e.g. [MIT](https://choosealicense.com/licenses/mit/)) and add it here as `LICENSE`._
