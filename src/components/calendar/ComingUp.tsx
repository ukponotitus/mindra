import { Link } from "react-router";
import PlatformBadge from "../content/PlatformBadge";
import { buttonStyles } from "../ui/button";
import { SCHEDULE_STATUS, dayKey, formatScheduled, postSummary, scheduleStatus, useComingUp } from "../../lib/calendar";
import { cn } from "../../lib/cn";
import { platformInfo } from "../../lib/projects";

const linkClass =
  "rounded text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/** The dashboard's next five scheduled posts, missed ones first, each opening on the calendar. */
export default function ComingUp() {
  const { posts, isPending, isError, error } = useComingUp(5);
  const empty = !isPending && !isError && posts.length === 0;

  return (
    <section aria-labelledby="coming-up" className="overflow-hidden rounded-xl border border-border bg-white">
      <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
        <h3 id="coming-up" className="font-semibold text-balance text-foreground">
          Coming up
        </h3>
        {!empty && (
          <Link to="/calendar" className={linkClass}>
            Open calendar
          </Link>
        )}
      </div>

      {isPending ? (
        <ul aria-busy="true" aria-label="Loading scheduled posts" className="divide-y divide-border">
          {[0, 1, 2].map((index) => (
            <li key={index} className="flex items-center gap-3 px-5 py-3">
              <div className="size-6 animate-pulse rounded-md bg-secondary" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-3/4 animate-pulse rounded bg-secondary" />
                <div className="h-2.5 w-1/2 animate-pulse rounded bg-secondary" />
              </div>
            </li>
          ))}
        </ul>
      ) : isError ? (
        <p role="alert" className="px-5 py-6 text-sm text-pretty text-red-600">
          {error.message}
        </p>
      ) : empty ? (
        <div className="px-5 py-6 text-center">
          <p className="text-sm font-medium text-foreground">Nothing scheduled yet</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-pretty text-muted-foreground">
            Plan when each post goes out, and get a reminder at that time.
          </p>
          <Link to="/calendar" className={buttonStyles({ variant: "secondary", size: "sm", className: "mt-4" })}>
            Open the calendar
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {posts.map((piece) => {
            const status = scheduleStatus(piece) ?? "planned";
            const look = SCHEDULE_STATUS[status];
            return (
              <li key={piece.id}>
                <Link
                  to={`/calendar?date=${dayKey(new Date(piece.scheduled_at!))}&post=${piece.id}`}
                  className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-background focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
                >
                  <PlatformBadge platform={piece.platform} withLabel={false} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{postSummary(piece)}</span>
                    <span className="block truncate text-xs text-muted-foreground tabular-nums">
                      {formatScheduled(piece.scheduled_at!)} · {platformInfo(piece.platform).label}
                    </span>
                  </span>
                  {status !== "planned" && (
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", look.chip)}>{look.label}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
