// Renders a shortcut string like "Ctrl+Alt+1" as individual keycap badges.
// Small, focused, reusable.

interface ShortcutBadgeProps {
  shortcut: string;
}

export function ShortcutBadge({ shortcut }: ShortcutBadgeProps) {
  const keys = shortcut.split("+").map((key) => key.trim());

  return (
    <div className="flex items-center gap-1.5">
      {keys.map((key, index) => (
        <span key={index} className="flex items-center gap-1.5">
          {index > 0 && <span className="text-sm text-neutral-300">+</span>}
          <kbd className="inline-grid min-w-[2rem] place-items-center rounded-md border border-neutral-300 bg-neutral-50 px-2 py-1 text-xs font-semibold text-neutral-700 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
            {key}
          </kbd>
        </span>
      ))}
    </div>
  );
}
