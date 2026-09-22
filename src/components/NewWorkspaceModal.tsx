// The "New Workspace" form, shown as a modal dialog.
//
// It collects a name, icon, shortcut, and a list of applications, then hands
// a WorkspaceDraft to the parent via onCreate. Applications can be added two
// ways: picked from the machine's detected apps (preferred), or typed in by
// hand as a fallback. It owns only its own draft state.

import { useEffect, useState } from "react";
import type {
  Application,
  DetectedApp,
  WorkspaceDraft,
} from "../types/workspace";
import {
  firstFreeShortcut,
  shortcutForNumber,
  SHORTCUT_NUMBERS,
} from "../lib/workspaceUtils";
import { ICON_KEYS, DEFAULT_ICON_KEY } from "../lib/icons";
import { WorkspaceIcon } from "./WorkspaceIcon";

// Cap how many search results we render at once, for performance.
const MAX_RESULTS = 100;

interface NewWorkspaceModalProps {
  takenShortcuts: string[];
  detectedApps: DetectedApp[];
  isScanning: boolean;
  onCancel: () => void;
  onCreate: (draft: WorkspaceDraft) => void;
}

export function NewWorkspaceModal({
  takenShortcuts,
  detectedApps,
  isScanning,
  onCancel,
  onCreate,
}: NewWorkspaceModalProps) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(DEFAULT_ICON_KEY);
  const [shortcut, setShortcut] = useState(() => firstFreeShortcut(takenShortcuts));
  const [applications, setApplications] = useState<Application[]>([]);

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

  const canCreate = name.trim() !== "";
  const canAddManual = appName.trim() !== "" && appPath.trim() !== "";

  // An app is already added if something with the same path is in the list.
  function isAdded(path: string): boolean {
    return applications.some((app) => app.path === path);
  }

  function addApp(app: Application) {
    if (isAdded(app.path)) return;
    setApplications((prev) => [...prev, app]);
  }

  function removeApp(index: number) {
    setApplications((prev) => prev.filter((_, i) => i !== index));
  }

  function addManual() {
    if (!canAddManual) return;
    addApp({ name: appName.trim(), path: appPath.trim() });
    setAppName("");
    setAppPath("");
  }

  function submit() {
    if (!canCreate) return;
    onCreate({ name: name.trim(), icon, shortcut, applications });
  }

  // Filter detected apps by the search term, then cap the number shown.
  const query = search.trim().toLowerCase();
  const filtered = detectedApps
    .filter((app) => app.name.toLowerCase().includes(query))
    .slice(0, MAX_RESULTS);

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
          <h2 className="text-base font-semibold text-neutral-900">New Workspace</h2>
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

            {/* Apps already added to this workspace */}
            {applications.length > 0 && (
              <ul className="mb-2 divide-y divide-neutral-100 overflow-hidden rounded-lg border border-neutral-200">
                {applications.map((app, index) => (
                  <li key={index} className="flex items-center gap-3 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-800">
                        {app.name}
                      </p>
                      <p className="truncate text-xs text-neutral-400">
                        {app.path}
                      </p>
                    </div>
                    <button
                      onClick={() => removeApp(index)}
                      className="text-xs font-medium text-neutral-400 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </li>
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
                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-neutral-100 text-xs font-semibold text-neutral-500">
                              {app.name.charAt(0).toUpperCase()}
                            </span>
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
        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-6 py-4">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!canCreate}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Create Workspace
          </button>
        </div>
      </div>
    </div>
  );
}
