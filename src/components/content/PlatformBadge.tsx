import { platformInfo } from "../../lib/projects";
import type { Platform } from "../../lib/types";

/** A platform's small coloured mark, and its name unless `withLabel` is false (the mark alone is decorative). */
export default function PlatformBadge({ platform, withLabel = true }: { platform: Platform; withLabel?: boolean }) {
  const info = platformInfo(platform);
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span
        aria-hidden="true"
        className="grid size-6 shrink-0 place-items-center rounded-md text-xs font-semibold text-white"
        style={{ background: info.color }}
      >
        {info.badge}
      </span>
      {withLabel && <span className="truncate text-sm font-semibold text-foreground">{info.label}</span>}
    </span>
  );
}
