// A friendly window-layout picker: a dropdown of presets (halves, quarters,
// maximized) plus a Custom option with raw X/Y/W/H. Presets are turned into
// pixel rectangles here (from the screen's work area) and stored on the app,
// so the backend can place the window without knowing the screen size.

import { useState } from "react";
import type { WindowLayout } from "../types/workspace";

type WindowMode = WindowLayout["mode"];

const MODE_LABELS: Record<WindowMode, string> = {
  default: "Default (app decides)",
  maximized: "Maximized",
  left: "Left half",
  right: "Right half",
  topleft: "Top-left quarter",
  topright: "Top-right quarter",
  bottomleft: "Bottom-left quarter",
  bottomright: "Bottom-right quarter",
  custom: "Custom…",
};

const MODE_ORDER: WindowMode[] = [
  "default",
  "maximized",
  "left",
  "right",
  "topleft",
  "topright",
  "bottomleft",
  "bottomright",
  "custom",
];

/** Short label for a mode, used in summaries elsewhere. */
export function windowModeLabel(mode: WindowMode): string {
  return MODE_LABELS[mode].replace("…", "");
}

// Compute a preset's pixel rect from the current screen's usable area.
function computeRect(
  mode: WindowMode,
): { x: number; y: number; width: number; height: number } | null {
  const w = window.screen.availWidth;
  const h = window.screen.availHeight;
  const halfW = Math.floor(w / 2);
  const halfH = Math.floor(h / 2);
  const rightW = w - halfW;
  const bottomH = h - halfH;

  switch (mode) {
    case "left":
      return { x: 0, y: 0, width: halfW, height: h };
    case "right":
      return { x: halfW, y: 0, width: rightW, height: h };
    case "topleft":
      return { x: 0, y: 0, width: halfW, height: halfH };
    case "topright":
      return { x: halfW, y: 0, width: rightW, height: halfH };
    case "bottomleft":
      return { x: 0, y: halfH, width: halfW, height: bottomH };
    case "bottomright":
      return { x: halfW, y: halfH, width: rightW, height: bottomH };
    default:
      return null;
  }
}

interface WindowLayoutPickerProps {
  value?: WindowLayout;
  onChange: (layout: WindowLayout) => void;
}

export function WindowLayoutPicker({ value, onChange }: WindowLayoutPickerProps) {
  const [mode, setMode] = useState<WindowMode>(value?.mode ?? "default");
  const [x, setX] = useState(value?.x?.toString() ?? "");
  const [y, setY] = useState(value?.y?.toString() ?? "");
  const [width, setWidth] = useState(value?.width?.toString() ?? "");
  const [height, setHeight] = useState(value?.height?.toString() ?? "");

  const field =
    "w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500";

  function num(s: string): number | undefined {
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : undefined;
  }

  function emitCustom(nx = x, ny = y, nw = width, nh = height) {
    onChange({
      mode: "custom",
      x: num(nx),
      y: num(ny),
      width: num(nw),
      height: num(nh),
    });
  }

  function selectMode(next: WindowMode) {
    setMode(next);
    if (next === "default" || next === "maximized") {
      onChange({ mode: next });
    } else if (next === "custom") {
      emitCustom();
    } else {
      const rect = computeRect(next);
      if (rect) onChange({ mode: next, ...rect });
    }
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-neutral-600">
        Window layout
      </label>
      <select
        value={mode}
        onChange={(e) => selectMode(e.currentTarget.value as WindowMode)}
        className={field}
      >
        {MODE_ORDER.map((m) => (
          <option key={m} value={m}>
            {MODE_LABELS[m]}
          </option>
        ))}
      </select>

      {mode === "custom" && (
        <div className="mt-2 grid grid-cols-4 gap-2">
          <input
            value={x}
            onChange={(e) => {
              setX(e.currentTarget.value);
              emitCustom(e.currentTarget.value, y, width, height);
            }}
            inputMode="numeric"
            placeholder="X"
            className={field}
          />
          <input
            value={y}
            onChange={(e) => {
              setY(e.currentTarget.value);
              emitCustom(x, e.currentTarget.value, width, height);
            }}
            inputMode="numeric"
            placeholder="Y"
            className={field}
          />
          <input
            value={width}
            onChange={(e) => {
              setWidth(e.currentTarget.value);
              emitCustom(x, y, e.currentTarget.value, height);
            }}
            inputMode="numeric"
            placeholder="Width"
            className={field}
          />
          <input
            value={height}
            onChange={(e) => {
              setHeight(e.currentTarget.value);
              emitCustom(x, y, width, e.currentTarget.value);
            }}
            inputMode="numeric"
            placeholder="Height"
            className={field}
          />
        </div>
      )}
    </div>
  );
}
