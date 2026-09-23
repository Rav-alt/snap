// One row in the "apps added to this workspace" list, with an expandable
// Options panel.
//
// Every app gets a Window layout picker (halves/quarters/maximized/custom).
// Chrome additionally gets a Profile dropdown and a Tabs box; other apps get a
// plain "arguments" box. Layout is stored on `app.window`; Chrome extras and
// generic flags are stored on `app.args`.

import { useState } from "react";
import type { Application, ChromeProfile, WindowLayout } from "../types/workspace";
import { AppIcon } from "./AppIcon";
import { WindowLayoutPicker, windowModeLabel } from "./WindowLayoutPicker";

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

// Chrome args now only carry the profile and the tab URLs (layout moved to
// app.window). Any legacy --window-* flags are ignored on read.
function parseChromeArgs(args: string[]): { profile: string; tabs: string[] } {
  let profile = "";
  const tabs: string[] = [];
  for (const arg of args) {
    if (arg.startsWith(PROFILE_FLAG)) profile = arg.slice(PROFILE_FLAG.length);
    else if (!arg.startsWith("--")) tabs.push(arg);
  }
  return { profile, tabs };
}

function buildChromeArgs(profile: string, tabLines: string[]): string[] {
  const args: string[] = [];
  if (profile) args.push(PROFILE_FLAG + profile);
  for (const line of tabLines) {
    const url = line.trim();
    if (!url) continue;
    args.push(url.includes("://") ? url : `https://${url}`);
  }
  return args;
}

function summarize(
  app: Application,
  chrome: boolean,
  profiles: ChromeProfile[],
): string {
  const bits: string[] = [];

  if (chrome) {
    const { profile, tabs } = parseChromeArgs(app.args ?? []);
    if (tabs.length > 0) bits.push(`${tabs.length} tab${tabs.length === 1 ? "" : "s"}`);
    if (profile) {
      const match = profiles.find((p) => p.directory === profile);
      bits.push(match ? match.name : profile);
    }
  } else if ((app.args?.length ?? 0) > 0) {
    const n = app.args!.length;
    bits.push(`${n} argument${n === 1 ? "" : "s"}`);
  }

  const mode = app.window?.mode;
  if (mode && mode !== "default") bits.push(windowModeLabel(mode));

  return bits.join(" · ") || app.path;
}

export function AddedAppRow({
  app,
  index,
  chromeProfiles,
  onRemove,
  onChange,
}: AddedAppRowProps) {
  const chrome = isChrome(app.path);
  const [expanded, setExpanded] = useState(false);

  const initial = parseChromeArgs(app.args ?? []);
  const [profile, setProfile] = useState(initial.profile);
  const [tabsText, setTabsText] = useState(initial.tabs.join("\n"));
  const [genericText, setGenericText] = useState((app.args ?? []).join("\n"));

  const field =
    "w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500";

  function setWindow(layout: WindowLayout) {
    // Store nothing for the plain default, to keep saved data tidy.
    onChange(index, {
      ...app,
      window: layout.mode === "default" ? undefined : layout,
    });
  }

  function setChromeArgs(nextProfile: string, nextTabsText: string) {
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
          {/* Window layout — available for every app */}
          <WindowLayoutPicker value={app.window} onChange={setWindow} />

          {chrome ? (
            <>
              {chromeProfiles.length > 0 && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-600">
                    Profile
                  </label>
                  <select
                    value={profile}
                    onChange={(e) => setChromeArgs(e.currentTarget.value, tabsText)}
                    className={field}
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
                  onChange={(e) => setChromeArgs(profile, e.currentTarget.value)}
                  rows={3}
                  placeholder={"youtube.com\ngithub.com\ndiscord.com"}
                  className={field}
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
                className={field}
              />
            </div>
          )}

          <p className="truncate text-xs text-neutral-400">{app.path}</p>
        </div>
      )}
    </li>
  );
}
