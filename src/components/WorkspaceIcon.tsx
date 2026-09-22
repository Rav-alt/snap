// Renders a workspace's icon from its stored key. A thin wrapper so the rest
// of the app never touches the icon registry directly — it just says which
// key and how big.
//
// react-icons draw in `currentColor`, so the icon's color follows the text
// color of whatever contains it (set via Tailwind text-* classes on a parent).

import { iconFor } from "../lib/icons";

interface WorkspaceIconProps {
  iconKey: string;
  className?: string;
}

export function WorkspaceIcon({ iconKey, className }: WorkspaceIconProps) {
  const Icon = iconFor(iconKey);
  return <Icon className={className} />;
}
