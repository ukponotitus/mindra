import { CalendarRange, ChevronRight, Plus } from "lucide-react";
import { Link } from "react-router";
import PlatformBadge from "../components/content/PlatformBadge";
import { buttonStyles } from "../components/ui/button";
import { parseDayKey } from "../lib/calendar";
import { useCalendars, VERSION_LABELS } from "../lib/calendars";
import type { Platform } from "../lib/types";

function shortDate(key: string) {
  return parseDayKey(key)?.toLocaleDateString(undefined, { day: "numeric", month: "short" }) ?? key;
}

/** Every content calendar of the workspace, and starting a new one. */
export default function ContentCalendars() {
  const calendars = useCalendars();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold text-balance text-foreground">Content calendar</h2>
          <p className="mt-1 max-w-xl text-sm text-pretty text-muted-foreground">
            Plan what goes out, when and where. Mindra drafts it from your brand profile; you change it and approve it, and the
            approved items wait in the Planner for their brief and post.
          </p>
        </div>
        <Link to="/content-calendar/new" className={buttonStyles()}>
          <Plus aria-hidden="true" className="size-4" />
          New calendar
        </Link>
      </div>

      {calendars.isPending ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (calendars.data?.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <CalendarRange aria-hidden="true" className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-medium text-foreground">No calendars yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Start with next month: choose the platforms and how often, and say what to focus on.</p>
          <Link to="/content-calendar/new" className={buttonStyles({ className: "mt-5" })}>
            Plan next month
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {calendars.data?.map((calendar) => {
            const newest = calendar.versions[0];
            return (
              <li key={calendar.id}>
                <Link
                  to={`/content-calendar/${calendar.id}`}
                  className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <CalendarRange aria-hidden="true" className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">{calendar.name}</span>
                      {newest && <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">{VERSION_LABELS[newest.status]}</span>}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {shortDate(calendar.starts_on)} to {shortDate(calendar.ends_on)} · {calendar.approved_items} approved
                      {calendar.campaign_name && ` · ${calendar.campaign_name}`}
                    </span>
                    <span className="mt-1.5 flex flex-wrap gap-1.5">
                      {(Object.keys(calendar.cadence) as Platform[]).map((platform) => (
                        <PlatformBadge key={platform} platform={platform} withLabel={false} />
                      ))}
                    </span>
                  </span>
                  <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
