// One row in the "apps added to this workspace" list, with an expandable
// Options panel for command-line arguments.
//
// For Chrome (and Chromium browsers) the panel is friendly: pick a profile
// and list the tabs (URLs) to open — we translate those into the actual
// `--profile-directory=...` flag and URL arguments. For anything else, a plain
// "one argument per line" box. The resulting args are stored on the app and
// passed straight to the process at launch.

import { useState } from "react";
import type { Application, ChromeProfile } from "../types/workspace";
import { AppIcon } from "./AppIcon";

interface AddedAppRowProps {
  app: Application;
  index: number;
  chromeProfiles: ChromeProfile[];
  onRemove: (index: number) => void;
  onChange: (index: number, app: Application) => void;
}

const PROFILE_FLAG = "--profile-directory=";

function isChrome(path: string): boolean {
  return /chrome\.exe$/i.test(path);
}

// Split a stored args array back into { profile, tabs } to pre-fill the editor.
function parseChromeArgs(args: string[]): { profile: string; tabs: string[] } {
  let profile = "";
  const tabs: string[] = [];
  for (const arg of args) {
    if (arg.startsWith(PROFILE_FLAG)) profile = arg.slice(PROFILE_FLAG.length);
    else if (!arg.startsWith("--")) tabs.push(arg);
  }
  return { profile, tabs };
}

// Build the args array Chrome expects from the editor's profile + tab lines.
function buildChromeArgs(profile: string, tabLines: string[]): string[] {
  const args: string[] = [];
  if (profile) args.push(PROFILE_FLAG + profile);
  for (const line of tabLines) {
    const url = line.trim();
    if (!url) continue;
    // Add https:// to bare domains; leave anything with a scheme alone.
    args.push(url.includes("://") ? url : `https://${url}`);
  }
  return args;
}

function summarize(
  app: Application,
  chrome: boolean,
  profiles: ChromeProfile[],
): string {
  const args = app.args ?? [];
  if (args.length === 0) return app.path;

  if (chrome) {
    const { profile, tabs } = parseChromeArgs(args);
    const parts: string[] = [];
    if (tabs.length > 0) parts.push(`${tabs.length} tab${tabs.length === 1 ? "" : "s"}`);
    if (profile) {
      const match = profiles.find((p) => p.directory === profile);
      parts.push(match ? match.name : profile);
    }
    return parts.join(" · ") || app.path;
  }

  return `${args.length} argument${args.length === 1 ? "" : "s"}`;
}

export function AddedAppRow({
  app,
  index,
  chromeProfiles,
  onRemove,
  onChange,
}: AddedAppRowProps) {
  const args = app.args ?? [];
  const chrome = isChrome(app.path);

  const [expanded, setExpanded] = useState(false);

  // Local editor state, initialized once from the app's stored args.
  const initial = parseChromeArgs(args);
  const [profile, setProfile] = useState(initial.profile);
  const [tabsText, setTabsText] = useState(initial.tabs.join("\n"));
  const [genericText, setGenericText] = useState(args.join("\n"));

  function updateChrome(nextProfile: string, nextTabsText: string) {
    setProfile(nextProfile);
    setTabsText(nextTabsText);
    onChange(index, {
      ...app,
      args: buildChromeArgs(nextProfile, nextTabsText.split("\n")),
    });
  }

  function updateGeneric(nextText: string) {
    setGenericText(nextText);
    const parsed = nextText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    onChange(index, { ...app, args: parsed });
  }

  return (
    <li className="px-3 py-2">
      <div className="flex items-center gap-3">
        <AppIcon path={app.path} name={app.name} className="h-7 w-7" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-neutral-800">{app.name}</p>
          <p className="truncate text-xs text-neutral-400">
            {summarize(app, chrome, chromeProfiles)}
          </p>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs font-medium text-neutral-500 hover:text-neutral-700"
        >
          {expanded ? "Done" : "Options"}
        </button>
        <button
          onClick={() => onRemove(index)}
          className="text-xs font-medium text-neutral-400 hover:text-red-600"
        >
          Remove
        </button>
      </div>

      {expanded && (
        <div className="mt-2 space-y-3 rounded-lg bg-neutral-50 p-3">
          {chrome ? (
            <>
              {chromeProfiles.length > 0 && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-600">
                    Profile
                  </label>
                  <select
                    value={profile}
                    onChange={(e) => updateChrome(e.currentTarget.value, tabsText)}
                    className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="">Default / any profile</option>
                    {chromeProfiles.map((p) => (
                      <option key={p.directory} value={p.directory}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Tabs to open (one URL per line)
                </label>
                <textarea
                  value={tabsText}
                  onChange={(e) => updateChrome(profile, e.currentTarget.value)}
                  rows={3}
                  placeholder={"youtube.com\ngithub.com\ndiscord.com"}
                  className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                Arguments (one per line)
              </label>
              <textarea
                value={genericText}
                onChange={(e) => updateGeneric(e.currentTarget.value)}
                rows={3}
                placeholder={"--some-flag\nvalue"}
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
              />
            </div>
          )}
          <p className="truncate text-xs text-neutral-400">{app.path}</p>
        </div>
      )}
    </li>
  );
}
