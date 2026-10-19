import { CalendarPlus, GripVertical } from "lucide-react";
import { Link } from "react-router";
import PlatformBadge from "../content/PlatformBadge";
import { buttonStyles } from "../ui/button";
import { postSummary } from "../../lib/calendar";
import { cn } from "../../lib/cn";
import type { ContentPiece } from "../../lib/types";
import type { DragAndDrop } from "./dragAndDrop";
import ScheduleDialog from "./ScheduleDialog";

interface Props {
  posts: ContentPiece[];
  total: number;
  loading: boolean;
  error: string;
  onRetry: () => void;
  onShowMore: () => void;
  loadingMore: boolean;
  dnd: DragAndDrop;
  onScheduled: (piece: ContentPiece, previous: string | null) => void;
}

/** Posts that aren't on the calendar yet, newest first: drag one onto a day, or press Schedule. */
export default function ReadyTray({ posts, total, loading, error, onRetry, onShowMore, loadingMore, dnd, onScheduled }: Props) {
  return (
    <section
      id="ready-to-schedule"
      aria-labelledby="ready-to-schedule-title"
      className="scroll-mt-4 rounded-xl border border-border bg-white"
    >
      <div className="border-b border-border px-4 py-3">
        <h3 id="ready-to-schedule-title" className="flex items-center gap-2 font-semibold text-balance text-foreground">
          Ready to schedule
          {total > 0 && <span className="text-sm font-normal text-muted-foreground tabular-nums">{total}</span>}
        </h3>
        <p className="mt-0.5 text-xs text-pretty text-muted-foreground">
          {dnd.enabled ? "Drag a post onto a day, or press Schedule." : "Press Schedule to pick a day and time."}
        </p>
      </div>

      {loading ? (
        <ul aria-busy="true" aria-label="Loading posts" className="divide-y divide-border">
          {[0, 1, 2].map((index) => (
            <li key={index} className="space-y-2 px-4 py-3">
              <div className="h-4 w-24 animate-pulse rounded bg-secondary" />
              <div className="h-3 w-full animate-pulse rounded bg-secondary" />
            </li>
          ))}
        </ul>
      ) : error ? (
        <div className="px-4 py-6">
          <p role="alert" className="text-sm text-pretty text-red-600">
            {error}
          </p>
          <button type="button" onClick={onRetry} className={buttonStyles({ variant: "secondary", size: "sm", className: "mt-3" })}>
            Try again
          </button>
        </div>
      ) : posts.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm font-medium text-foreground">Nothing waiting to be scheduled</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-pretty text-muted-foreground">
            Posts you write show up here, ready to plan.
          </p>
          <Link to="/ai-studio" className={buttonStyles({ variant: "secondary", size: "sm", className: "mt-4" })}>
            Write posts
          </Link>
        </div>
      ) : (
        <>
          <ul className="max-h-128 divide-y divide-border overflow-y-auto overscroll-contain lg:max-h-[calc(100dvh-16rem)]">
            {posts.map((piece) => (
              <li
                key={piece.id}
                draggable={dnd.enabled}
                onDragStart={dnd.enabled ? (event) => dnd.start({ piece, from: "tray" }, event) : undefined}
                onDragEnd={dnd.end}
                data-tray-post={piece.id}
                className={cn(
                  "flex items-start gap-2 px-4 py-3 transition-opacity",
                  dnd.enabled && "cursor-grab active:cursor-grabbing",
                  dnd.dragging?.piece.id === piece.id && "opacity-40",
                )}
              >
                {dnd.enabled && <GripVertical aria-hidden="true" className="mt-1 size-4 shrink-0 text-muted-foreground" />}
                <div className="min-w-0 flex-1">
                  <PlatformBadge platform={piece.platform} />
                  <p className="mt-1 line-clamp-2 text-sm text-pretty text-gray-700">{postSummary(piece)}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{piece.project_name}</p>
                </div>
                <ScheduleDialog
                  piece={piece}
                  onDone={onScheduled}
                  trigger={
                    <button type="button" className={buttonStyles({ variant: "secondary", size: "sm", className: "h-9" })}>
                      <CalendarPlus aria-hidden="true" className="size-4" />
                      Schedule
                    </button>
                  }
                />
              </li>
            ))}
          </ul>
          {total > posts.length && (
            <div className="border-t border-border px-4 py-3">
              <button
                type="button"
                onClick={onShowMore}
                disabled={loadingMore}
                className={buttonStyles({ variant: "ghost", size: "sm", className: "w-full" })}
              >
                {loadingMore ? "Loading…" : "Show more"}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
