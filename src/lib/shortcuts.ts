// Global keyboard shortcuts, wrapped in one place (like lib/tauri.ts).
//
// We register one OS-level shortcut per workspace. When a shortcut fires, the
// plugin calls our handler with an event; we act only on "Pressed" (otherwise
// it would also fire on key release). The rest of the app calls
// syncWorkspaceShortcuts whenever the workspace list changes.

import { register, unregisterAll } from "@tauri-apps/plugin-global-shortcut";
import type { Workspace } from "../types/workspace";

/**
 * Re-register all workspace shortcuts from scratch.
 * Clears the old ones first so stale bindings never linger.
 */
export async function syncWorkspaceShortcuts(
  workspaces: Workspace[],
  onTrigger: (workspaceId: string) => void,
): Promise<void> {
  await unregisterAll();

  for (const workspace of workspaces) {
    if (!workspace.shortcut) continue;
    try {
      await register(workspace.shortcut, (event) => {
        if (event.state === "Pressed") onTrigger(workspace.id);
      });
    } catch (error) {
      // A shortcut may fail if another app already owns it globally.
      console.error(`Failed to register ${workspace.shortcut}:`, error);
    }
  }
}

/** Remove all of Snap's global shortcuts (e.g. on cleanup). */
export async function clearWorkspaceShortcuts(): Promise<void> {
  await unregisterAll();
}
