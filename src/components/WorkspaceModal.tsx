// A modal for BOTH creating a new workspace and editing an existing one.
//
// The two flows share the exact same form (name, icon, shortcut, apps), so
// they share one component. `mode` decides the title, the submit label, and
// whether a Delete button appears; `initial` pre-fills the form when editing.
//
// It owns only its own draft state and hands a WorkspaceDraft back via
// onSubmit — the parent decides whether that means "add" or "update".

import { useEffect, useState } from "react";
import type {
  Application,
  ChromeProfile,
  DetectedApp,
  Workspace,
  WorkspaceDraft,
} from "../types/workspace";
import {
  firstFreeShortcut,
  shortcutForNumber,
  SHORTCUT_NUMBERS,
} from "../lib/workspaceUtils";
import { ICON_KEYS, DEFAULT_ICON_KEY } from "../lib/icons";
import { WorkspaceIcon } from "./WorkspaceIcon";
import { AppIcon } from "./AppIcon";
import { AddedAppRow } from "./AddedAppRow";

// Cap how many search results we render at once, for performance.
const MAX_RESULTS = 100;

interface WorkspaceModalProps {
  mode: "create" | "edit";
  /** The workspace being edited, used to pre-fill the form. Omit for create. */
  initial?: Workspace;
  /** Shortcuts used by OTHER workspaces, so we can flag clashes. */
  takenShortcuts: string[];
  detectedApps: DetectedApp[];
  chromeProfiles: ChromeProfile[];
  isScanning: boolean;
  onCancel: () => void;
  onSubmit: (draft: WorkspaceDraft) => void;
  /** Only used in edit mode. */
  onDelete?: () => void;
}

export function WorkspaceModal({
  mode,
  initial,
  takenShortcuts,
  detectedApps,
  chromeProfiles,
  isScanning,
  onCancel,
  onSubmit,
  onDelete,
}: WorkspaceModalProps) {
  // Pre-fill from `initial` when editing; sensible defaults when creating.
  const [name, setName] = useState(initial?.name ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? DEFAULT_ICON_KEY);
  const [shortcut, setShortcut] = useState(
    () => initial?.shortcut ?? firstFreeShortcut(takenShortcuts),
  );
  const [applications, setApplications] = useState<Application[]>(
    initial ? [...initial.applications] : [],
  );

  // Search box for the detected-apps picker.
  const [search, setSearch] = useState("");
  // Whether the manual "type a path" fallback is shown.
  const [showManual, setShowManual] = useState(false);
  const [appName, setAppName] = useState("");
  const [appPath, setAppPath] = useState("");

  // Let the user press Escape to close the modal.
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  const canSave = name.trim() !== "";
  const canAddManual = appName.trim() !== "" && appPath.trim() !== "";

  function isAdded(path: string): boolean {
    return applications.some((app) => app.path === path);
  }

  function addApp(app: Application) {
    if (isAdded(app.path)) return;
    setApplications((prev) => [...prev, { ...app, args: app.args ?? [] }]);
  }

  function removeApp(index: number) {
    setApplications((prev) => prev.filter((_, i) => i !== index));
  }

  function updateApp(index: number, updated: Application) {
    setApplications((prev) => prev.map((a, i) => (i === index ? updated : a)));
  }

  function addManual() {
    if (!canAddManual) return;
    addApp({ name: appName.trim(), path: appPath.trim() });
    setAppName("");
    setAppPath("");
  }

  function submit() {
    if (!canSave) return;
    onSubmit({ name: name.trim(), icon, shortcut, applications });
  }

  function handleDelete() {
    if (!onDelete) return;
    const sure = window.confirm(
      `Delete "${initial?.name}"? This can't be undone.`,
    );
    if (sure) onDelete();
  }

  // Filter detected apps by the search term, then cap the number shown.
  const query = search.trim().toLowerCase();
  const filtered = detectedApps
    .filter((app) => app.name.toLowerCase().includes(query))
    .slice(0, MAX_RESULTS);

  const title = mode === "edit" ? "Edit Workspace" : "New Workspace";
  const submitLabel = mode === "edit" ? "Save Changes" : "Create Workspace";

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
          <button
            onClick={onCancel}
            className="grid h-8 w-8 place-items-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 overflow-y-auto px-6 py-5">
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Name
            </label>
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
              placeholder="e.g. Gaming"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Icon */}
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Icon
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ICON_KEYS.map((key) => (
                <button
                  key={key}
                  onClick={() => setIcon(key)}
                  className={
                    "grid h-9 w-9 place-items-center rounded-md transition " +
                    (icon === key
                      ? "bg-blue-50 text-blue-600 ring-2 ring-blue-500"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200")
                  }
                >
                  <WorkspaceIcon iconKey={key} className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Shortcut */}
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Shortcut
            </label>
            <select
              value={shortcut}
              onChange={(event) => setShortcut(event.currentTarget.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {SHORTCUT_NUMBERS.map((n) => {
                const value = shortcutForNumber(n);
                const isTaken =
                  takenShortcuts.includes(value) && value !== shortcut;
                return (
                  <option key={n} value={value} disabled={isTaken}>
                    {value}
                    {isTaken ? " (in use)" : ""}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Applications */}
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Applications
            </label>

            {/* Apps already in this workspace (each has an Options panel) */}
            {applications.length > 0 && (
              <ul className="mb-2 divide-y divide-neutral-100 overflow-hidden rounded-lg border border-neutral-200">
                {applications.map((app, index) => (
                  <AddedAppRow
                    key={index}
                    app={app}
                    index={index}
                    chromeProfiles={chromeProfiles}
                    onRemove={removeApp}
                    onChange={updateApp}
                  />
                ))}
              </ul>
            )}

            {/* Detected-apps picker */}
            <div className="overflow-hidden rounded-lg border border-neutral-200">
              <div className="border-b border-neutral-100 p-2">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.currentTarget.value)}
                  placeholder="Search installed apps…"
                  className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="max-h-48 overflow-y-auto">
                {isScanning ? (
                  <p className="px-3 py-6 text-center text-sm text-neutral-400">
                    Scanning your apps…
                  </p>
                ) : filtered.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-neutral-400">
                    {detectedApps.length === 0
                      ? "No apps detected."
                      : "No matches."}
                  </p>
                ) : (
                  <ul>
                    {filtered.map((app) => {
                      const added = isAdded(app.path);
                      return (
                        <li key={app.path}>
                          <button
                            onClick={() => addApp(app)}
                            disabled={added}
                            className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-neutral-50 disabled:opacity-60"
                          >
                            <AppIcon
                              path={app.path}
                              name={app.name}
                              className="h-7 w-7"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-neutral-800">
                                {app.name}
                              </p>
                              <p className="truncate text-xs text-neutral-400">
                                {app.path}
                              </p>
                            </div>
                            <span
                              className={
                                "shrink-0 text-xs font-medium " +
                                (added ? "text-neutral-400" : "text-blue-600")
                              }
                            >
                              {added ? "Added" : "+ Add"}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            {/* Manual fallback */}
            <button
              onClick={() => setShowManual((prev) => !prev)}
              className="mt-2 text-xs font-medium text-neutral-500 hover:text-neutral-700"
            >
              {showManual ? "Hide manual entry" : "Can't find it? Add a path manually"}
            </button>

            {showManual && (
              <div className="mt-2 space-y-2 rounded-lg border border-dashed border-neutral-300 p-3">
                <input
                  value={appName}
                  onChange={(event) => setAppName(event.currentTarget.value)}
                  placeholder="App name (e.g. Discord)"
                  className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500"
                />
                <input
                  value={appPath}
                  onChange={(event) => setAppPath(event.currentTarget.value)}
                  placeholder="C:\Path\To\App.exe"
                  className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500"
                />
                <button
                  onClick={addManual}
                  disabled={!canAddManual}
                  className="w-full rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Add application
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-neutral-200 px-6 py-4">
          {/* Delete lives on the left, only when editing. */}
          <div>
            {mode === "edit" && (
              <button
                onClick={handleDelete}
                className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={!canSave}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
