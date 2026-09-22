// A small notification card shown after launching a workspace. It reports
// how many apps started and lists any that failed, with a friendly reason.
// Presentational only — the page decides when to show and hide it.

import type { LaunchOutcome } from "../types/workspace";

interface LaunchToastProps {
  workspaceName: string;
  outcomes: LaunchOutcome[];
  onDismiss: () => void;
}

export function LaunchToast({
  workspaceName,
  outcomes,
  onDismiss,
}: LaunchToastProps) {
  const failed = outcomes.filter((outcome) => !outcome.ok);
  const okCount = outcomes.length - failed.length;
  const allOk = failed.length === 0;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg">
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-neutral-900">
            {allOk ? "Workspace launched" : "Launched with issues"}
          </p>
          <p className="text-xs text-neutral-500">
            {okCount} of {outcomes.length}{" "}
            {outcomes.length === 1 ? "app" : "apps"} started in {workspaceName}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="grid h-6 w-6 place-items-center rounded text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>

      {failed.length > 0 && (
        <ul className="space-y-2 border-t border-neutral-100 bg-red-50/50 px-4 py-3">
          {failed.map((outcome, index) => (
            <li key={index} className="text-xs">
              <p className="font-medium text-red-700">
                Couldn't launch {outcome.name}
              </p>
              {outcome.error && (
                <p className="text-neutral-600">{outcome.error}</p>
              )}
              <p className="truncate text-neutral-400">{outcome.path}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
