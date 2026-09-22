// Shows an application's real icon (extracted from its .exe), falling back to
// a letter tile while loading or if the app has no icon.
//
// It asks Rust for the icon on mount (through the shared cache), and swaps in
// the image once it arrives. The `active` flag guards against setting state
// after the component has unmounted (e.g. the modal closed mid-load).

import { useEffect, useState } from "react";
import { loadAppIcon } from "../lib/appIcons";

interface AppIconProps {
  path: string;
  name: string;
  /** Tailwind sizing for the tile, e.g. "h-8 w-8". */
  className?: string;
}

export function AppIcon({ path, name, className = "h-8 w-8" }: AppIconProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setSrc(null);
    loadAppIcon(path)
      .then((url) => {
        if (active) setSrc(url);
      })
      .catch(() => {
        if (active) setSrc(null); // fall back to the letter
      });
    return () => {
      active = false;
    };
  }, [path]);

  return (
    <span
      className={
        "grid shrink-0 place-items-center overflow-hidden rounded-md bg-neutral-100 " +
        className
      }
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-contain p-0.5" />
      ) : (
        <span className="text-xs font-semibold text-neutral-500">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  );
}
