// A small switch for "Start with Windows", wired to the autostart plugin.
// It reads the current state on mount and toggles it on click.

import { useEffect, useState } from "react";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";

export function StartupToggle() {
  const [on, setOn] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    isEnabled()
      .then(setOn)
      .catch((error) => console.error("autostart isEnabled failed:", error))
      .finally(() => setReady(true));
  }, []);

  async function toggle() {
    try {
      if (on) {
        await disable();
        setOn(false);
      } else {
        await enable();
        setOn(true);
      }
    } catch (error) {
      console.error("autostart toggle failed:", error);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={!ready}
      className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
    >
      <span>Start with Windows</span>
      <span
        className={
          "relative inline-block h-5 w-9 shrink-0 rounded-full transition-colors " +
          (on ? "bg-blue-600" : "bg-neutral-300")
        }
      >
        <span
          className={
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform " +
            (on ? "translate-x-[18px]" : "translate-x-0.5")
          }
        />
      </span>
    </button>
  );
}
