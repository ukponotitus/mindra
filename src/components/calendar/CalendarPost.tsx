import { Link } from "react-router";
import PlatformBadge from "../content/PlatformBadge";
import { SCHEDULE_STATUS, formatScheduled, formatTime, isPostedStatus, isSettledStatus, postSummary, scheduleStatus } from "../../lib/calendar";
import { cn } from "../../lib/cn";
import { platformInfo } from "../../lib/projects";
import type { ContentPiece } from "../../lib/types";
import type { DragAndDrop } from "./dragAndDrop";

interface Props {
  piece: ContentPiece;
  /** Opens the post's dialog (the calendar's address with ?post=<id>). */
  to: string;
  dnd: DragAndDrop;
  /** "month": a line in a small day box; "week": a card in a day's column; "agenda": a row in the list. */
  layout: "month" | "week" | "agenda";
}

/**
 * A scheduled post on the calendar, edged in its status colour. It's a link that opens the post, so it works with the
 * keyboard; with a mouse it can also be dragged to another day (not once it's posted, or while Mindra posts it).
 */
export default function CalendarPost({ piece, to, dnd, layout }: Props) {
  const status = scheduleStatus(piece) ?? "planned";
  const look = SCHEDULE_STATUS[status];
  const platform = platformInfo(piece.platform);
  const summary = postSummary(piece);
  const canDrag = dnd.enabled && !isSettledStatus(status);
  const time = piece.scheduled_at ? formatTime(piece.scheduled_at) : "";

  return (
    <Link
      to={to}
      replace
      draggable={canDrag}
      onDragStart={canDrag ? (event) => dnd.start({ piece, from: "calendar" }, event) : undefined}
      onDragEnd={dnd.end}
      data-post={piece.id}
      className={cn(
        "flex min-w-0 rounded-md border border-l-[3px] border-border bg-white text-left transition-[background-color,opacity] hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
        look.edge,
        canDrag && "cursor-grab active:cursor-grabbing",
        isPostedStatus(status) && "bg-background text-muted-foreground",
        dnd.dragging?.piece.id === piece.id && "opacity-40",
        layout === "month" && "items-center gap-1 px-1 py-0.5 text-[11px] sm:px-1.5",
        layout === "week" && "flex-col gap-1 px-2 py-1.5 text-xs",
        layout === "agenda" && "items-center gap-3 px-3 py-2.5 text-sm",
      )}
    >
      <span className="sr-only">
        {piece.scheduled_at ? formatScheduled(piece.scheduled_at) : ""}, {platform.label}, {look.label}: {summary}
      </span>

      {layout === "month" && (
        <span aria-hidden="true" className="flex min-w-0 items-center gap-1">
          <span
            className="hidden size-3.5 shrink-0 place-items-center rounded-sm text-[8px] font-semibold text-white sm:grid"
            style={{ background: platform.color }}
          >
            {platform.badge}
          </span>
          <span className="shrink-0 font-medium text-foreground tabular-nums">{time}</span>
          <span className="hidden min-w-0 truncate text-muted-foreground md:inline">{summary}</span>
        </span>
      )}

      {layout === "week" && (
        <span aria-hidden="true" className="flex min-w-0 flex-col gap-1">
          <span className="flex min-w-0 items-center gap-1.5">
            <span
              className="grid size-4 shrink-0 place-items-center rounded-sm text-[9px] font-semibold text-white"
              style={{ background: platform.color }}
            >
              {platform.badge}
            </span>
            <span className="font-medium text-foreground tabular-nums">{time}</span>
          </span>
          <span className="line-clamp-2 text-pretty text-gray-700">{summary}</span>
          {status !== "planned" && (
            <span className={cn("w-fit rounded-full px-1.5 py-px text-[11px] font-medium", look.chip)}>{look.label}</span>
          )}
        </span>
      )}

      {layout === "agenda" && (
        <span aria-hidden="true" className="flex min-w-0 flex-1 items-center gap-3">
          <span className="w-16 shrink-0 font-medium text-foreground tabular-nums">{time}</span>
          <span className="min-w-0 flex-1">
            <PlatformBadge platform={piece.platform} />
            <span className="mt-0.5 block truncate text-gray-700">{summary}</span>
          </span>
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", look.chip)}>{look.label}</span>
        </span>
      )}
    </Link>
  );
}
