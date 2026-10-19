import { CalendarClock } from "lucide-react";
import { SCHEDULE_STATUS, formatScheduled, scheduleStatus } from "../../lib/calendar";
import { cn } from "../../lib/cn";
import type { ContentPiece } from "../../lib/types";

/** "Sun 26 Oct, 7:00 am · Planned", coloured by status. Nothing for a post that isn't scheduled. */
export default function ScheduleChip({
  piece,
  className,
}: {
  piece: Pick<ContentPiece, "scheduled_at" | "schedule_status">;
  className?: string;
}) {
  const status = scheduleStatus(piece);
  if (!status || !piece.scheduled_at) return null;
  const info = SCHEDULE_STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
        info.chip,
        className,
      )}
    >
      <CalendarClock aria-hidden="true" className="size-3.5 shrink-0" />
      <span className="truncate">
        {formatScheduled(piece.scheduled_at)} · {info.label}
      </span>
    </span>
  );
}
