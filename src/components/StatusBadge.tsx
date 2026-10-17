import { cn } from "../lib/cn";
import { STATUS_LABELS } from "../lib/projects";
import type { ProjectStatus } from "../lib/types";

const COLORS: Record<ProjectStatus, string> = {
  queued: "bg-amber-50 text-amber-700",
  extracting_audio: "bg-primary/10 text-primary",
  transcribing: "bg-primary/10 text-primary",
  analyzing: "bg-primary/10 text-primary",
  completed: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-red-700",
};

export default function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap", COLORS[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}
