// The single place where the frontend talks to Rust.
//
// Every call to Tauri's `invoke()` lives here, wrapped in a small typed
// function. The rest of the app imports these helpers instead of importing
// Tauri directly, so:
//   - There's one file to see everything Rust can do.
//   - Types are declared once (invoke() is otherwise untyped).
//   - If a command's name or arguments change, we fix it in one spot.

import { invoke } from "@tauri-apps/api/core";
import type {
  Workspace,
  LaunchOutcome,
  DetectedApp,
  ChromeProfile,
} from "../types/workspace";

/**
 * Load all saved workspaces from disk.
 * Returns an empty array on first run (no file yet).
 */
export function loadWorkspaces(): Promise<Workspace[]> {
  return invoke<Workspace[]>("load_workspaces");
}

/**
 * Save the given workspaces to disk, replacing what was there.
 * The Rust side handles where the file lives and creating the folder.
 */
export function saveWorkspaces(workspaces: Workspace[]): Promise<void> {
  // The object key `workspaces` must match the Rust parameter name.
  return invoke<void>("save_workspaces", { workspaces });
}

/**
 * Launch every application in the workspace with the given id.
 * Returns one outcome per app (which started, which failed and why).
 */
export function launchWorkspace(id: string): Promise<LaunchOutcome[]> {
  return invoke<LaunchOutcome[]>("launch_workspace", { id });
}

/**
 * Scan the machine for installed applications (via Start Menu shortcuts).
 * Returns a list of { name, path } the user can pick from.
 */
export function detectApps(): Promise<DetectedApp[]> {
  return invoke<DetectedApp[]>("detect_apps");
}

/**
 * Get an app's icon (extracted from its .exe) as a PNG data URL.
 * Rejects if the file has no icon — callers should fall back gracefully.
 */
export function getAppIcon(path: string): Promise<string> {
  return invoke<string>("get_app_icon", { path });
}

/** List the user's Chrome profiles (folder name + display name). */
export function detectChromeProfiles(): Promise<ChromeProfile[]> {
  return invoke<ChromeProfile[]>("detect_chrome_profiles");
}

/**
 * Demo command from the Tauri starter — kept as a reference example.
 * Safe to delete once you're comfortable with the pattern.
 */
export function greet(name: string): Promise<string> {
  return invoke<string>("greet", { name });
}
