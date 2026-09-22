// Right pane: the selected workspace's header, its applications, and its
// shortcut. Presentational — the Launch button just calls a callback.

import { FaPen } from "react-icons/fa";
import type { Workspace } from "../types/workspace";
import { ShortcutBadge } from "./ShortcutBadge";
import { WorkspaceIcon } from "./WorkspaceIcon";
import { AppIcon } from "./AppIcon";

interface WorkspaceDetailProps {
  workspace: Workspace | null;
  onLaunch: (workspace: Workspace) => void;
  onEdit: (workspace: Workspace) => void;
  isLaunching: boolean;
}

export function WorkspaceDetail({
  workspace,
  onLaunch,
  onEdit,
  isLaunching,
}: WorkspaceDetailProps) {
  // Empty state — nothing selected (e.g. no workspaces yet).
  if (!workspace) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center bg-neutral-50 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-lg font-bold text-neutral-300 shadow-sm ring-1 ring-neutral-200">
          S
        </div>
        <p className="mt-4 text-sm font-medium text-neutral-600">
          No workspace selected
        </p>
        <p className="mt-1 text-sm text-neutral-400">
          Pick one from the left, or create a new workspace.
        </p>
      </section>
    );
  }

  const appCount = workspace.applications.length;

  return (
    <section className="flex flex-1 flex-col bg-neutral-50">
      {/* Header bar */}
      <header className="flex items-center justify-between gap-4 border-b border-neutral-200 bg-white px-8 py-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-neutral-100 text-neutral-700">
            <WorkspaceIcon iconKey={workspace.icon} className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">
              {workspace.name}
            </h2>
            <p className="text-sm text-neutral-500">
              {appCount} {appCount === 1 ? "application" : "applications"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(workspace)}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            <FaPen className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            onClick={() => onLaunch(workspace)}
            disabled={isLaunching}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M6 4.5v11a.5.5 0 0 0 .77.42l8.5-5.5a.5.5 0 0 0 0-.84l-8.5-5.5A.5.5 0 0 0 6 4.5Z" />
            </svg>
            {isLaunching ? "Launching…" : "Launch Workspace"}
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto max-w-2xl space-y-8">
          {/* Applications */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Applications
            </h3>
            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
              {appCount === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-neutral-400">
                  No applications yet.
                </p>
              ) : (
                <ul className="divide-y divide-neutral-100">
                  {workspace.applications.map((app, index) => (
                    <li key={index} className="flex items-center gap-3 px-4 py-3">
                      <AppIcon path={app.path} name={app.name} className="h-8 w-8" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-neutral-800">
                          {app.name}
                        </p>
                        <p className="truncate text-xs text-neutral-400">
                          {app.path}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Shortcut */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Shortcut
            </h3>
            <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3">
              <ShortcutBadge shortcut={workspace.shortcut} />
              <span className="text-xs text-neutral-400">
                Global shortcut — coming in a later step
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
