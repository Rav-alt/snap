// Shared data types for Snap.
//
// These mirror the shape we'll eventually save to disk and pass to Rust,
// so keeping them in one place means the whole app agrees on what a
// "workspace" and an "application" look like.

/** A single application that belongs to a workspace. */
export interface Application {
  /** Display name, e.g. "Discord". */
  name: string;
  /** Full path to the executable, e.g. "C:\\Path\\To\\Discord.exe". */
  path: string;
  /** Extra command-line arguments (e.g. Chrome URLs and --profile-directory). */
  args?: string[];
}

/** A Chrome profile: folder name (for --profile-directory) + display name. */
export interface ChromeProfile {
  directory: string;
  name: string;
}

/** A named group of applications launched together by one shortcut. */
export interface Workspace {
  /** Stable unique id, e.g. "gaming". Used as a React key and lookup key. */
  id: string;
  /** Display name, e.g. "Gaming". */
  name: string;
  /** Icon key (see src/lib/icons.ts), e.g. "gamepad". Purely visual. */
  icon: string;
  /** Global shortcut string, e.g. "Ctrl+Alt+1". */
  shortcut: string;
  /** The applications this workspace launches. */
  applications: Application[];
}

/**
 * A workspace being created, before it has an id. The id is assigned by the
 * page that owns the workspace list, so the creation form doesn't need to
 * know about existing ids. `Omit<Workspace, "id">` = a Workspace minus its id.
 */
export type WorkspaceDraft = Omit<Workspace, "id">;

/**
 * The result of trying to launch one application, returned by Rust.
 * Mirrors the LaunchOutcome struct in src-tauri/src/lib.rs.
 */
export interface LaunchOutcome {
  name: string;
  path: string;
  /** true if the app started, false if it failed. */
  ok: boolean;
  /** A friendly message when ok is false; null when ok is true. */
  error: string | null;
}

/**
 * An application detected on the machine, returned by the detect_apps command.
 * Same shape as Application, but named separately to make intent clear.
 */
export interface DetectedApp {
  name: string;
  path: string;
}
