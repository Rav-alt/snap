// The main screen: sidebar + detail pane, the create/edit modal, and the
// post-launch toast.
//
// This is the "smart" component — it OWNS the state and coordinates the Rust
// commands via lib/tauri: loading, saving, launching, and detecting apps.

import { useEffect, useState } from "react";
import type {
  Workspace,
  WorkspaceDraft,
  LaunchOutcome,
  DetectedApp,
  ChromeProfile,
} from "../types/workspace";
import { makeWorkspaceId } from "../lib/workspaceUtils";
import {
  loadWorkspaces,
  saveWorkspaces,
  launchWorkspace,
  detectApps,
  detectChromeProfiles,
} from "../lib/tauri";
import {
  syncWorkspaceShortcuts,
  clearWorkspaceShortcuts,
} from "../lib/shortcuts";
import { WorkspaceList } from "../components/WorkspaceList";
import { WorkspaceDetail } from "../components/WorkspaceDetail";
import { WorkspaceModal } from "../components/WorkspaceModal";
import { LaunchToast } from "../components/LaunchToast";

// What we remember about the most recent launch, to show in the toast.
interface LaunchReport {
  workspaceName: string;
  outcomes: LaunchOutcome[];
}

// The modal is either closed (null), creating, or editing a specific workspace.
type ModalState = { mode: "create" } | { mode: "edit"; workspace: Workspace };

export function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchReport, setLaunchReport] = useState<LaunchReport | null>(null);

  // Detected apps for the picker.
  const [detectedApps, setDetectedApps] = useState<DetectedApp[]>([]);
  const [isScanning, setIsScanning] = useState(true);

  // Chrome profiles for the per-app Options editor.
  const [chromeProfiles, setChromeProfiles] = useState<ChromeProfile[]>([]);

  // Load saved workspaces once, when the page first mounts.
  useEffect(() => {
    loadWorkspaces()
      .then((loaded) => {
        setWorkspaces(loaded);
        setSelectedId(loaded[0]?.id ?? null);
      })
      .catch((error) => {
        console.error("Failed to load workspaces:", error);
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Scan for installed apps once, in the background.
  useEffect(() => {
    detectApps()
      .then(setDetectedApps)
      .catch((error) => {
        console.error("Failed to detect apps:", error);
      })
      .finally(() => setIsScanning(false));
  }, []);

  // Load Chrome profiles once, for the per-app Options editor.
  useEffect(() => {
    detectChromeProfiles()
      .then(setChromeProfiles)
      .catch((error) => console.error("Failed to detect Chrome profiles:", error));
  }, []);

  const selected = workspaces.find((w) => w.id === selectedId) ?? null;

  // Keep global shortcuts in sync with the current workspaces. Re-runs whenever
  // the list changes, so new/edited/removed shortcuts always take effect.
  useEffect(() => {
    syncWorkspaceShortcuts(workspaces, (id) => {
      const workspace = workspaces.find((w) => w.id === id);
      if (workspace) handleLaunch(workspace);
    }).catch((error) => console.error("Failed to sync shortcuts:", error));

    return () => {
      clearWorkspaceShortcuts().catch(() => {});
    };
    // handleLaunch is intentionally omitted; we re-sync only when workspaces change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaces]);

  // Save a list to disk and surface any failure to the user.
  function persist(next: Workspace[]) {
    saveWorkspaces(next).catch((error) => {
      console.error("Failed to save workspaces:", error);
      alert(`Couldn't save your changes:\n\n${error}`);
    });
  }

  // Handle the modal's submit — meaning depends on the mode.
  function handleSubmit(draft: WorkspaceDraft) {
    if (!modal) return;

    if (modal.mode === "create") {
      const id = makeWorkspaceId(
        draft.name,
        workspaces.map((w) => w.id),
      );
      const workspace: Workspace = { id, ...draft };
      const next = [...workspaces, workspace];
      setWorkspaces(next);
      setSelectedId(id);
      persist(next);
    } else {
      // Edit: keep the original id, replace the matching workspace.
      const id = modal.workspace.id;
      const updated: Workspace = { id, ...draft };
      const next = workspaces.map((w) => (w.id === id ? updated : w));
      setWorkspaces(next);
      setSelectedId(id);
      persist(next);
    }

    setModal(null);
  }

  function handleDelete() {
    if (modal?.mode !== "edit") return;
    const id = modal.workspace.id;
    const next = workspaces.filter((w) => w.id !== id);
    setWorkspaces(next);
    setSelectedId(next[0]?.id ?? null);
    persist(next);
    setModal(null);
  }

  async function handleLaunch(workspace: Workspace) {
    setIsLaunching(true);
    setLaunchReport(null);
    try {
      const outcomes = await launchWorkspace(workspace.id);
      setLaunchReport({ workspaceName: workspace.name, outcomes });
    } catch (error) {
      alert(`Couldn't launch "${workspace.name}":\n\n${error}`);
    } finally {
      setIsLaunching(false);
    }
  }

  if (isLoading) {
    return (
      <div className="grid h-screen w-screen place-items-center bg-neutral-50 text-sm text-neutral-400">
        Loading…
      </div>
    );
  }

  // Shortcuts already used — in edit mode, exclude the workspace being edited
  // so its own current shortcut isn't shown as "in use".
  const editingId = modal?.mode === "edit" ? modal.workspace.id : null;
  const takenShortcuts = workspaces
    .filter((w) => w.id !== editingId)
    .map((w) => w.shortcut);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-50">
      <WorkspaceList
        workspaces={workspaces}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onNew={() => setModal({ mode: "create" })}
      />
      <WorkspaceDetail
        workspace={selected}
        onLaunch={handleLaunch}
        onEdit={(workspace) => setModal({ mode: "edit", workspace })}
        isLaunching={isLaunching}
      />

      {modal && (
        <WorkspaceModal
          key={modal.mode === "edit" ? modal.workspace.id : "create"}
          mode={modal.mode}
          initial={modal.mode === "edit" ? modal.workspace : undefined}
          takenShortcuts={takenShortcuts}
          detectedApps={detectedApps}
          chromeProfiles={chromeProfiles}
          isScanning={isScanning}
          onCancel={() => setModal(null)}
          onSubmit={handleSubmit}
          onDelete={handleDelete}
        />
      )}

      {launchReport && (
        <LaunchToast
          workspaceName={launchReport.workspaceName}
          outcomes={launchReport.outcomes}
          onDismiss={() => setLaunchReport(null)}
        />
      )}
    </div>
  );
}
