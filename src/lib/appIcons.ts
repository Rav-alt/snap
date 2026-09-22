// A tiny cache for app icons.
//
// The same .exe path can appear in several places at once (the picker, the
// detail list…). Without a cache, each spot would ask Rust to extract the
// same icon again. We cache the PROMISE per path, so the icon is fetched at
// most once and everyone shares the result.

import { getAppIcon } from "./tauri";

const cache = new Map<string, Promise<string>>();

/** Load an app's icon data URL, reusing an in-flight or finished request. */
export function loadAppIcon(path: string): Promise<string> {
  let pending = cache.get(path);
  if (!pending) {
    pending = getAppIcon(path);
    cache.set(path, pending);
  }
  return pending;
}
