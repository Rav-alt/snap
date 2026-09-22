// Left sidebar: brand, the list of workspaces, and the "New Workspace" button.
//
// Presentational only — it receives data and callbacks from WorkspacesPage
// and owns no state of its own.

import type { Workspace } from "../types/workspace";
import { WorkspaceIcon } from "./WorkspaceIcon";

interface WorkspaceListProps {
  workspaces: Workspace[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}

export function WorkspaceList({
  workspaces,
  selectedId,
  onSelect,
  onNew,
}: WorkspaceListProps) {
  return (
    <aside className="flex w-72 flex-col border-r border-neutral-200 bg-white">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-600 text-sm font-bold text-white">
          S
        </div>
        <div className="leading-tight">
          <h1 className="text-sm font-semibold text-neutral-900">Snap</h1>
          <p className="text-xs text-neutral-500">One shortcut, your whole setup</p>
        </div>
      </div>

      {/* Section label */}
      <p className="px-5 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
        Workspaces
      </p>

      {/* Workspace list */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {workspaces.map((workspace) => {
          const isSelected = workspace.id === selectedId;
          const appCount = workspace.applications.length;
          return (
            <button
              key={workspace.id}
              onClick={() => onSelect(workspace.id)}
              className={
                "group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors " +
                (isSelected
                  ? "bg-blue-50 text-blue-700"
                  : "text-neutral-700 hover:bg-neutral-100")
              }
            >
              <span
                className={
                  "grid h-8 w-8 shrink-0 place-items-center rounded-md transition-colors " +
                  (isSelected ? "bg-white" : "bg-neutral-100 group-hover:bg-white")
                }
              >
                <WorkspaceIcon iconKey={workspace.icon} className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {workspace.name}
                </span>
                <span
                  className={
                    "block text-xs " +
                    (isSelected ? "text-blue-500" : "text-neutral-400")
                  }
                >
                  {appCount} {appCount === 1 ? "app" : "apps"}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      {/* New Workspace */}
      <div className="p-3">
        <button
          onClick={onNew}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-600 transition-colors hover:border-blue-400 hover:text-blue-600"
        >
          <span className="text-base leading-none">+</span>
          New Workspace
        </button>
      </div>
    </aside>
  );
}
